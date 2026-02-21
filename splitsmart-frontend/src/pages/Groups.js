import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupAPI, errMsg } from '../services/api';
import toast from 'react-hot-toast';

const TYPE_META = {
  GENERAL: { emoji:'◎',  label:'General' },
  TRIP:    { emoji:'✈️', label:'Trip'    },
  HOME:    { emoji:'🏠', label:'Home'    },
  FOOD:    { emoji:'🍽️', label:'Food'    },
  WORK:    { emoji:'💼', label:'Work'    },
  OTHER:   { emoji:'📦', label:'Other'   },
};

export default function Groups() {
  const [groups, setGroups]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [form, setForm]             = useState({ name: '', description: '', type: 'GENERAL' });
  const [formErr, setFormErr]       = useState('');
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await groupAPI.getAll();
    setGroups(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const openCreate = () => {
    setForm({ name: '', description: '', type: 'GENERAL' });
    setFormErr('');
    setShowCreate(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormErr('Group name is required'); return; }
    setCreating(true);
    setFormErr('');
    try {
      await groupAPI.create({
        name:        form.name.trim(),
        description: form.description.trim() || null,
        type:        form.type,
        icon:        TYPE_META[form.type]?.emoji || '◎',
        themeColor:  '#6c63ff',
      });
      toast.success('Group created! 🎉');
      setShowCreate(false);
      load();
    } catch (err) {
      const msg = errMsg(err);
      setFormErr(msg);
      toast.error(msg);
    } finally { setCreating(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Groups</h1>
          <p style={S.sub}>{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Group</button>
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div style={S.overlay} onClick={() => setShowCreate(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Create Group</h2>
            <form onSubmit={handleCreate} style={S.form}>
              <div className="input-group">
                <label>Group Name *</label>
                <input className="input" placeholder="e.g. Goa Trip 2025" autoFocus
                  value={form.name}
                  onChange={e => { setForm({ ...form, name: e.target.value }); setFormErr(''); }}
                  style={formErr ? { borderColor: 'var(--danger)' } : {}} />
              </div>
              <div className="input-group">
                <label>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input className="input" placeholder="What's this group for?"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Type</label>
                <div style={S.typeGrid}>
                  {Object.entries(TYPE_META).map(([t, m]) => (
                    <button key={t} type="button"
                      style={{ ...S.typeBtn, ...(form.type === t ? S.typeBtnActive : {}) }}
                      onClick={() => setForm({ ...form, type: t })}>
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {formErr && <div style={S.errBox}>⚠ {formErr}</div>}
              <div style={S.actions}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Group →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      {loading ? (
        <div style={S.grid}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}
        </div>
      ) : groups.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: 52 }}>◈</div>
          <h3 style={S.emptyTitle}>No groups yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Create your first group to start splitting</p>
          <button className="btn btn-primary" onClick={openCreate}>+ Create First Group</button>
        </div>
      ) : (
        <div style={S.grid}>
          {groups.map(g => (
            <div key={g.id} className="card" style={S.card} onClick={() => navigate(`/groups/${g.id}`)}>
              <div style={S.cardTop}>
                <span style={{ fontSize: 28 }}>{TYPE_META[g.type]?.emoji || '◎'}</span>
                <span className="badge badge-accent" style={{ fontSize: 11 }}>{g.type || 'GENERAL'}</span>
              </div>
              <h3 style={S.cardName}>{g.name}</h3>
              <p style={S.cardDesc}>{g.description || 'No description'}</p>
              {g.createdByName && (
                <div style={S.creator}>✦ Created by <b>{g.createdByName}</b></div>
              )}
              <div style={S.cardFoot}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  👥 {g.memberCount || 1} member{(g.memberCount || 1) !== 1 ? 's' : ''}
                </span>
                <span style={S.code}>#{g.inviteCode}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const S = {
  page:      { padding: 32, maxWidth: 1100, animation: 'fadeUp 0.4s ease' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  title:     { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 },
  sub:       { color: 'var(--text-muted)', fontSize: 14 },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 },
  card:      { cursor: 'pointer', padding: 22 },
  cardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardName:  { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 6 },
  cardDesc:  { fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 },
  cardFoot:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  creator:   { fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 },
  code:      { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 6 },
  empty:     { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', textAlign: 'center' },
  emptyTitle:{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 },
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modal:     { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 460 },
  modalTitle:{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', marginBottom: 20 },
  form:      { display: 'flex', flexDirection: 'column', gap: 18 },
  typeGrid:  { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  typeBtn:   { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', transition: 'all 0.15s' },
  typeBtnActive: { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent-bright)' },
  errBox:    { background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)' },
  actions:   { display: 'flex', gap: 10, justifyContent: 'flex-end' },
};
