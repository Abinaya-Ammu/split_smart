import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/dashboard',   icon: '⊞', label: 'Dashboard'   },
  { to: '/groups',      icon: '◈', label: 'Groups'       },
  { to: '/settlements', icon: '⇄', label: 'Settlements'  },
  { to: '/ai',          icon: '✦', label: 'AI Assistant' },
];

const TYPE_ICON = {
  GROUP_INVITE:     '👥',
  EXPENSE_ADDED:    '💰',
  PAYMENT_DUE:      '🔔',
  PAYMENT_RECEIVED: '✅',
  REMINDER:         '📨',
  GENERAL:          '◎',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs]   = useState([]);
  const [unread, setUnread]   = useState(0);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchCount = async () => setUnread(Number(await notificationAPI.getUnreadCount()) || 0);

  const openPanel = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    const data = await notificationAPI.getAll();
    setNotifs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const markAll = async () => {
    await notificationAPI.markAllRead();
    setNotifs(n => n.map(x => ({ ...x, isRead: true })));
    setUnread(0);
  };

  const clickNotif = async (n) => {
    if (!n.isRead) {
      await notificationAPI.markRead(n.id);
      setNotifs(p => p.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      setUnread(c => Math.max(0, c - 1));
    }
    if (n.groupId)       { navigate(`/groups/${n.groupId}`); setOpen(false); }
    else if (n.settlementId) { navigate('/settlements');     setOpen(false); }
  };

  const payNow = (e, link, appName) => {
    e.stopPropagation();
    if (!link) { toast.error('No UPI ID set'); return; }
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
      window.location.href = link;
    } else {
      const web = appName === 'GPay' ? 'https://pay.google.com' : appName === 'PhonePe' ? 'https://phon.pe' : 'https://paytm.com';
      toast(`On mobile this opens ${appName} directly`, { duration: 2500 });
      window.open(web, '_blank');
    }
  };

  return (
    <div style={S.sidebar}>
      {/* Logo */}
      <div style={S.logo}>
        <div style={S.logoIcon}>S</div>
        <span style={S.logoText}>SplitSmart</span>
      </div>

      {/* Nav */}
      <nav style={S.nav}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to}
            style={({ isActive }) => ({ ...S.link, ...(isActive ? S.linkOn : {}) })}>
            <span style={S.icon}>{item.icon}</span>{item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Notification Bell */}
      <div ref={ref} style={{ position: 'relative' }}>
        <button style={S.bell} onClick={openPanel}>
          <span>🔔</span>
          <span style={{ flex: 1, textAlign: 'left', fontSize: 14 }}>Notifications</span>
          {unread > 0 && <span style={S.badge}>{unread > 99 ? '99+' : unread}</span>}
        </button>

        {open && (
          <div style={S.panel}>
            <div style={S.panelHead}>
              <span style={S.panelTitle}>Notifications</span>
              {unread > 0 && <button style={S.readAll} onClick={markAll}>Mark all read</button>}
            </div>
            <div style={S.list}>
              {loading ? [1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 70, margin: '8px 12px', borderRadius: 10 }} />
              )) : notifs.length === 0 ? (
                <div style={S.empty}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>You're all caught up!</p>
                </div>
              ) : notifs.map(n => (
                <div key={n.id} style={{ ...S.notif, ...(n.isRead ? S.notifRead : S.notifUnread) }}
                  onClick={() => clickNotif(n)}>
                  <div style={S.notifLeft}>
                    <span style={{ fontSize: 20 }}>{TYPE_ICON[n.type] || '◎'}</span>
                    {!n.isRead && <div style={S.dot} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={S.notifTitle}>{n.title}</div>
                    <div style={S.notifMsg}>{n.message}</div>
                    {n.type === 'PAYMENT_DUE' && (
                      <div style={S.payBtns}>
                        {n.googlePayLink && <button style={{ ...S.payBtn, background: '#1a73e8' }} onClick={e => payNow(e, n.googlePayLink, 'GPay')}>G GPay</button>}
                        {n.phonePeLink  && <button style={{ ...S.payBtn, background: '#5f259f' }} onClick={e => payNow(e, n.phonePeLink,  'PhonePe')}>⚡ PhonePe</button>}
                        {n.paytmLink    && <button style={{ ...S.payBtn, background: '#00b9f1' }} onClick={e => payNow(e, n.paytmLink,    'Paytm')}>Paytm</button>}
                        {!n.googlePayLink && <span style={{ fontSize: 11, color: 'var(--warning)' }}>⚠ No UPI ID</span>}
                      </div>
                    )}
                    <div style={S.notifTime}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile + Logout */}
      <div style={S.user} onClick={() => navigate('/profile')} title="Edit Profile">
        <div className="avatar" style={{ flexShrink: 0, cursor: 'pointer' }}>
          {user?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
          <div style={S.userName}>{user?.name || 'User'}</div>
          <div style={S.userEmail}>{user?.email || ''}</div>
        </div>
        <button style={S.logout} title="Logout" onClick={e => { e.stopPropagation(); logout(); navigate('/login'); }}>⎋</button>
      </div>
    </div>
  );
}

const S = {
  sidebar:    { width: 240, minHeight: '100vh', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '24px 0', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 },
  logo:       { display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 28px' },
  logoIcon:   { width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,var(--accent),#9b93ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'white' },
  logoText:   { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' },
  nav:        { display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' },
  link:       { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'all 0.15s' },
  linkOn:     { background: 'var(--accent-dim)', color: 'var(--accent-bright)', fontWeight: 600 },
  icon:       { fontSize: 18, width: 22, textAlign: 'center' },
  bell:       { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', margin: '0 12px 4px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', width: 'calc(100% - 24px)', fontSize: 18 },
  badge:      { background: 'var(--danger)', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700, minWidth: 18, textAlign: 'center' },
  panel:      { position: 'fixed', left: 252, bottom: 80, width: 360, maxHeight: 520, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', zIndex: 300, overflow: 'hidden' },
  panelHead:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  panelTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' },
  readAll:    { fontSize: 12, color: 'var(--accent-bright)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 },
  list:       { overflowY: 'auto', flex: 1 },
  empty:      { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', textAlign: 'center' },
  notif:      { display: 'flex', gap: 10, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' },
  notifUnread:{ background: 'rgba(108,99,255,0.07)' },
  notifRead:  { opacity: 0.6 },
  notifLeft:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 },
  dot:        { width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-bright)' },
  notifTitle: { fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 3 },
  notifMsg:   { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 },
  notifTime:  { fontSize: 11, color: 'var(--text-muted)', marginTop: 5 },
  payBtns:    { display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' },
  payBtn:     { fontSize: 11, padding: '4px 9px', borderRadius: 6, color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 },
  user:       { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px 0', borderTop: '1px solid var(--border)', marginTop: 8, cursor: 'pointer' },
  userName:   { fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userEmail:  { fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  logout:     { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, flexShrink: 0 },
};
