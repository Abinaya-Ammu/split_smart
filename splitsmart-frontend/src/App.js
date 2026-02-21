import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Settlements from './pages/Settlements';
import AIAssistant from './pages/AIAssistant';
import Profile from './pages/Profile';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={loadingStyle}><div style={spinner} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={loadingStyle}><div style={spinner} /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

const loadingStyle = { height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)' };
const spinner = { width:40, height:40, border:'3px solid var(--border)', borderTop:'3px solid var(--accent)', borderRadius:'50%', animation:'spin 1s linear infinite' };

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right"
          toastOptions={{
            style:{ background:'#16161f', color:'#f0f0ff', border:'1px solid #2a2a3a', fontFamily:'var(--font-body)', fontSize:14 },
            success:{ iconTheme:{ primary:'#00d4aa', secondary:'#16161f' } },
            error:{ iconTheme:{ primary:'#ff6b6b', secondary:'#16161f' } },
          }} />
        <style>{`
          @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
          @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
        `}</style>
        <Routes>
          <Route path="/login"       element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register"    element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/groups"      element={<ProtectedRoute><Groups /></ProtectedRoute>} />
          <Route path="/groups/:id"  element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
          <Route path="/settlements" element={<ProtectedRoute><Settlements /></ProtectedRoute>} />
          <Route path="/ai"          element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
          <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/"            element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
