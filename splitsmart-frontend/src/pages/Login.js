import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm]     = useState({ email:'', password:'' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!form.email.trim())   e.email    = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.password)       e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      toast.success('Welcome back! 👋');
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message || err.message || 'Login failed';
      if (status === 401 || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials') || msg.toLowerCase().includes('password')) {
        setErrors({ password: 'Invalid email or password' });
        toast.error('Invalid email or password');
      } else if (status === 404 || msg.toLowerCase().includes('not found')) {
        setErrors({ email: 'No account found with this email' });
        toast.error('No account found. Please register first.');
      } else {
        toast.error(msg);
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.orb1}/><div style={S.orb2}/>
      <div style={S.container} className="animate-fadeUp">
        <div style={S.logoArea}>
          <div style={S.logoIcon}>S</div>
          <h1 style={S.logoText}>SplitSmart</h1>
          <p style={S.tagline}>Split expenses, not friendships</p>
        </div>
        <div style={S.card}>
          <h2 style={S.title}>Sign in</h2>
          <p style={S.subtitle}>Enter your credentials to continue</p>
          <form onSubmit={handleSubmit} style={S.form}>
            <div className="input-group">
              <label>Email address</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email}
                onChange={e=>{ setForm({...form,email:e.target.value}); setErrors({...errors,email:''}); }}
                style={errors.email?{borderColor:'var(--danger)'}:{}} />
              {errors.email && <div style={S.err}>{errors.email}</div>}
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="input" type="password" placeholder="••••••••"
                value={form.password}
                onChange={e=>{ setForm({...form,password:e.target.value}); setErrors({...errors,password:''}); }}
                style={errors.password?{borderColor:'var(--danger)'}:{}} />
              {errors.password && <div style={S.err}>{errors.password}</div>}
            </div>
            <button type="submit" className="btn btn-primary" style={S.submitBtn} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
          <div style={S.footer}>Don't have an account? <Link to="/register" style={S.link}>Create one</Link></div>
        </div>
        <p style={S.hint}>✦ AI-powered expense splitting with smart settlements</p>
      </div>
    </div>
  );
}

const S = {
  page:      { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden', padding:24 },
  orb1:      { position:'fixed', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)', top:'-100px', left:'-100px', pointerEvents:'none' },
  orb2:      { position:'fixed', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)', bottom:'-50px', right:'-50px', pointerEvents:'none' },
  container: { width:'100%', maxWidth:420, display:'flex', flexDirection:'column', alignItems:'center', gap:24 },
  logoArea:  { display:'flex', flexDirection:'column', alignItems:'center', gap:8 },
  logoIcon:  { width:56, height:56, borderRadius:16, background:'linear-gradient(135deg, var(--accent), #9b93ff)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontWeight:800, fontSize:30, color:'white', boxShadow:'0 8px 32px rgba(108,99,255,0.4)', marginBottom:4 },
  logoText:  { fontFamily:'var(--font-display)', fontWeight:800, fontSize:28, color:'var(--text-primary)', letterSpacing:'-0.5px' },
  tagline:   { fontSize:14, color:'var(--text-muted)' },
  card:      { width:'100%', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:32 },
  title:     { fontFamily:'var(--font-display)', fontWeight:700, fontSize:22, color:'var(--text-primary)', marginBottom:4 },
  subtitle:  { fontSize:14, color:'var(--text-muted)', marginBottom:28 },
  form:      { display:'flex', flexDirection:'column', gap:18 },
  submitBtn: { width:'100%', justifyContent:'center', padding:'13px', fontSize:15, marginTop:4 },
  footer:    { marginTop:20, textAlign:'center', fontSize:14, color:'var(--text-muted)' },
  link:      { color:'var(--accent-bright)', textDecoration:'none', fontWeight:600 },
  hint:      { fontSize:13, color:'var(--text-muted)', textAlign:'center' },
  err:       { fontSize:12, color:'var(--danger)', marginTop:4 },
};
