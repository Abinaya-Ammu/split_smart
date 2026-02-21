import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, groupAPI, settlementAPI } from '../services/api';
import toast from 'react-hot-toast';

const CAT_EMOJI = { GENERAL:'◎', FOOD:'🍽️', TRANSPORT:'🚗', ENTERTAINMENT:'🎮', SHOPPING:'🛍️', UTILITIES:'💡', MEDICAL:'🏥', TRAVEL:'✈️', RENT:'🏠', OTHER:'📦' };
const TYPE_META = { GENERAL:{emoji:'◎'}, TRIP:{emoji:'✈️'}, HOME:{emoji:'🏠'}, FOOD:{emoji:'🍽️'}, WORK:{emoji:'💼'}, OTHER:{emoji:'📦'} };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dash, setDash]       = useState({});
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [d, g] = await Promise.all([dashboardAPI.get(), groupAPI.getAll()]);
      setDash(d || {});
      setGroups(Array.isArray(g) ? g : []);
    } catch {}
    setLoading(false);
  };

  const markPaid = async (settlementId) => {
    try {
      await settlementAPI.settle(settlementId);
      toast.success('Marked as paid! 🎉');
      load();
    } catch { toast.error('Failed to mark as paid'); }
  };

  const firstName  = user?.name?.split(' ')[0] || 'there';
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const totalYouOwe   = Number(dash?.totalYouOwe   || 0);
  const totalYouGet   = Number(dash?.totalYouGet   || 0);
  const activeGroups  = Number(dash?.activeGroups  || groups.length || 0);
  const rewardPoints  = Number(dash?.rewardPoints  || 0);
  const pendingList   = Array.isArray(dash?.pendingSettlements) ? dash.pendingSettlements : [];
  const recentExp     = Array.isArray(dash?.recentExpenses)     ? dash.recentExpenses     : [];
  const hasData       = groups.length > 0;

  const stats = [
    { label: 'You Owe',       value: `₹${totalYouOwe.toLocaleString()}`,  icon: '↑', color: 'var(--danger)'  },
    { label: 'Owed to You',   value: `₹${totalYouGet.toLocaleString()}`,  icon: '↓', color: 'var(--success)' },
    { label: 'Active Groups', value: activeGroups,                          icon: '◈', color: 'var(--accent)'  },
    { label: 'Reward Points', value: rewardPoints,                          icon: '⭐', color: 'var(--warning)' },
  ];

  return (
    <div style={S.page}>
      {/* HEADER */}
      <div style={S.header}>
        <div>
          <h1 style={S.greeting}>
            {greeting}, <span style={S.nameGrad}>{firstName}</span> ✦
          </h1>
          <p style={S.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/groups')}>+ New Group</button>
      </div>

      {/* STATS */}
      <div style={S.statsGrid}>
        {stats.map((s, i) => (
          <div key={i} className="card" style={S.statCard}>
            <div style={{ ...S.statIcon, color: s.color }}>{s.icon}</div>
            <div style={S.statVal}>{loading ? '—' : s.value}</div>
            <div style={S.statLabel}>{s.label}</div>
            <div style={{ ...S.statGlow, background: s.color }} />
          </div>
        ))}
      </div>

      {!hasData && !loading ? (
        /* ── EMPTY STATE: Quick start guide ── */
        <div style={S.quickStart}>
          <h3 style={S.qsTitle}>👋 Get started in 3 steps</h3>
          <div style={S.qsGrid}>
            {[
              { n:'1', title:'Create a Group',  desc:'Goa trip, flat mates, office lunch…',  btn:'Create Group',  to:'/groups'      },
              { n:'2', title:'Add Members',      desc:'Search friends by name or email',       btn:'Go to Groups',  to:'/groups'      },
              { n:'3', title:'Split a Bill',     desc:'Equal, custom or by percentage',        btn:'Add Expense',   to:'/groups'      },
            ].map((q, i) => (
              <div key={i} className="card" style={S.qsCard}>
                <div style={S.qsNum}>{q.n}</div>
                <div style={S.qsCardTitle}>{q.title}</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>{q.desc}</p>
                <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => navigate(q.to)}>{q.btn}</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={S.body}>
          {/* MY GROUPS */}
          <div className="card" style={S.section}>
            <div style={S.secHead}>
              <h3 style={S.secTitle}>My Groups</h3>
              <button style={S.viewAll} onClick={() => navigate('/groups')}>View all →</button>
            </div>
            {loading ? (
              [1,2].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10, marginBottom: 8 }} />)
            ) : groups.length === 0 ? (
              <div style={S.emptyRow}>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No groups yet</p>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => navigate('/groups')}>+ Create Group</button>
              </div>
            ) : groups.slice(0, 4).map(g => (
              <div key={g.id} style={S.groupRow} onClick={() => navigate(`/groups/${g.id}`)}>
                <span style={{ fontSize: 22 }}>{TYPE_META[g.type]?.emoji || '◎'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>👥 {g.memberCount || 1} members</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--accent-bright)' }}>→</span>
              </div>
            ))}
          </div>

          {/* PENDING SETTLEMENTS */}
          <div className="card" style={S.section}>
            <div style={S.secHead}>
              <h3 style={S.secTitle}>Pending Settlements</h3>
              <button style={S.viewAll} onClick={() => navigate('/settlements')}>View all →</button>
            </div>
            {loading ? (
              [1,2].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10, marginBottom: 8 }} />)
            ) : pendingList.length === 0 ? (
              <div style={S.emptyRow}>
                <span style={{ fontSize: 22 }}>🎉</span>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>All settled up!</p>
              </div>
            ) : pendingList.slice(0, 4).map((s, i) => (
              <div key={s.id || i} style={S.settleRow}>
                <div className="avatar" style={{ background: 'rgba(255,107,107,0.15)', color: 'var(--danger)', flexShrink: 0 }}>
                  {s.fromUser?.name?.[0] || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--danger)' }}>{s.fromUser?.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}> → </span>
                    <span style={{ color: 'var(--success)' }}>{s.toUser?.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.groupName}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--danger)', fontSize: 16 }}>
                    ₹{Number(s.amount || 0).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                    {s.googlePayLink && (
                      <a href={s.googlePayLink} style={S.payBtn} onClick={e => e.stopPropagation()}>GPay</a>
                    )}
                    {s.phonePeLink && (
                      <a href={s.phonePeLink} style={{ ...S.payBtn, background: '#5f259f' }} onClick={e => e.stopPropagation()}>PhonePe</a>
                    )}
                    <button style={S.markPaidBtn} onClick={() => markPaid(s.id)}>✓ Paid</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* RECENT EXPENSES */}
          {recentExp.length > 0 && (
            <div className="card" style={{ ...S.section, gridColumn: '1 / -1' }}>
              <div style={S.secHead}>
                <h3 style={S.secTitle}>Recent Expenses</h3>
                <button style={S.viewAll} onClick={() => navigate('/groups')}>View groups →</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                {recentExp.slice(0, 6).map((e, i) => (
                  <div key={e.id || i} style={S.expRow} onClick={() => navigate(`/groups/${e.groupId}`)}>
                    <div style={S.expIcon}>{CAT_EMOJI[e.category] || '◎'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.groupName} · {e.paidBy?.name}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', flexShrink: 0 }}>
                      ₹{Number(e.amount || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  page:      { padding: 32, maxWidth: 1200, animation: 'fadeUp 0.4s ease' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  greeting:  { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)', marginBottom: 4 },
  nameGrad:  { background: 'linear-gradient(135deg, var(--accent-bright), var(--success))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  date:      { color: 'var(--text-muted)', fontSize: 13 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard:  { position: 'relative', overflow: 'hidden', padding: 20 },
  statIcon:  { fontSize: 22, marginBottom: 10 },
  statVal:   { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--text-primary)', marginBottom: 4 },
  statLabel: { fontSize: 13, color: 'var(--text-secondary)' },
  statGlow:  { position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, borderRadius: '50%', opacity: 0.08, filter: 'blur(20px)' },
  body:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  section:   { padding: 24 },
  secHead:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  secTitle:  { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' },
  viewAll:   { background: 'none', border: 'none', color: 'var(--accent-bright)', cursor: 'pointer', fontSize: 13 },
  groupRow:  { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' },
  settleRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' },
  emptyRow:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 0', textAlign: 'center' },
  payBtn:    { fontSize: 10, padding: '3px 8px', borderRadius: 6, color: 'white', textDecoration: 'none', fontWeight: 600, background: '#1a73e8' },
  markPaidBtn:{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--success)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 },
  expRow:    { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, cursor: 'pointer' },
  expIcon:   { fontSize: 20, width: 38, height: 38, borderRadius: 8, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  quickStart:{ marginTop: 8 },
  qsTitle:   { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 16 },
  qsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
  qsCard:    { padding: 24 },
  qsNum:     { width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginBottom: 12 },
  qsCardTitle:{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 },
};
