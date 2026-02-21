import React, { useState, useEffect } from 'react';
import { settlementAPI, groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id:'GPAY',    label:'Google Pay', color:'#1a73e8', emoji:'G' },
  { id:'PHONEPE', label:'PhonePe',    color:'#5f259f', emoji:'P' },
  { id:'PAYTM',   label:'Paytm',      color:'#00b9f1', emoji:'₹' },
  { id:'CASH',    label:'Cash',       color:'#00d4aa', emoji:'💵' },
  { id:'BANK',    label:'Bank Transfer', color:'#ffb347', emoji:'🏦' },
];

export default function Settlements() {
  const { user } = useAuth();
  const [groups, setGroups]               = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [settlements, setSettlements]     = useState([]);
  const [loading, setLoading]             = useState(false);
  const [payModal, setPayModal]           = useState(null); // settlement object
  const [payMethod, setPayMethod]         = useState('');
  const [txId, setTxId]                   = useState('');
  const [settling, setSettling]           = useState(false);

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { loadSettlements(); }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const d = await groupAPI.getAll();
      setGroups(Array.isArray(d) ? d : []);
    } catch {}
  };

  const loadSettlements = async () => {
    setLoading(true);
    try {
      let data;
      if (selectedGroup === 'all') {
        data = await settlementAPI.getPending();
      } else {
        data = await settlementAPI.getByGroup(selectedGroup);
      }
      setSettlements(Array.isArray(data) ? data : []);
    } catch { setSettlements([]); }
    finally { setLoading(false); }
  };

  const openPayModal = (s) => {
    setPayModal(s);
    setPayMethod('');
    setTxId('');
    // Open UPI app directly if UPI link exists and method chosen
  };

  const handleSettle = async () => {
    if (!payModal) return;
    setSettling(true);
    try {
      await settlementAPI.settle(payModal.id, payMethod || null, txId || null);
      toast.success('Payment recorded! 🎉 +10 reward points');
      setPayModal(null);
      loadSettlements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record settlement');
    } finally { setSettling(false); }
  };

  const openUPI = (link) => {
    if (!link) { toast.error('No UPI ID set for this user. Ask them to update their profile.'); return; }
    window.location.href = link;
  };

  const pending = settlements.filter(s => s.status !== 'COMPLETED' && s.status !== 'PAID');
  const done    = settlements.filter(s => s.status === 'COMPLETED' || s.status === 'PAID');
  const totalPending = pending.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const isMyDebt = (s) => s.fromUser?.id === user?.id || s.fromUser?.email === user?.email;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Settlements</h1>
          <p style={S.subtitle}>Pay and track debts across all groups</p>
        </div>
        {totalPending > 0 && (
          <div style={S.totalPill}>
            <span style={S.totalLabel}>TOTAL PENDING</span>
            <span style={S.totalAmt}>₹{totalPending.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Group Filter Tabs */}
      <div style={S.tabs}>
        <button style={{...S.tab,...(selectedGroup==='all'?S.tabActive:{})}} onClick={()=>setSelectedGroup('all')}>
          All Groups
        </button>
        {groups.map(g => (
          <button key={g.id} style={{...S.tab,...(selectedGroup===g.id?S.tabActive:{})}}
            onClick={()=>setSelectedGroup(g.id)}>
            {g.name}
          </button>
        ))}
      </div>

      {loading ? (
        [1,2,3].map(i=><div key={i} className="skeleton" style={{height:100,borderRadius:16,marginBottom:12}}/>)
      ) : (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <div style={{marginBottom:28}}>
              <div style={S.sectionTitle}><span style={S.dotRed}/>Pending · {pending.length}</div>
              {pending.map((s,i) => (
                <div key={s.id||i} className="card" style={S.card}>
                  <div style={S.cardLeft}>
                    <div className="avatar" style={isMyDebt(s)?S.avFrom:S.avTo}>
                      {s.fromUser?.name?.[0]||'?'}
                    </div>
                    <span style={S.arrow}>→</span>
                    <div className="avatar" style={isMyDebt(s)?S.avTo:S.avFrom}>
                      {s.toUser?.name?.[0]||'?'}
                    </div>
                    <div>
                      <div style={S.names}>
                        <b style={{color:isMyDebt(s)?'var(--danger)':'var(--text-primary)'}}>{s.fromUser?.name}</b>
                        <span style={{color:'var(--text-muted)'}}> owes </span>
                        <b style={{color:!isMyDebt(s)?'var(--success)':'var(--text-primary)'}}>{s.toUser?.name}</b>
                      </div>
                      <div style={S.groupTag}>{s.groupName}</div>
                      {isMyDebt(s) && <div style={S.youBadge}>You owe this</div>}
                    </div>
                  </div>

                  <div style={S.cardRight}>
                    <div style={S.amount}>₹{Number(s.amount||0).toLocaleString()}</div>

                    {/* Payment buttons */}
                    <div style={S.payRow}>
                      {s.googlePayLink && (
                        <button style={{...S.upiBtn, background:'#1a73e8'}}
                          onClick={() => { openUPI(s.googlePayLink); }}>
                          GPay
                        </button>
                      )}
                      {s.phonePeLink && (
                        <button style={{...S.upiBtn, background:'#5f259f'}}
                          onClick={() => { openUPI(s.phonePeLink); }}>
                          PhonePe
                        </button>
                      )}
                      {s.paytmLink && (
                        <button style={{...S.upiBtn, background:'#00b9f1'}}
                          onClick={() => { openUPI(s.paytmLink); }}>
                          Paytm
                        </button>
                      )}
                      <button className="btn btn-primary" style={S.markBtn}
                        onClick={() => openPayModal(s)}>
                        Mark Paid ✓
                      </button>
                    </div>

                    {/* Remind button */}
                    {!isMyDebt(s) && (
                      <button style={S.remindBtn} onClick={async()=>{
                        try { await settlementAPI.sendReminder(s.id); toast.success('Reminder sent! 📨'); }
                        catch { toast.error('Failed to send reminder'); }
                      }}>
                        📨 Send Reminder
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settled */}
          {done.length > 0 && (
            <div>
              <div style={S.sectionTitle}><span style={S.dotGreen}/>Settled · {done.length}</div>
              {done.map((s,i) => (
                <div key={s.id||i} className="card" style={{...S.card, opacity:0.55}}>
                  <div style={S.cardLeft}>
                    <div className="avatar">{s.fromUser?.name?.[0]||'?'}</div>
                    <span style={S.arrow}>→</span>
                    <div className="avatar">{s.toUser?.name?.[0]||'?'}</div>
                    <div style={S.names}>
                      <b style={{color:'var(--text-primary)'}}>{s.fromUser?.name}</b>
                      <span style={{color:'var(--text-muted)'}}> paid </span>
                      <b style={{color:'var(--text-primary)'}}>{s.toUser?.name}</b>
                      <div style={S.groupTag}>{s.groupName}</div>
                    </div>
                  </div>
                  <div style={S.cardRight}>
                    <div style={{...S.amount, color:'var(--success)'}}>₹{Number(s.amount||0).toLocaleString()}</div>
                    <span className="badge badge-success">Settled ✓</span>
                    {s.settledAt && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>
                      {new Date(s.settledAt).toLocaleDateString('en-IN')}
                    </div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {settlements.length === 0 && (
            <div style={S.empty}>
              <div style={{fontSize:48}}>🎉</div>
              <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:20,color:'var(--text-primary)'}}>All settled up!</h3>
              <p style={{color:'var(--text-muted)',fontSize:14,maxWidth:300,textAlign:'center'}}>
                No pending settlements. Add expenses to groups and settlements will appear here.
              </p>
            </div>
          )}
        </>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div style={S.overlay} onClick={()=>setPayModal(null)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()} className="animate-fadeUp">
            <h2 style={S.modalTitle}>Record Payment</h2>
            <div style={S.modalInfo}>
              <div style={S.modalAmt}>₹{Number(payModal.amount||0).toLocaleString()}</div>
              <div style={{fontSize:14, color:'var(--text-muted)'}}>
                {payModal.fromUser?.name} → {payModal.toUser?.name}
              </div>
              <div style={{fontSize:12, color:'var(--text-muted)'}}>{payModal.groupName}</div>
            </div>

            {/* UPI Direct Pay */}
            {(payModal.googlePayLink || payModal.phonePeLink || payModal.paytmLink) && (
              <div style={{marginBottom:20}}>
                <div style={S.modalSub}>Pay directly via UPI:</div>
                <div style={S.upiDirectRow}>
                  {payModal.googlePayLink && (
                    <button style={{...S.upiDirect, background:'#1a73e8'}}
                      onClick={()=>{ openUPI(payModal.googlePayLink); setPayMethod('GPAY'); }}>
                      <span style={{fontSize:20}}>G</span>
                      <span>Google Pay</span>
                    </button>
                  )}
                  {payModal.phonePeLink && (
                    <button style={{...S.upiDirect, background:'#5f259f'}}
                      onClick={()=>{ openUPI(payModal.phonePeLink); setPayMethod('PHONEPE'); }}>
                      <span style={{fontSize:20}}>P</span>
                      <span>PhonePe</span>
                    </button>
                  )}
                  {payModal.paytmLink && (
                    <button style={{...S.upiDirect, background:'#00b9f1'}}
                      onClick={()=>{ openUPI(payModal.paytmLink); setPayMethod('PAYTM'); }}>
                      <span style={{fontSize:20}}>₹</span>
                      <span>Paytm</span>
                    </button>
                  )}
                </div>
                <div style={{fontSize:12,color:'var(--text-muted)',textAlign:'center',marginTop:6}}>
                  After paying, come back and click "Confirm Payment" below
                </div>
              </div>
            )}

            <div style={S.orLine}><span>or select payment method</span></div>

            {/* Method grid */}
            <div style={S.methodGrid}>
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} style={{...S.methodBtn,...(payMethod===m.id?{...S.methodActive,borderColor:m.color}:{})}}
                  onClick={()=>setPayMethod(m.id)}>
                  <div style={{...S.methodIcon, background:m.color+'22', color:m.color}}>{m.emoji}</div>
                  <div style={{fontSize:12, fontWeight:600}}>{m.label}</div>
                </button>
              ))}
            </div>

            {/* Transaction ID */}
            <div className="input-group" style={{marginTop:16}}>
              <label>Transaction ID (optional)</label>
              <input className="input" placeholder="UPI ref / cheque no..."
                value={txId} onChange={e=>setTxId(e.target.value)}/>
            </div>

            <div style={S.modalActions}>
              <button className="btn btn-ghost" onClick={()=>setPayModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={settling} onClick={handleSettle}>
                {settling ? 'Saving...' : '✓ Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page:       { padding:32, maxWidth:1000, animation:'fadeUp 0.4s ease' },
  header:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 },
  title:      { fontFamily:'var(--font-display)', fontWeight:800, fontSize:30, color:'var(--text-primary)', marginBottom:4 },
  subtitle:   { color:'var(--text-muted)', fontSize:14 },
  totalPill:  { background:'rgba(255,107,107,0.1)', border:'1px solid rgba(255,107,107,0.2)', borderRadius:16, padding:'12px 20px', textAlign:'right' },
  totalLabel: { display:'block', fontSize:11, color:'var(--danger)', fontWeight:700, marginBottom:4 },
  totalAmt:   { fontFamily:'var(--font-display)', fontWeight:800, fontSize:24, color:'var(--danger)' },
  tabs:       { display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' },
  tab:        { padding:'8px 18px', borderRadius:20, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:13, fontFamily:'var(--font-body)', transition:'all 0.15s' },
  tabActive:  { background:'var(--accent-dim)', borderColor:'var(--accent)', color:'var(--accent-bright)' },
  sectionTitle:{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:12 },
  dotRed:     { width:8, height:8, borderRadius:'50%', background:'var(--danger)', display:'inline-block', boxShadow:'0 0 8px var(--danger)' },
  dotGreen:   { width:8, height:8, borderRadius:'50%', background:'var(--success)', display:'inline-block', boxShadow:'0 0 8px var(--success)' },
  card:       { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, padding:'18px 22px', marginBottom:10 },
  cardLeft:   { display:'flex', alignItems:'center', gap:10, flex:1, flexWrap:'wrap' },
  avFrom:     { background:'rgba(255,107,107,0.15)', border:'1px solid var(--danger)', color:'var(--danger)', flexShrink:0 },
  avTo:       { background:'rgba(0,212,170,0.15)', border:'1px solid var(--success)', color:'var(--success)', flexShrink:0 },
  arrow:      { color:'var(--text-muted)', fontSize:18 },
  names:      { fontSize:14, lineHeight:1.6 },
  groupTag:   { fontSize:11, color:'var(--text-muted)' },
  youBadge:   { fontSize:10, color:'var(--danger)', fontWeight:700, marginTop:2 },
  cardRight:  { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 },
  amount:     { fontFamily:'var(--font-display)', fontWeight:700, fontSize:22, color:'var(--danger)' },
  payRow:     { display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' },
  upiBtn:     { fontSize:11, padding:'4px 10px', borderRadius:8, color:'white', border:'none', cursor:'pointer', fontWeight:600 },
  markBtn:    { padding:'7px 14px', fontSize:12 },
  remindBtn:  { fontSize:11, color:'var(--text-muted)', background:'transparent', border:'none', cursor:'pointer', padding:0 },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'80px 0' },
  overlay:    { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:24 },
  modal:      { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:28, width:'100%', maxWidth:460, maxHeight:'90vh', overflowY:'auto' },
  modalTitle: { fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:'var(--text-primary)', marginBottom:16 },
  modalInfo:  { background:'var(--bg-secondary)', borderRadius:12, padding:'14px 16px', marginBottom:20, textAlign:'center' },
  modalAmt:   { fontFamily:'var(--font-display)', fontWeight:800, fontSize:32, color:'var(--accent-bright)', marginBottom:4 },
  modalSub:   { fontSize:12, color:'var(--text-muted)', marginBottom:8, fontWeight:600 },
  upiDirectRow:{ display:'flex', gap:10 },
  upiDirect:  { flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 8px', borderRadius:12, border:'none', cursor:'pointer', color:'white', fontWeight:600, fontSize:13, transition:'transform 0.15s' },
  orLine:     { display:'flex', alignItems:'center', gap:10, margin:'16px 0', color:'var(--text-muted)', fontSize:12 },
  methodGrid: { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 },
  methodBtn:  { display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'10px 6px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-secondary)', cursor:'pointer', transition:'all 0.15s', color:'var(--text-secondary)' },
  methodActive:{ background:'var(--accent-dim)' },
  methodIcon: { width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700 },
  modalActions:{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 },
};
