import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || '/api';

// Ensure API_URL ends with /api, as endpoints rely on it
const BASE_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

export const api = axios.create({
  baseURL: BASE_URL,
});

// 请求拦截器：添加 JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);
