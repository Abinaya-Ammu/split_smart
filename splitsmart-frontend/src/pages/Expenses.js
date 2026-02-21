import React, { useState, useEffect } from 'react';
import { expenseAPI, groupAPI } from '../services/api';
import toast from 'react-hot-toast';

const splitTypes = ['EQUAL', 'PERCENTAGE', 'CUSTOM', 'INDIVIDUAL'];
const categories = ['FOOD', 'TRANSPORT', 'ACCOMMODATION', 'ENTERTAINMENT', 'SHOPPING', 'UTILITIES', 'OTHER'];
const catEmoji = { FOOD: '🍽️', TRANSPORT: '🚗', ACCOMMODATION: '🏨', ENTERTAINMENT: '🎮', SHOPPING: '🛍️', UTILITIES: '💡', OTHER: '◎' };

export default function Expenses() {
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', category: 'FOOD', splitType: 'EQUAL' });

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { if (selectedGroup) loadExpenses(selectedGroup); }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const data = await groupAPI.getAll();
      const list = Array.isArray(data) ? data : (data?.content || mockGroups);
      setGroups(list);
      if (list.length > 0) setSelectedGroup(list[0].id);
    } catch {
      setGroups(mockGroups);
      setSelectedGroup(mockGroups[0].id);
    }
  };

  const loadExpenses = async (groupId) => {
    setLoading(true);
    try {
      const data = await expenseAPI.getByGroup(groupId);
      const list = Array.isArray(data) ? data : (data?.content || []);
      setExpenses(list.length > 0 ? list : mockExpenses);
    } catch {
      setExpenses(mockExpenses);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await expenseAPI.create({
        ...form,
        groupId: selectedGroup,
        amount: parseFloat(form.amount),
      });
      toast.success('Expense added! ✓');
      setShowAdd(false);
      setForm({ description: '', amount: '', category: 'FOOD', splitType: 'EQUAL' });
      loadExpenses(selectedGroup);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add expense');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Expenses</h1>
          <p style={styles.subtitle}>Track and manage group spending</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Expense</button>
      </div>

      <div style={styles.tabs}>
        {groups.map(g => (
          <button key={g.id}
            style={{ ...styles.tab, ...(selectedGroup === g.id ? styles.tabActive : {}) }}
            onClick={() => setSelectedGroup(g.id)}>
            {g.name}
          </button>
        ))}
      </div>

      {showAdd && (
        <div style={styles.modalOverlay} onClick={() => setShowAdd(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()} className="animate-fadeUp">
            <h2 style={styles.modalTitle}>Add Expense</h2>
            <form onSubmit={handleAdd} style={styles.form}>
              <div className="input-group">
                <label>Description</label>
                <input className="input" placeholder="Dinner at Barbeque Nation" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="input-group">
                  <label>Amount (₹)</label>
                  <input className="input" type="number" placeholder="0.00" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} required min="0" step="0.01" />
                </div>
                <div className="input-group">
                  <label>Category</label>
                  <select className="input" value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}>
                    {categories.map(c => <option key={c} value={c}>{catEmoji[c]} {c}</option>)}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>Split Type</label>
                <div style={styles.splitGrid}>
                  {splitTypes.map(t => (
                    <button key={t} type="button"
                      style={{ ...styles.splitBtn, ...(form.splitType === t ? styles.splitBtnActive : {}) }}
                      onClick={() => setForm({ ...form, splitType: t })}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.modalActions}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={styles.list}>
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)
        ) : expenses.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40, color: 'var(--text-muted)' }}>◎</div>
            <h3 style={styles.emptyTitle}>No expenses yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Add your first expense to this group</p>
          </div>
        ) : expenses.map((exp, i) => (
          <div key={exp.id || i} className="card" style={styles.expenseRow}>
            <div style={styles.expLeft}>
              <div style={styles.catIcon}>{catEmoji[exp.category] || '◎'}</div>
              <div>
                <div style={styles.expName}>{exp.description}</div>
                <div style={styles.expMeta}>
                  Paid by{' '}
                  <span style={{ color: 'var(--accent-bright)' }}>{exp.paidBy?.name || 'You'}</span>
                  {' · '}{new Date(exp.expenseDate || exp.createdAt || Date.now()).toLocaleDateString('en-IN')}
                  {' · '}<span className="badge badge-accent" style={{ fontSize: 10, padding: '2px 6px' }}>{exp.splitType || 'EQUAL'}</span>
                </div>
              </div>
            </div>
            <div style={styles.expRight}>
              <div style={styles.expAmount}>₹{Number(exp.amount || 0).toLocaleString()}</div>
              {exp.yourShare != null && (
                <div style={styles.yourShare}>Your share: ₹{Number(exp.yourShare).toLocaleString()}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const mockGroups = [{ id: 1, name: 'Goa Trip' }, { id: 2, name: 'Flat' }];
const mockExpenses = [
  { id: 1, description: 'Hotel Booking', amount: 18000, category: 'ACCOMMODATION', splitType: 'EQUAL', paidBy: { name: 'Abinaya' }, yourShare: 4500 },
  { id: 2, description: 'Beach Dinner', amount: 3200, category: 'FOOD', splitType: 'EQUAL', paidBy: { name: 'Priya' }, yourShare: 800 },
  { id: 3, description: 'Cab to Airport', amount: 1500, category: 'TRANSPORT', splitType: 'CUSTOM', paidBy: { name: 'Rahul' }, yourShare: 375 },
  { id: 4, description: 'Water Sports', amount: 6000, category: 'ENTERTAINMENT', splitType: 'EQUAL', paidBy: { name: 'Abinaya' }, yourShare: 1500 },
];

const styles = {
  page: { padding: 32, maxWidth: 1200, animation: 'fadeUp 0.4s ease' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--text-primary)', marginBottom: 4 },
  subtitle: { color: 'var(--text-muted)', fontSize: 14 },
  tabs: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  tab: { padding: '8px 18px', borderRadius: 20, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', transition: 'all 0.15s' },
  tabActive: { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent-bright)' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  expenseRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' },
  expLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  catIcon: { fontSize: 24, width: 48, height: 48, borderRadius: 12, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  expName: { fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 },
  expMeta: { fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  expRight: { textAlign: 'right', flexShrink: 0 },
  expAmount: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' },
  yourShare: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modal: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, width: '100%', maxWidth: 500 },
  modalTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  splitGrid: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  splitBtn: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'all 0.15s' },
  splitBtnActive: { background: 'var(--accent-dim)', borderColor: 'var(--accent)', color: 'var(--accent-bright)' },
  modalActions: { display: 'flex', gap: 12, justifyContent: 'flex-end' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 0', textAlign: 'center' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' },
};
