import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// 演示模式配置 - 当 Supabase 不可用时自动启用
const DEMO_MODE = true; // 设置为 true 绕过登录

// 演示用户
const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@wenfeng.ai',
  app_metadata: {},
  user_metadata: { display_name: '演示用户' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

const DEMO_SESSION: Session = {
  access_token: 'demo-token',
  refresh_token: 'demo-refresh',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: DEMO_USER,
} as Session;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(DEMO_MODE);

  useEffect(() => {
    // 如果启用演示模式，直接使用演示用户
    if (DEMO_MODE) {
      console.log('🎭 演示模式已启用 - 跳过 Supabase 登录');
      setUser(DEMO_USER);
      setSession(DEMO_SESSION);
      setLoading(false);
      return;
    }

    // 正常的 Supabase 认证流程
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Supabase 连接失败，启用演示模式:', error);
      setUser(DEMO_USER);
      setSession(DEMO_SESSION);
      setIsDemoMode(true);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (isDemoMode) {
      // 演示模式直接"登录"
      setUser(DEMO_USER);
      setSession(DEMO_SESSION);
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (isDemoMode) {
      // 演示模式直接"登录"
      setUser(DEMO_USER);
      setSession(DEMO_SESSION);
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (isDemoMode) {
      // 演示模式不做任何事
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

