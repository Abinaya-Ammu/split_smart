import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.clear(); window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

const unwrap = (res) => {
  const b = res.data;
  return (b && typeof b === 'object' && 'data' in b) ? b.data : b;
};

export const authAPI = {
  register: async (d) => unwrap(await API.post('/auth/register', d)),
  login:    async (d) => unwrap(await API.post('/auth/login', d)),
};

export const groupAPI = {
  getAll:      async ()         => { try { return unwrap(await API.get('/groups')) || []; }                                              catch { return []; } },
  getById:     async (id)       => unwrap(await API.get(`/groups/${id}`)),
  create:      async (d)        => unwrap(await API.post('/groups', d)),
  addMember:   async (gId, uId) => unwrap(await API.post(`/groups/${gId}/members?userId=${uId}`)),
  getMembers:  async (id)       => { try { return unwrap(await API.get(`/groups/${id}/members`)) || []; }                               catch { return []; } },
  searchUsers: async (q)        => { try { return unwrap(await API.get(`/groups/search-users?q=${encodeURIComponent(q)}`)) || []; }    catch { return []; } },
  joinByCode:  async (code)     => unwrap(await API.post(`/groups/join/${code}`)),
};

export const expenseAPI = {
  getByGroup: async (gId) => {
    try {
      const d = unwrap(await API.get(`/expenses/group/${gId}?page=0&size=50`));
      return Array.isArray(d) ? d : (d?.content || []);
    } catch { return []; }
  },
  create: async (d) => unwrap(await API.post('/expenses', d)),
};

export const settlementAPI = {
  getPending:   async ()    => { try { return unwrap(await API.get('/settlements/pending')) || []; }       catch { return []; } },
  getByGroup:   async (gId) => { try { return unwrap(await API.get(`/settlements/group/${gId}`)) || []; } catch { return []; } },
  settle:       async (id, paymentMethod, txId) =>
    unwrap(await API.post(`/settlements/${id}/settle`, { paymentMethod: paymentMethod || null, transactionId: txId || null })),
  sendReminder: async (id)  => unwrap(await API.post(`/settlements/${id}/remind`)),
};

export const notificationAPI = {
  getAll:         async ()    => { try { return unwrap(await API.get('/notifications')) || []; }               catch { return []; } },
  getUnreadCount: async ()    => { try { return unwrap(await API.get('/notifications/unread-count')) || 0; }  catch { return 0;  } },
  markAllRead:    async ()    => unwrap(await API.post('/notifications/mark-all-read')),
  markRead:       async (id)  => unwrap(await API.post(`/notifications/${id}/read`)),
};

export const userAPI = {
  getMe:         async ()       => { try { return unwrap(await API.get('/profile')); } catch { return null; } },
  updateProfile: async (d)      => unwrap(await API.patch('/profile', d)),
  updateUpi:     async (upiId)  => unwrap(await API.patch('/profile/upi', { upiId })),
};

export const aiAPI = {
  getInsights:    async ()    => { try { return unwrap(await API.get('/ai/insights')) || []; }        catch { return []; }   },
  triggerAnalyze: async ()    => { try { return unwrap(await API.post('/ai/analyze')); }              catch { return null; } },
  markRead:       async (id)  => { try { return unwrap(await API.patch(`/ai/insights/${id}/read`)); } catch {}              },
};

export const dashboardAPI = {
  get: async () => { try { return unwrap(await API.get('/dashboard')) || {}; } catch { return {}; } },
};

export const errMsg = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong';
