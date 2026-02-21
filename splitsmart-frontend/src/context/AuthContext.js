import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token    = localStorage.getItem('token');
    const userStr  = localStorage.getItem('user');
    if (token && userStr) {
      try { setUser(JSON.parse(userStr)); }
      catch { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  // Safely extract token and user from ANY response shape the backend sends
  const extractAuth = (response) => {
    console.log('Raw API response:', response);
    // Backend wraps: { success, message, data: { accessToken, user, ... } }
    // api.js unwrap() strips outer wrapper → we get { accessToken, refreshToken, user }
    const token = response?.accessToken || response?.data?.accessToken;
    const userData = response?.user || response?.data?.user;
    console.log('Extracted token:', token ? token.slice(0,20)+'...' : 'NONE');
    console.log('Extracted user:', userData);
    if (!token) throw new Error('Server returned no token. Check backend logs.');
    return { token, userData };
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token, userData } = extractAuth(response);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData || {}));
    setUser(userData || { email });
    return userData;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    const { token, userData } = extractAuth(response);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData || {}));
    setUser(userData || { email: data.email });
    return userData;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
