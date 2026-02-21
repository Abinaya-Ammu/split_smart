import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

const UPI_APPS = [
  { id: 'gpay',    label: 'Google Pay', suffix: '@okicici', color: '#1a73e8', icon: 'G' },
  { id: 'phonepe', label: 'PhonePe',    suffix: '@ybl',     color: '#5f259f', icon: '⚡' },
  { id: 'paytm',   label: 'Paytm',      suffix: '@paytm',   color: '#00b9f1', icon: 'P' },
];

export default function Profile() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm]       = useState({ name: '', phone: '', place: '', upiId: '' });
  const [saving, setSaving]   = useState(false);
  const [upiInput, setUpiInput] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await userAPI.getMe();
    if (data) {
      setProfile(data);
      setForm({ name: data.name || '', phone: data.phone || '', place: data.place || '', upiId: data.upiId || '' });
      setUpiInput(data.upiId || '');
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await userAPI.updateProfile(form);
      setProfile(updated);
      // Update localStorage so sidebar shows new name
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, ...updated }));
      toast.success('Profile saved ✓');
    } catch { toast.error('Failed to save profile'); }
    finally { setSaving(false); }
  };

  const saveUpi = async () => {
    if (!upiInput.trim()) { toast.error('Enter a UPI ID'); return; }
    // Basic UPI validation: should contain @
    if (!upiInput.includes('@')) { toast.error('UPI ID must contain @ (e.g. name@upi)'); return; }
    setSavingUpi(true);
    try {
      const updated = await userAPI.updateUpi(upiInput.trim());
      setProfile(updated);
      setForm(f => ({ ...f, upiId: upiInput.trim() }));
      toast.success('UPI ID saved! GPay/PhonePe payments now work ✅');
    } catch { toast.error('Failed to save UPI ID'); }
    finally { setSavingUpi(false); }
  };

  const setQuickUpi = (suffix) => {
    const base = upiInput.includes('@') ? upiInput.split('@')[0] : (profile?.phone || profile?.name?.replace(/\s/g,'').toLowerCase() || '');
    setUpiInput(base + suffix);
  };

  return (
    <div style={S.page}>
      <h1 style={S.title}>Profile</h1>

      {/* ── UPI ID — highlighted at top ── */}
      <div className="card" style={S.upiCard}>
        <div style={S.upiHead}>
          <div>
            <h2 style={S.upiTitle}>💳 UPI ID for Payments</h2>
            <p style={S.upiSub}>Set your UPI ID so others can pay you via GPay, PhonePe &amp; Paytm directly</p>
          </div>
          {form.upiId && <span style={S.upiSet}>✅ Set</span>}
        </div>

        {/* Quick select UPI app */}
        <div style={S.appRow}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 8 }}>Quick set:</span>
          {UPI_APPS.map(app => (
            <button key={app.id} style={{ ...S.appChip, background: app.color }}
              onClick={() => setQuickUpi(app.suffix)}>
              {app.icon} {app.label}
            </button>
          ))}
        </div>

        <div style={S.upiRow}>
          <input className="input" style={{ flex: 1 }}
            placeholder="e.g. yourname@okicici or 9876543210@paytm"
            value={upiInput}
            onChange={e => setUpiInput(e.target.value)} />
          <button className="btn btn-primary" onClick={saveUpi} disabled={savingUpi}>
            {savingUpi ? 'Saving...' : 'Save UPI'}
          </button>
        </div>

        {upiInput && (
          <div style={S.upiPreview}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Payment link preview: </span>
            <span style={S.upiLink}>upi://pay?pa={upiInput}</span>
          </div>
        )}

        {!form.upiId && (
          <div style={S.upiWarn}>
            ⚠ Without a UPI ID, others can't pay you directly via GPay/PhonePe. Set it now!
          </div>
        )}
      </div>

      {/* ── Profile details ── */}
      <div className="card" style={S.card}>
        <h2 style={S.secTitle}>Personal Details</h2>
        <form onSubmit={saveProfile} style={S.form}>
          <div style={S.row2}>
            <div className="input-group">
              <label>Full Name</label>
              <input className="input" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Phone</label>
              <input className="input" value={form.phone} placeholder="9876543210"
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="input-group">
            <label>Place / City</label>
            <input className="input" value={form.place} placeholder="Chennai"
              onChange={e => setForm({ ...form, place: e.target.value })} />
          </div>
          <div className="input-group">
            <label>Email <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(cannot change)</span></label>
            <input className="input" value={profile?.email || ''} disabled
              style={{ opacity: 0.5 }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* ── Stats ── */}
      <div className="card" style={{ ...S.card, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
        {[
          { label: '⭐ Reward Points', value: profile?.rewardPoints || 0, color: 'var(--warning)' },
          { label: '🔥 Zero Debt Streak', value: (profile?.zeroDebtStreak || 0) + ' days', color: 'var(--success)' },
          { label: '📅 Member Since', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—', color: 'var(--accent-bright)' },
        ].map((s, i) => (
          <div key={i} style={S.stat}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const S = {
  page:       { padding: 32, maxWidth: 720, animation: 'fadeUp 0.4s ease' },
  title:      { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--text-primary)', marginBottom: 24 },
  upiCard:    { padding: 28, marginBottom: 20, border: '1px solid rgba(108,99,255,0.4)', background: 'linear-gradient(135deg, rgba(108,99,255,0.05), rgba(0,212,170,0.03))' },
  upiHead:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  upiTitle:   { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 },
  upiSub:     { fontSize: 13, color: 'var(--text-muted)', maxWidth: 480 },
  upiSet:     { background: 'rgba(0,212,170,0.15)', color: 'var(--success)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  appRow:     { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  appChip:    { fontSize: 12, padding: '5px 12px', borderRadius: 8, color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 },
  upiRow:     { display: 'flex', gap: 10 },
  upiPreview: { marginTop: 8, fontSize: 12 },
  upiLink:    { color: 'var(--accent-bright)', fontFamily: 'monospace', fontSize: 12 },
  upiWarn:    { marginTop: 12, background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--warning)' },
  card:       { padding: 28, marginBottom: 20 },
  secTitle:   { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 20 },
  form:       { display: 'flex', flexDirection: 'column', gap: 16 },
  row2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  stat:       { textAlign: 'center', padding: '16px 0' },
};
