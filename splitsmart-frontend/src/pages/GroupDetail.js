import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupAPI, expenseAPI, settlementAPI } from '../services/api';
import toast from 'react-hot-toast';

const CAT_EMOJI={GENERAL:'◎',FOOD:'🍽️',TRANSPORT:'🚗',ENTERTAINMENT:'🎮',SHOPPING:'🛍️',UTILITIES:'💡',MEDICAL:'🏥',TRAVEL:'✈️',RENT:'🏠',OTHER:'📦'};
const CATEGORIES=['GENERAL','FOOD','TRANSPORT','ENTERTAINMENT','SHOPPING','UTILITIES','MEDICAL','TRAVEL','RENT','OTHER'];

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup]       = useState(null);
  const [members, setMembers]   = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('expenses');
  const [showAddExp, setShowAddExp]       = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQ, setSearchQ]   = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [expErr, setExpErr]     = useState('');

  const emptyForm = (memberList=[]) => ({
    description:'', amount:'', category:'FOOD', splitType:'EQUAL',
    participantIds: memberList.map(m=>m.id),
    customSplits:     memberList.map(m=>({userId:m.id, amount:''})),
    percentageSplits: memberList.map(m=>({userId:m.id, percentage:''})),
  });

  const [form, setForm] = useState(emptyForm());

  useEffect(() => { loadAll(); }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [grp, mem] = await Promise.all([groupAPI.getById(id), groupAPI.getMembers(id)]);
      setGroup(grp);
      const ml = Array.isArray(mem) ? mem : [];
      setMembers(ml);
      setForm(emptyForm(ml));

      const expRaw = await expenseAPI.getByGroup(id);
      setExpenses(Array.isArray(expRaw) ? expRaw : (expRaw?.content||[]));

      try {
        const sl = await settlementAPI.getByGroup(id);
        setSettlements(Array.isArray(sl)?sl:[]);
      } catch {}
    } catch (err) {
      toast.error('Failed to load group: ' + (err.response?.data?.message||err.message));
    } finally { setLoading(false); }
  };

  const handleSearch = async (q) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchRes([]); return; }
    try {
      const res = await groupAPI.searchUsers(q);
      const memberIds = new Set(members.map(m=>m.id));
      setSearchRes((Array.isArray(res)?res:[]).filter(u=>!memberIds.has(u.id)));
    } catch { setSearchRes([]); }
  };

  const addMember = async (userId) => {
    try {
      await groupAPI.addMember(id, userId);
      toast.success('Member added!');
      setShowAddMember(false); setSearchQ(''); setSearchRes([]);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.message||'Failed to add member'); }
  };

  const changeSplitType = (type) => {
    setForm(f=>({ ...f, splitType:type,
      participantIds: members.map(m=>m.id),
      customSplits: members.map(m=>({userId:m.id,amount:''})),
      percentageSplits: members.map(m=>({userId:m.id,percentage:''})),
    }));
  };

  const toggleParticipant = (uid) => {
    setForm(f=>({...f, participantIds: f.participantIds.includes(uid)
      ? f.participantIds.filter(i=>i!==uid)
      : [...f.participantIds, uid]}));
  };

  const validateExpense = () => {
    if (!form.description.trim())  return 'Description is required';
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0)          return 'Enter a valid amount';
    if (members.length === 0)      return 'Add members before adding expenses';
    if ((form.splitType==='EQUAL'||form.splitType==='PARTIAL') && form.participantIds.length===0)
      return 'Select at least one participant';
    if (form.splitType==='CUSTOM') {
      const sum = form.customSplits.reduce((s,x)=>s+parseFloat(x.amount||0),0);
      if (Math.abs(sum-amt)>0.5) return `Custom amounts must sum to ₹${amt} (currently ₹${sum.toFixed(2)})`;
    }
    if (form.splitType==='PERCENTAGE') {
      const sum = form.percentageSplits.reduce((s,x)=>s+parseFloat(x.percentage||0),0);
      if (Math.abs(sum-100)>0.5) return `Percentages must total 100% (currently ${sum.toFixed(1)}%)`;
    }
    return null;
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const err = validateExpense();
    if (err) { setExpErr(err); toast.error(err); return; }
    setSubmitting(true); setExpErr('');
    try {
      // Build payload matching backend ExpenseRequest exactly
      const payload = {
        description: form.description.trim(),
        amount:      parseFloat(form.amount),
        groupId:     parseInt(id),
        splitType:   form.splitType,
        category:    form.category,
      };

      if (form.splitType === 'EQUAL' || form.splitType === 'PARTIAL') {
        payload.participantIds = form.participantIds;
      } else if (form.splitType === 'CUSTOM') {
        payload.customSplits = form.customSplits
          .filter(s=>parseFloat(s.amount||0)>0)
          .map(s=>({ userId:s.userId, amount:parseFloat(s.amount) }));
      } else if (form.splitType === 'PERCENTAGE') {
        payload.percentageSplits = form.percentageSplits
          .filter(s=>parseFloat(s.percentage||0)>0)
          .map(s=>({ userId:s.userId, percentage:parseFloat(s.percentage) }));
      }

      console.log('Creating expense:', payload);
      await expenseAPI.create(payload);
      toast.success('Expense added! Settlements updated ✓');
      setShowAddExp(false);
      setForm(emptyForm(members));
      loadAll();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.data
        ? JSON.stringify(err.response?.data?.data) : err.message || 'Failed to add expense';
      setExpErr(String(msg));
      toast.error(String(msg));
      console.error('Add expense error:', err.response?.data||err);
    } finally { setSubmitting(false); }
  };

  const equalShare = () => {
    const n = form.participantIds.length;
    const a = parseFloat(form.amount);
    if (!n||!a) return null;
    return (a/n).toFixed(2);
  };

  const totalExpenses = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const pendingCount  = settlements.filter(s=>s.status!=='COMPLETED'&&s.status!=='PAID').length;

  if (loading) return (
    <div style={{padding:32}}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:80,borderRadius:12,marginBottom:12}}/>)}</div>
  );
  if (!group) return <div style={{padding:32,color:'var(--text-muted)'}}>Group not found.</div>;

  return (
    <div style={S.page}>
      <button style={S.back} onClick={()=>navigate('/groups')}>← Back to Groups</button>

      {/* HEADER */}
      <div style={S.header}>
        <div>
          <div style={S.groupType}>{group.type}</div>
          <h1 style={S.title}>{group.name}</h1>
          <p style={S.subtitle}>{group.description||''} · Code: <b style={{color:'var(--accent-bright)',fontFamily:'monospace'}}>#{group.inviteCode}</b></p>
        </div>
        <div style={S.headRight}>
          <div style={S.pill}>
            <div style={S.pillLabel}>Total Spent</div>
            <div style={S.pillVal}>₹{totalExpenses.toLocaleString()}</div>
          </div>
          {pendingCount>0 && <div style={{...S.pill,borderColor:'var(--danger)'}}>
            <div style={{...S.pillLabel,color:'var(--danger)'}}>Pending</div>
            <div style={{...S.pillVal,color:'var(--danger)'}}>{pendingCount} dues</div>
          </div>}
          <button className="btn btn-primary" onClick={()=>{ setExpErr(''); setShowAddExp(true); }}>
            + Add Expense
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={S.tabs}>
        {[{k:'expenses',l:`Expenses (${expenses.length})`},{k:'members',l:`Members (${members.length})`},{k:'settlements',l:`Settlements (${settlements.length})`}].map(t=>(
          <button key={t.k} style={{...S.tab,...(tab===t.k?S.tabActive:{})}} onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* EXPENSES TAB */}
      {tab==='expenses' && (
        <div style={S.list}>
          {expenses.length===0 ? (
            <div style={S.empty}>
              <div style={{fontSize:40}}>◎</div>
              <h3 style={S.emptyTitle}>No expenses yet</h3>
              <p style={{color:'var(--text-muted)',fontSize:13,marginBottom:12}}>
                {members.length<=1 ? 'Add members first, then add expenses' : 'Add your first expense to split'}
              </p>
              {members.length<=1
                ? <button className="btn btn-ghost" onClick={()=>setTab('members')}>Add Members →</button>
                : <button className="btn btn-primary" onClick={()=>setShowAddExp(true)}>+ Add Expense</button>
              }
            </div>
          ) : expenses.map((exp,i)=>(
            <div key={exp.id||i} className="card" style={S.expRow}>
              <div style={S.expCat}>{CAT_EMOJI[exp.category]||'◎'}</div>
              <div style={{flex:1}}>
                <div style={S.expName}>{exp.description}</div>
                <div style={S.expMeta}>
                  Paid by <span style={{color:'var(--accent-bright)'}}>{exp.paidBy?.name||'You'}</span>
                  {' · '}{exp.splitType}
                  {' · '}{new Date(exp.expenseDate||exp.createdAt).toLocaleDateString('en-IN')}
                </div>
                {exp.splits?.length>0 && (
                  <div style={S.chips}>
                    {exp.splits.map((sp,j)=>(
                      <span key={j} style={{...S.chip,...(sp.isPaid?{borderColor:'var(--success)',color:'var(--success)'}:{})}}>
                        {sp.user?.name?.split(' ')[0]} ₹{Number(sp.amount||0).toLocaleString()}
                        {sp.isPaid?' ✓':''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={S.expAmt}>₹{Number(exp.amount||0).toLocaleString()}</div>
                {exp.yourShare!=null && <div style={S.yourShare}>Your: ₹{Number(exp.yourShare).toLocaleString()}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MEMBERS TAB */}
      {tab==='members' && (
        <div>
          <button className="btn btn-ghost" style={{marginBottom:14}} onClick={()=>setShowAddMember(true)}>+ Add Member</button>
          <div style={S.list}>
            {members.map(m=>(
              <div key={m.id} className="card" style={{...S.expRow,padding:'14px 20px'}}>
                <div className="avatar">{m.name?.[0]?.toUpperCase()||'?'}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,color:'var(--text-primary)'}}>{m.name}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>{m.email}</div>
                </div>
              </div>
            ))}
            {members.length===0 && <div style={{color:'var(--text-muted)',textAlign:'center',padding:'40px 0',fontSize:14}}>No members yet</div>}
          </div>
        </div>
      )}

      {/* SETTLEMENTS TAB */}
      {tab==='settlements' && (
        <div style={S.list}>
          {settlements.length===0 ? (
            <div style={S.empty}>
              <span style={{fontSize:32}}>🎉</span>
              <p style={{color:'var(--text-muted)',fontSize:14}}>All settled! Add expenses to generate settlements.</p>
            </div>
          ) : settlements.map((s,i)=>(
            <div key={s.id||i} className="card" style={{...S.expRow, opacity:s.status==='COMPLETED'?.6:1}}>
              <div className="avatar" style={{background:'rgba(255,107,107,0.15)',color:'var(--danger)'}}>{s.fromUser?.name?.[0]}</div>
              <span style={{color:'var(--text-muted)',fontSize:18}}>→</span>
              <div className="avatar" style={{background:'rgba(0,212,170,0.15)',color:'var(--success)'}}>{s.toUser?.name?.[0]}</div>
              <div style={{flex:1}}>
                <b style={{color:'var(--text-primary)'}}>{s.fromUser?.name}</b>
                <span style={{color:'var(--text-muted)'}}> owes </span>
                <b style={{color:'var(--text-primary)'}}>{s.toUser?.name}</b>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:18,color:s.status==='COMPLETED'?'var(--success)':'var(--danger)'}}>
                  ₹{Number(s.amount||0).toLocaleString()}
                </div>
                {s.status!=='COMPLETED' && s.googlePayLink && (
                  <div style={{display:'flex',gap:4,marginTop:4,justifyContent:'flex-end'}}>
                    <a href={s.googlePayLink} style={S.miniPay} onClick={e=>e.stopPropagation()}>GPay</a>
                    {s.phonePeLink && <a href={s.phonePeLink} style={{...S.miniPay,background:'#5f259f'}}>PhonePe</a>}
                  </div>
                )}
                {s.status==='COMPLETED' && <span className="badge badge-success" style={{fontSize:11}}>Settled ✓</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ADD EXPENSE MODAL ── */}
      {showAddExp && (
        <div style={S.overlay} onClick={()=>setShowAddExp(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()} className="animate-fadeUp">
            <h2 style={S.modalTitle}>Add Expense</h2>
            <form onSubmit={handleAddExpense} style={S.form}>
              <div className="input-group">
                <label>Description *</label>
                <input className="input" placeholder="e.g. Hotel Booking" autoFocus
                  value={form.description}
                  onChange={e=>{ setForm({...form,description:e.target.value}); setExpErr(''); }} required/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div className="input-group">
                  <label>Amount (₹) *</label>
                  <input className="input" type="number" min="0.01" step="0.01" placeholder="0.00"
                    value={form.amount}
                    onChange={e=>{ setForm({...form,amount:e.target.value}); setExpErr(''); }} required/>
                </div>
                <div className="input-group">
                  <label>Category</label>
                  <select className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
                  </select>
                </div>
              </div>

              {/* Split Type */}
              <div className="input-group">
                <label>Split Type</label>
                <div style={S.splitGrid}>
                  {[
                    {t:'EQUAL',     icon:'÷', l:'Equal'},
                    {t:'PARTIAL',   icon:'◑', l:'Some Pay'},
                    {t:'CUSTOM',    icon:'✎', l:'Custom ₹'},
                    {t:'PERCENTAGE',icon:'%', l:'By %'},
                  ].map(({t,icon,l})=>(
                    <button key={t} type="button"
                      style={{...S.splitBtn,...(form.splitType===t?S.splitBtnActive:{})}}
                      onClick={()=>changeSplitType(t)}>
                      <span style={{fontSize:18}}>{icon}</span>
                      <span style={{fontSize:12,fontWeight:600}}>{l}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* EQUAL or PARTIAL: pick participants */}
              {(form.splitType==='EQUAL'||form.splitType==='PARTIAL') && members.length>0 && (
                <div className="input-group">
                  <label>
                    {form.splitType==='PARTIAL'?'Who pays? (pick some)':'Split between:'}
                    {equalShare() && <span style={{color:'var(--accent-bright)',fontWeight:600,marginLeft:8}}>₹{equalShare()} each</span>}
                  </label>
                  <div style={S.partGrid}>
                    {members.map(m=>(
                      <button key={m.id} type="button"
                        style={{...S.partBtn,...(form.participantIds.includes(m.id)?S.partBtnOn:{})}}
                        onClick={()=>toggleParticipant(m.id)}>
                        <div style={S.partAv}>{m.name?.[0]?.toUpperCase()}</div>
                        {m.name?.split(' ')[0]}
                        {form.participantIds.includes(m.id)&&<span style={{color:'var(--success)',fontSize:11}}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CUSTOM: amount per person */}
              {form.splitType==='CUSTOM' && (
                <div className="input-group">
                  <label>Amount per person
                    <span style={{color:'var(--text-muted)',fontWeight:400,marginLeft:6,fontSize:12}}>(must total ₹{form.amount||'?'})</span>
                  </label>
                  {members.map(m=>(
                    <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <div className="avatar" style={{width:28,height:28,fontSize:11,flexShrink:0}}>{m.name?.[0]}</div>
                      <span style={{flex:1,fontSize:13,color:'var(--text-secondary)'}}>{m.name}</span>
                      <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                        style={{width:100,padding:'6px 10px'}}
                        value={form.customSplits.find(s=>s.userId===m.id)?.amount||''}
                        onChange={e=>setForm(f=>({...f,customSplits:f.customSplits.map(s=>s.userId===m.id?{...s,amount:e.target.value}:s)}))}/>
                    </div>
                  ))}
                  <div style={{fontSize:12,fontWeight:600,color:
                    Math.abs(form.customSplits.reduce((s,x)=>s+parseFloat(x.amount||0),0)-parseFloat(form.amount||0))<0.5
                    ?'var(--success)':'var(--warning)'}}>
                    Sum: ₹{form.customSplits.reduce((s,x)=>s+parseFloat(x.amount||0),0).toFixed(2)} / ₹{form.amount||0}
                  </div>
                </div>
              )}

              {/* PERCENTAGE: % per person */}
              {form.splitType==='PERCENTAGE' && (
                <div className="input-group">
                  <label>Percentage per person <span style={{color:'var(--text-muted)',fontWeight:400,fontSize:12}}>(total = 100%)</span></label>
                  {members.map(m=>(
                    <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <div className="avatar" style={{width:28,height:28,fontSize:11,flexShrink:0}}>{m.name?.[0]}</div>
                      <span style={{flex:1,fontSize:13,color:'var(--text-secondary)'}}>{m.name}</span>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        <input className="input" type="number" min="0" max="100" step="1" placeholder="0"
                          style={{width:70,padding:'6px 10px'}}
                          value={form.percentageSplits.find(s=>s.userId===m.id)?.percentage||''}
                          onChange={e=>setForm(f=>({...f,percentageSplits:f.percentageSplits.map(s=>s.userId===m.id?{...s,percentage:e.target.value}:s)}))}/>
                        <span style={{fontSize:13,color:'var(--text-muted)'}}>%</span>
                        {form.amount && form.percentageSplits.find(s=>s.userId===m.id)?.percentage && (
                          <span style={{fontSize:11,color:'var(--accent-bright)',width:55}}>
                            ₹{(parseFloat(form.amount)*parseFloat(form.percentageSplits.find(s=>s.userId===m.id).percentage)/100).toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div style={{fontSize:12,fontWeight:600,color:
                    Math.abs(form.percentageSplits.reduce((s,x)=>s+parseFloat(x.percentage||0),0)-100)<0.5
                    ?'var(--success)':'var(--warning)'}}>
                    Total: {form.percentageSplits.reduce((s,x)=>s+parseFloat(x.percentage||0),0).toFixed(1)}%
                  </div>
                </div>
              )}

              {expErr && <div style={S.errBox}>⚠ {expErr}</div>}

              <div style={S.formActions}>
                <button type="button" className="btn btn-ghost" onClick={()=>setShowAddExp(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting?'Adding...':'Add Expense →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {showAddMember && (
        <div style={S.overlay} onClick={()=>setShowAddMember(false)}>
          <div style={{...S.modal,maxWidth:400}} onClick={e=>e.stopPropagation()} className="animate-fadeUp">
            <h2 style={S.modalTitle}>Add Member</h2>
            <div style={{background:'var(--bg-secondary)',borderRadius:10,padding:'12px 14px',marginBottom:14,fontSize:13}}>
              Share invite code:
              <span style={{color:'var(--accent-bright)',fontWeight:700,fontFamily:'monospace',marginLeft:6}}>#{group.inviteCode}</span>
            </div>
            <input className="input" placeholder="Search by name or email..."
              value={searchQ} onChange={e=>handleSearch(e.target.value)} style={{marginBottom:10}} autoFocus/>
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:240,overflowY:'auto'}}>
              {searchRes.map(u=>(
                <div key={u.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--bg-secondary)',borderRadius:10}}>
                  <div className="avatar">{u.name?.[0]?.toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13,color:'var(--text-primary)'}}>{u.name}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>{u.email}</div>
                  </div>
                  <button className="btn btn-primary" style={{padding:'6px 12px',fontSize:12}} onClick={()=>addMember(u.id)}>Add</button>
                </div>
              ))}
              {searchQ.length>=2&&searchRes.length===0&&(
                <p style={{color:'var(--text-muted)',fontSize:13,textAlign:'center',padding:'16px 0'}}>No users found</p>
              )}
            </div>
            <button className="btn btn-ghost" style={{marginTop:14,width:'100%'}} onClick={()=>setShowAddMember(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page:      { padding:32, maxWidth:950, animation:'fadeUp 0.4s ease' },
  back:      { background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, padding:'0 0 16px 0', display:'block' },
  header:    { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 },
  groupType: { fontSize:11, color:'var(--accent-bright)', fontWeight:700, letterSpacing:'1px', marginBottom:4 },
  title:     { fontFamily:'var(--font-display)', fontWeight:800, fontSize:26, color:'var(--text-primary)', marginBottom:4 },
  subtitle:  { color:'var(--text-muted)', fontSize:13 },
  headRight: { display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' },
  pill:      { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'8px 14px', display:'flex', flexDirection:'column', alignItems:'flex-end' },
  pillLabel: { fontSize:11, color:'var(--text-muted)' },
  pillVal:   { fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--accent-bright)' },
  tabs:      { display:'flex', gap:8, marginBottom:20 },
  tab:       { padding:'8px 18px', borderRadius:20, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', cursor:'pointer', fontSize:13, fontFamily:'var(--font-body)', transition:'all 0.15s' },
  tabActive: { background:'var(--accent-dim)', borderColor:'var(--accent)', color:'var(--accent-bright)' },
  list:      { display:'flex', flexDirection:'column', gap:10 },
  expRow:    { display:'flex', alignItems:'center', gap:12, padding:'16px 20px' },
  expCat:    { fontSize:22, width:46, height:46, borderRadius:12, background:'var(--bg-secondary)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  expName:   { fontWeight:600, fontSize:14, color:'var(--text-primary)', marginBottom:3 },
  expMeta:   { fontSize:12, color:'var(--text-muted)' },
  expAmt:    { fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color:'var(--text-primary)' },
  yourShare: { fontSize:11, color:'var(--text-muted)', marginTop:2 },
  chips:     { display:'flex', gap:5, flexWrap:'wrap', marginTop:6 },
  chip:      { fontSize:11, padding:'3px 8px', background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:20, color:'var(--text-muted)' },
  miniPay:   { fontSize:10, padding:'3px 8px', borderRadius:6, color:'white', textDecoration:'none', fontWeight:600, background:'#1a73e8' },
  empty:     { display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'60px 0', textAlign:'center' },
  emptyTitle:{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color:'var(--text-primary)' },
  overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:24 },
  modal:     { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:28, width:'100%', maxWidth:540, maxHeight:'92vh', overflowY:'auto' },
  modalTitle:{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:'var(--text-primary)', marginBottom:20 },
  form:      { display:'flex', flexDirection:'column', gap:18 },
  splitGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:6 },
  splitBtn:  { display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'10px 6px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-secondary)', cursor:'pointer', color:'var(--text-secondary)', transition:'all 0.15s' },
  splitBtnActive: { background:'var(--accent-dim)', borderColor:'var(--accent)', color:'var(--accent-bright)' },
  partGrid:  { display:'flex', flexWrap:'wrap', gap:8, marginTop:6 },
  partBtn:   { display:'flex', alignItems:'center', gap:7, padding:'7px 12px', borderRadius:20, border:'1px solid var(--border)', background:'var(--bg-secondary)', cursor:'pointer', fontSize:13, fontFamily:'var(--font-body)', color:'var(--text-secondary)', transition:'all 0.15s' },
  partBtnOn: { background:'var(--accent-dim)', borderColor:'var(--accent)', color:'var(--accent-bright)' },
  partAv:    { width:22, height:22, borderRadius:'50%', background:'var(--accent-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 },
  errBox:    { background:'rgba(255,107,107,0.1)', border:'1px solid rgba(255,107,107,0.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--danger)' },
  formActions:{ display:'flex', gap:10, justifyContent:'flex-end' },
};
