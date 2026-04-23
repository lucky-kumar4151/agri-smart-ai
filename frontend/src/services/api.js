import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleLogin: (data) => api.post('/auth/google-login', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const chatAPI = {
  sendMessage: (data) => api.post('/chat/query', data),
  sendMessageWithImage: (message, language, file) => {
    const formData = new FormData();
    formData.append('message', message || '');
    formData.append('language', language || 'en');
    formData.append('file', file);
    return uploadApi.post('/chat/query-with-image', formData);
  },
  getHistory: (limit = 50) => api.get(`/chat/history?limit=${limit}`),
  clearHistory: () => api.delete('/chat/history'),
};


// Separate upload instance — no Content-Type default so browser sets multipart boundary correctly
const uploadApi = axios.create({
  baseURL: API_BASE,
  timeout: 90000,
});
uploadApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const predictAPI = {
  cropRecommendation: (data) => api.post('/predict/crop', data),
  diseaseDetection: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // Use the upload instance (no JSON Content-Type) so multipart boundary is auto-set
    return uploadApi.post('/predict/disease', formData);
  },
  getHistory: (type, limit = 20) =>
    api.get(`/predict/history?${type ? `prediction_type=${type}&` : ''}limit=${limit}`),
};



export const weatherAPI = {
  getCurrent: (city) => api.get(`/weather?city=${city}`),
  getForecast: (city) => api.get(`/weather/forecast?city=${city}`),
  getByLocation: (lat, lon) => api.get(`/weather/bylocation?lat=${lat}&lon=${lon}`),
};

export const marketAPI = {
  getPrices: (crop, state) => {
    const params = new URLSearchParams();
    if (crop) params.append('crop', crop);
    if (state) params.append('state', state);
    return api.get(`/market-prices?${params.toString()}`);
  },
  getTrends: (crop) => api.get(`/market-prices/trends?crop=${crop}`),
};

export const govPoliciesAPI = {
  getAll: (category) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    return api.get(`/gov-policies?${params.toString()}`);
  },
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: (days = 30) => api.get(`/dashboard/activity?days=${days}`),
  getSearchHistory: (type, limit = 50) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    params.append('limit', limit);
    return api.get(`/dashboard/search-history?${params.toString()}`);
  },
  deleteHistoryItem: (id) => api.delete(`/dashboard/search-history/${id}`),
  clearHistory: () => api.delete('/dashboard/search-history'),
  getAnalytics: () => api.get('/dashboard/analytics'),
  getAdminStats: () => api.get('/dashboard/admin/stats'),
  getAdminUsers: () => api.get('/dashboard/admin/users'),
};

export const feedbackAPI = {
  submit: (data) => api.post('/feedback', data),
  getAll: (limit = 50) => api.get(`/feedback?limit=${limit}`),
};

export const healthAPI = {
  check: () => api.get('/health'),
};

export const communityAPI = {
  getPosts: (limit = 30) => api.get(`/community/posts?limit=${limit}`),
  createPost: (data) => api.post('/community/posts', data),
  replyToPost: (postId, data) => api.post(`/community/posts/${postId}/reply`, data),
  deletePost: (postId) => api.delete(`/community/posts/${postId}`),
};

export const expertGuidelinesAPI = {
  getAll:    ()           => api.get('/expert-guidelines/'),
  getDetail: (id)         => api.get(`/expert-guidelines/${id}`),
  search:    (query)      => api.get(`/expert-guidelines/search/${encodeURIComponent(query)}`),
};

export default api;
