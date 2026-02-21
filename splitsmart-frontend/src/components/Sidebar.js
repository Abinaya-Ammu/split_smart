import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to:'/dashboard',   icon:'⊞', label:'Dashboard' },
  { to:'/groups',      icon:'◈', label:'Groups' },
  { to:'/settlements', icon:'⇄', label:'Settlements' },
  { to:'/ai',          icon:'✦', label:'AI Assistant' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';

  return (
    <nav style={S.sidebar}>
      {/* Logo */}
      <div style={S.logo}>
        <div style={S.logoIcon}>S</div>
        <div>
          <div style={S.logoText}>SplitSmart</div>
          <div style={S.logoSub}>Expense Manager</div>
        </div>
      </div>

      {/* Nav Links */}
      <div style={S.navList}>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} style={({isActive}) => ({...S.navItem, ...(isActive ? S.navActive : {})})}
            end={n.to==='/dashboard'}>
            <span style={S.navIcon}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </div>

      {/* Bottom */}
      <div style={S.bottom}>
        <div style={S.userRow}>
          <div style={S.avatar}>{initials}</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={S.userName}>{user?.name || 'User'}</div>
            <div style={S.userEmail}>{user?.email || ''}</div>
          </div>
        </div>
        <button style={S.logoutBtn} onClick={handleLogout}>Sign out</button>
      </div>
    </nav>
  );
}

const S = {
  sidebar:    { width:240, background:'var(--bg-secondary)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', padding:'24px 16px', height:'100vh', position:'sticky', top:0, flexShrink:0 },
  logo:       { display:'flex', alignItems:'center', gap:10, padding:'0 8px', marginBottom:32 },
  logoIcon:   { width:36, height:36, borderRadius:10, background:'linear-gradient(135deg, var(--accent), #9b93ff)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'white', flexShrink:0 },
  logoText:   { fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--text-primary)' },
  logoSub:    { fontSize:10, color:'var(--text-muted)' },
  navList:    { display:'flex', flexDirection:'column', gap:4, flex:1 },
  navItem:    { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, color:'var(--text-secondary)', textDecoration:'none', fontSize:14, fontWeight:500, transition:'all 0.15s' },
  navActive:  { background:'var(--accent-dim)', color:'var(--accent-bright)', borderLeft:'2px solid var(--accent)' },
  navIcon:    { fontSize:16, width:20, textAlign:'center' },
  bottom:     { borderTop:'1px solid var(--border)', paddingTop:16 },
  userRow:    { display:'flex', alignItems:'center', gap:10, padding:'8px', marginBottom:8 },
  avatar:     { width:34, height:34, borderRadius:'50%', background:'var(--accent-dim)', border:'1px solid var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--accent-bright)', flexShrink:0 },
  userName:   { fontWeight:600, fontSize:13, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  userEmail:  { fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  logoutBtn:  { width:'100%', padding:'8px', background:'transparent', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-muted)', cursor:'pointer', fontSize:13, fontFamily:'var(--font-body)', transition:'all 0.15s' },
};
