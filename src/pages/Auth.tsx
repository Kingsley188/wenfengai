import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setIsSignUp(searchParams.get('mode') === 'signup');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // signUp(username, password, email)
        const { error } = await signUp(displayName, password, email);
        if (error) {
          toast({
            title: '注册失败',
            description: error.message || '请重试',
            variant: 'destructive',
          });
        } else {
          toast({
            title: '注册成功',
            description: '欢迎使用WinFlow！',
          });
          navigate('/dashboard');
        }
      } else {
        // signIn(username, password)
        const { error } = await signIn(displayName, password);
        if (error) {
          toast({
            title: '登录失败',
            description: '用户名或密码错误',
            variant: 'destructive',
          });
        } else {
          navigate('/dashboard');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
        <div className="max-w-md w-full mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-semibold text-xl">WinFlow</span>
          </div>

          <h1 className="text-3xl font-bold mb-2">
            {isSignUp ? '创建账户' : '欢迎回来'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isSignUp ? '开始您的智能创作之旅' : '登录以继续使用WinFlow'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="设置用户名"
                value={displayName} // repurposing 'displayName' state as 'username' to minimize diff
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="email">邮箱 (可选)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground text-lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                '创建账户'
              ) : (
                '登录'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-muted-foreground">
            {isSignUp ? '已有账户？' : '还没有账户？'}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 text-accent hover:underline font-medium"
            >
              {isSignUp ? '注册' : '登录'}
            </button>
          </p>
        </div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-32 h-32 rounded-3xl bg-accent/20 flex items-center justify-center mx-auto mb-8">
            <Sparkles className="w-16 h-16 text-accent" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            AI 驱动的创作体验
          </h2>
          <p className="text-primary-foreground/70 text-lg">
            上传资料，让 AI 帮您生成专业精美的演示文稿。
            告别繁琐排版，专注于内容本身。
          </p>
        </div>
      </div>
    </div>
  );
}
