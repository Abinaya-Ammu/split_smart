import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!form.name.trim())          e.name     = 'Name is required';
    if (!form.email.trim())         e.email    = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.password)             e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Min 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // Send ONLY what backend expects: name, email, password, phone(optional)
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      toast.success('Account created! Welcome 🎉');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      toast.error(msg);
      if (msg.toLowerCase().includes('email')) setErrors({ email: msg });
    } finally { setLoading(false); }
  };

  const field = (key, label, type='text', placeholder='') => (
    <div className="input-group">
      <label>{label}</label>
      <input className="input" type={type} placeholder={placeholder}
        value={form[key]} onChange={e => { setForm({...form,[key]:e.target.value}); setErrors({...errors,[key]:''}); }}
        style={errors[key]?{borderColor:'var(--danger)'}:{}} />
      {errors[key] && <div style={S.errMsg}>{errors[key]}</div>}
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.orb1}/><div style={S.orb2}/>
      <div style={S.container} className="animate-fadeUp">
        <div style={S.logoArea}>
          <div style={S.logoIcon}>S</div>
          <h1 style={S.logoText}>SplitSmart</h1>
          <p style={S.tagline}>Join thousands splitting smarter</p>
        </div>
        <div style={S.card}>
          <h2 style={S.title}>Create account</h2>
          <p style={S.subtitle}>Get started for free — no credit card needed</p>
          <form onSubmit={handleSubmit} style={S.form}>
            {field('name',    'Full name',       'text',     'Abinaya')}
            {field('email',   'Email address',   'email',    'you@example.com')}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
              {field('password', 'Password',     'password', '••••••')}
              {field('confirm',  'Confirm',      'password', '••••••')}
            </div>
            <button type="submit" className="btn btn-primary" style={S.submitBtn} disabled={loading}>
              {loading ? 'Creating...' : 'Create account →'}
            </button>
          </form>
          <div style={S.footer}>Already have an account? <Link to="/login" style={S.link}>Sign in</Link></div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page:      { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', padding:24 },
  orb1:      { position:'fixed', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)', top:'-100px', left:'-100px', pointerEvents:'none' },
  orb2:      { position:'fixed', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)', bottom:'-50px', right:'-50px', pointerEvents:'none' },
  container: { width:'100%', maxWidth:440, display:'flex', flexDirection:'column', alignItems:'center', gap:24 },
  logoArea:  { display:'flex', flexDirection:'column', alignItems:'center', gap:8 },
  logoIcon:  { width:52, height:52, borderRadius:16, background:'linear-gradient(135deg, var(--accent), #9b93ff)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:28, color:'white', boxShadow:'0 8px 32px rgba(108,99,255,0.4)' },
  logoText:  { fontFamily:'var(--font-display)', fontWeight:800, fontSize:26, color:'var(--text-primary)', letterSpacing:'-0.5px' },
  tagline:   { fontSize:14, color:'var(--text-muted)' },
  card:      { width:'100%', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:32 },
  title:     { fontFamily:'var(--font-display)', fontWeight:700, fontSize:22, color:'var(--text-primary)', marginBottom:4 },
  subtitle:  { fontSize:14, color:'var(--text-muted)', marginBottom:24 },
  form:      { display:'flex', flexDirection:'column', gap:16 },
  submitBtn: { width:'100%', justifyContent:'center', padding:'13px', fontSize:15, marginTop:4 },
  footer:    { marginTop:20, textAlign:'center', fontSize:14, color:'var(--text-muted)' },
  link:      { color:'var(--accent-bright)', textDecoration:'none', fontWeight:600 },
  errMsg:    { fontSize:12, color:'var(--danger)', marginTop:4 },
};
