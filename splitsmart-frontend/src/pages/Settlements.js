import React, { useState, useEffect } from 'react';
import { settlementAPI, groupAPI } from '../services/api';
import toast from 'react-hot-toast';

const METHODS = [
  { id: 'GPAY',    label: 'Google Pay', icon: '🟦', color: '#1a73e8' },
  { id: 'PHONEPE', label: 'PhonePe',    icon: '🟣', color: '#5f259f' },
  { id: 'PAYTM',   label: 'Paytm',      icon: '🔵', color: '#00b9f1' },
  { id: 'CASH',    label: 'Cash',       icon: '💵', color: '#00d4aa' },
  { id: 'BANK',    label: 'Bank',       icon: '🏦', color: '#ffb347' },
];

// Opens GPay/PhonePe/Paytm on mobile, or web fallback on desktop
function openPayApp(link, appName) {
  if (!link) { toast.error('No UPI ID set — ask them to add UPI ID in profile'); return; }
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = link;
  } else {
    // On desktop — show toast and open web version
    toast(`Opening ${appName}…\nFor direct payment, use the mobile app`, { icon: '📱', duration: 3000 });
    const webUrls = {
      'GPay':    'https://pay.google.com',
      'PhonePe': 'https://phon.pe',
      'Paytm':   'https://paytm.com',
    };
    window.open(webUrls[appName] || 'https://pay.google.com', '_blank');
  }
}

export default function Settlements() {
  const [settlements, setSettlements] = useState([]);
  const [groups, setGroups]           = useState([]);
  const [activeGroup, setActiveGroup] = useState('all');
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null); // { settlement }
  const [method, setMethod]           = useState('GPAY');
  const [txId, setTxId]               = useState('');
  const [settling, setSettling]       = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [s, g] = await Promise.all([settlementAPI.getPending(), groupAPI.getAll()]);
      setSettlements(Array.isArray(s) ? s : []);
      setGroups(Array.isArray(g) ? g : []);
    } catch { setSettlements([]); setGroups([]); }
    setLoading(false);
  };

  const openModal = (s) => { setModal(s); setMethod('GPAY'); setTxId(''); };

  const handleSettle = async () => {
    if (!modal) return;
    setSettling(true);
    try {
      await settlementAPI.settle(modal.id, method, txId || null);
      toast.success('Payment recorded! +10 reward points 🎉');
      setModal(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record payment');
    } finally { setSettling(false); }
  };

  const filtered = activeGroup === 'all'
    ? settlements
    : settlements.filter(s => String(s.groupId) === String(activeGroup));

  const pending  = filtered.filter(s => s.status !== 'COMPLETED' && s.status !== 'PAID');
  const settled  = filtered.filter(s => s.status === 'COMPLETED' || s.status === 'PAID');
  const totalOwed = pending.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Settlements</h1>
          <p style={S.sub}>
            {pending.length} pending
            {totalOwed > 0 && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>· ₹{totalOwed.toLocaleString()} total</span>}
          </p>
        </div>
      </div>

      {/* Group filter tabs */}
      <div style={S.tabs}>
        <button style={{ ...S.tab, ...(activeGroup === 'all' ? S.tabOn : {}) }} onClick={() => setActiveGroup('all')}>
          All Groups
        </button>
        {groups.map(g => (
          <button key={g.id}
            style={{ ...S.tab, ...(String(activeGroup) === String(g.id) ? S.tabOn : {}) }}
            onClick={() => setActiveGroup(g.id)}>
            {g.name}
          </button>
        ))}
      </div>

      {loading ? (
        [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14, marginBottom: 10 }} />)
      ) : (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <div style={S.section}>
              <h3 style={S.secTitle}>⏳ Pending ({pending.length})</h3>
              {pending.map(s => (
                <div key={s.id} className="card" style={S.row}>
                  <div style={S.avatarRow}>
                    <div className="avatar" style={{ background: 'rgba(255,107,107,0.15)', color: 'var(--danger)' }}>
                      {s.fromUser?.name?.[0] || '?'}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>→</span>
                    <div className="avatar" style={{ background: 'rgba(0,212,170,0.15)', color: 'var(--success)' }}>
                      {s.toUser?.name?.[0] || '?'}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.names}>
                      <b style={{ color: 'var(--danger)' }}>{s.fromUser?.name}</b>
                      <span style={{ color: 'var(--text-muted)' }}> owes </span>
                      <b style={{ color: 'var(--success)' }}>{s.toUser?.name}</b>
                    </div>
                    <div style={S.groupTag}>{s.groupName || 'Group'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={S.amount}>₹{Number(s.amount || 0).toLocaleString()}</div>
                    {/* UPI Pay Buttons */}
                    <div style={S.payRow}>
                      <button style={S.gpayBtn}
                        onClick={() => openPayApp(s.googlePayLink, 'GPay')}>
                        <span>G</span> GPay
                      </button>
                      <button style={S.phonepeBtn}
                        onClick={() => openPayApp(s.phonePeLink, 'PhonePe')}>
                        ⚡ PhonePe
                      </button>
                      <button style={S.paytmBtn}
                        onClick={() => openPayApp(s.paytmLink, 'Paytm')}>
                        Paytm
                      </button>
                      <button style={S.paidBtn} onClick={() => openModal(s)}>
                        ✓ Paid
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settled */}
          {settled.length > 0 && (
            <div style={S.section}>
              <h3 style={{ ...S.secTitle, opacity: 0.6 }}>✅ Settled ({settled.length})</h3>
              {settled.map(s => (
                <div key={s.id} className="card" style={{ ...S.row, opacity: 0.5 }}>
                  <div style={S.avatarRow}>
                    <div className="avatar">{s.fromUser?.name?.[0] || '?'}</div>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <div className="avatar">{s.toUser?.name?.[0] || '?'}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={S.names}>
                      <b>{s.fromUser?.name}</b><span style={{ color: 'var(--text-muted)' }}> paid </span><b>{s.toUser?.name}</b>
                    </div>
                    <div style={S.groupTag}>{s.groupName}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...S.amount, color: 'var(--success)' }}>₹{Number(s.amount || 0).toLocaleString()}</div>
                    <span className="badge badge-success" style={{ fontSize: 11 }}>Settled ✓</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pending.length === 0 && settled.length === 0 && (
            <div style={S.empty}>
              <div style={{ fontSize: 52 }}>🎉</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                All clear!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No settlements found. Add expenses in a group to get started.</p>
            </div>
          )}
        </>
      )}

      {/* ── MARK PAID MODAL ── */}
      {modal && (
        <div style={S.overlay} onClick={() => setModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Record Payment</h2>

            {/* Summary */}
            <div style={S.summary}>
              <div style={S.summaryRow}>
                <div className="avatar" style={{ background: 'rgba(255,107,107,0.2)', color: 'var(--danger)' }}>
                  {modal.fromUser?.name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{modal.fromUser?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>paying</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--accent-bright)' }}>
                  ₹{Number(modal.amount || 0).toLocaleString()}
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{modal.toUser?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>receiving</div>
                </div>
                <div className="avatar" style={{ background: 'rgba(0,212,170,0.2)', color: 'var(--success)' }}>
                  {modal.toUser?.name?.[0]}
                </div>
              </div>
            </div>

            {/* Pay directly first */}
            <div style={S.directPay}>
              <div style={S.directLabel}>💸 Pay directly via UPI</div>
              <div style={S.directBtns}>
                <button style={S.bigGpay} onClick={() => openPayApp(modal.googlePayLink, 'GPay')}>
                  <span style={{ fontSize: 20 }}>G</span>
                  <span>Google Pay</span>
                  {!modal.googlePayLink && <span style={{ fontSize: 10, opacity: 0.7 }}>No UPI set</span>}
                </button>
                <button style={S.bigPhonepe} onClick={() => openPayApp(modal.phonePeLink, 'PhonePe')}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  <span>PhonePe</span>
                  {!modal.phonePeLink && <span style={{ fontSize: 10, opacity: 0.7 }}>No UPI set</span>}
                </button>
                <button style={S.bigPaytm} onClick={() => openPayApp(modal.paytmLink, 'Paytm')}>
                  <span style={{ fontSize: 20 }}>💙</span>
                  <span>Paytm</span>
                  {!modal.paytmLink && <span style={{ fontSize: 10, opacity: 0.7 }}>No UPI set</span>}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                📱 On mobile — opens the payment app directly
              </p>
            </div>

            <div style={S.divider}><span>then confirm payment below</span></div>

            {/* Payment method select */}
            <div className="input-group">
              <label>How did you pay?</label>
              <div style={S.methodGrid}>
                {METHODS.map(m => (
                  <button key={m.id} type="button"
                    style={{ ...S.methodBtn, ...(method === m.id ? { ...S.methodOn, borderColor: m.color } : {}) }}
                    onClick={() => setMethod(m.id)}>
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label>Transaction ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input className="input" placeholder="e.g. UPI123456789"
                value={txId} onChange={e => setTxId(e.target.value)} />
            </div>

            <div style={S.modalActions}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSettle} disabled={settling}>
                {settling ? 'Recording...' : '✓ Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page:       { padding: 32, maxWidth: 900, animation: 'fadeUp 0.4s ease' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:      { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 },
  sub:        { color: 'var(--text-muted)', fontSize: 14 },
  tabs:       { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  tab:        { padding: '7px 16px', borderRadius: 20, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' },
  tabOn:      { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent-bright)' },
  section:    { marginBottom: 28 },
  secTitle:   { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 12 },
  row:        { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', marginBottom: 10 },
  avatarRow:  { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  names:      { fontSize: 14, marginBottom: 4 },
  groupTag:   { fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 6, display: 'inline-block' },
  amount:     { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--danger)', marginBottom: 6 },
  payRow:     { display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' },
  gpayBtn:    { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 9px', borderRadius: 6, background: '#1a73e8', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 },
  phonepeBtn: { fontSize: 11, padding: '4px 9px', borderRadius: 6, background: '#5f259f', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 },
  paytmBtn:   { fontSize: 11, padding: '4px 9px', borderRadius: 6, background: '#00b9f1', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 },
  paidBtn:    { fontSize: 11, padding: '4px 9px', borderRadius: 6, background: 'var(--success)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 },
  empty:      { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', textAlign: 'center', gap: 8 },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modal:      { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto' },
  modalTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 20 },
  summary:    { background: 'var(--bg-secondary)', borderRadius: 14, padding: 16, marginBottom: 20 },
  summaryRow: { display: 'flex', alignItems: 'center', gap: 10 },
  directPay:  { background: 'rgba(108,99,255,0.06)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 20 },
  directLabel:{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 },
  directBtns: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 },
  bigGpay:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', borderRadius: 12, background: '#1a73e8', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  bigPhonepe: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', borderRadius: 12, background: '#5f259f', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  bigPaytm:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', borderRadius: 12, background: '#00b9f1', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  divider:    { display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px', color: 'var(--text-muted)', fontSize: 12, '::before': { content:'""', flex:1, height:1, background:'var(--border)' } },
  methodGrid: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 8 },
  methodBtn:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)' },
  methodOn:   { background: 'var(--accent-dim)', borderWidth: 2 },
  modalActions:{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
};
