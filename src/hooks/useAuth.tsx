
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (username: string, password: string, email?: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (token: string) => {
    try {
      // 设置 Token 到请求头 (api.ts 中也有拦截器，这里是双重保障或初始化)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user", err);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const res = await api.post('/auth/token', formData);
      const token = res.data.access_token;

      localStorage.setItem('token', token);
      await fetchUser(token);
      return { error: null };
    } catch (err: any) {
      return { error: err.response?.data?.detail || err.message };
    }
  };

  const signUp = async (username: string, password: string, email: string = "") => {
    try {
      await api.post('/auth/register', { username, password, email });
      // 注册成功后自动登录
      return signIn(username, password);
    } catch (err: any) {
      return { error: err.response?.data?.detail || err.message };
    }
  };

  const signOut = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
