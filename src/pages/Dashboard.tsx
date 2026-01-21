import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import {
  Plus,
  FileText,
  Clock,
  Sparkles,
  Loader2,
  Trash2,
  MoreVertical,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface Notebook {
  id: string; // This will map from task_id or PPT.id
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// Convert backend TaskStatus to frontend Notebook interface
const mapTaskToNotebook = (task: any): Notebook => ({
  id: task.id,
  title: task.title,
  description: task.error_message || null,
  status: task.status,
  created_at: task.created_at,
  updated_at: task.updated_at
});

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [nbConnected, setNbConnected] = useState<boolean | null>(null);
  const [accountInfo, setAccountInfo] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchNotebooks(),
      fetchNbStatus()
    ]);
    setLoading(false);
  };

  const fetchNbStatus = async () => {
    try {
      const res = await api.get('/auth/notebooklm/status');
      setNbConnected(res.data.is_connected);
      setAccountInfo(res.data.account_info);
    } catch (err) {
      console.error('Error fetching nb status:', err);
    }
  };

  const fetchNotebooks = async () => {
    try {
      const res = await api.get('/tasks');
      const mapped = res.data.map(mapTaskToNotebook);
      setNotebooks(mapped);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
      toast({
        title: '获取数据失败',
        description: '无法加载任务列表',
        variant: 'destructive',
      });
    }
  };

  const handleLinkNotebookLM = async () => {
    setLinking(true);
    try {
      await api.post('/auth/notebooklm/login');
      toast({
        title: '正在启动 Google 登录',
        description: '请在本地弹出的浏览器窗口中完成 Google 登录。',
      });

      // Poll for status or just wait
      const checkStatus = setInterval(async () => {
        const res = await api.get('/auth/notebooklm/status');
        if (res.data.is_connected) {
          setNbConnected(true);
          setLinking(false);
          clearInterval(checkStatus);
          toast({
            title: 'NotebookLM 已连接',
            description: '现在您可以开始生成 PPT 了。',
          });
        }
      }, 5000);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkStatus);
        setLinking(false);
      }, 120000);

    } catch (err) {
      setLinking(false);
      toast({
        title: '启动失败',
        description: '无法调用登录指令',
        variant: 'destructive',
      });
    }
  };

  const createNotebook = async () => {
    if (!user) return;
    setCreating(true);
    // Navigate to create page or show dialog
    // For now, let's assume we navigate to a creation wizard or just use a placeholder
    // Currently backend creates task only via upload. 
    // We might need to adjust this flow.
    // Let's redirect to a new "upload" page or reuse the landing logic? 
    // Actually, let's just create a placeholder entry via API if we support it, 
    // BUT the backend `generate_slides` expects files.

    // TEMPORARY FIX: Redirect to landing page to upload files
    navigate('/notebook/new');
    setCreating(false);
  };

  const deleteNotebook = async (id: string) => {
    // Backend doesn't support delete yet in the code I wrote.
    // Implement or mock it.
    toast({
      title: '功能开发中',
      description: '暂不支持删除任务',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-secondary text-secondary-foreground',
      processing: 'bg-accent/20 text-accent',
      completed: 'bg-success/20 text-success',
      failed: 'bg-destructive/20 text-destructive',
    };
    const labels = {
      pending: '排队中',
      processing: '生成中',
      completed: '已完成',
      failed: '失败',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">我的创作</h1>
                {nbConnected !== null && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${nbConnected ? 'bg-success/10 text-success border-success/20' : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${nbConnected ? 'bg-success animate-pulse' : 'bg-amber-500'}`} />
                    NotebookLM {nbConnected ? (accountInfo || '已连接') : '未连接'}
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">管理您的 PPT 生成任务</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleLinkNotebookLM}
                disabled={linking}
                className="rounded-xl border-border hover:bg-secondary"
              >
                {linking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {nbConnected ? "重新连接 Google" : "连接 Google"}
              </Button>
              <Button
                onClick={createNotebook}
                disabled={creating}
                className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                新建任务
              </Button>
            </div>
          </div>

          {/* NotebookLM Connection Banner - Only show if definitely disconnected */}
          {nbConnected === false && (
            <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4 text-amber-900">
                <div className="w-12 h-12 rounded-2xl bg-amber-200/50 flex items-center justify-center text-amber-700">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">重要：未连接 NotebookLM</h3>
                  <p className="text-sm opacity-90 leading-relaxed">
                    AI 核心引擎需要链接您的 Google 账号。请点击右侧按钮在本地完成。
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLinkNotebookLM}
                disabled={linking}
                size="lg"
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-8 font-semibold"
              >
                {linking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {linking ? "启动中..." : "立即连接"}
              </Button>
            </div>
          )}

          {/* Featured Section */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <h2 className="font-semibold">快速开始</h2>
            </div>
            <div
              onClick={createNotebook}
              className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl p-8 border border-accent/20 cursor-pointer hover-lift group"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                  <Plus className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">开始新的 PPT 生成</h3>
                  <p className="text-muted-foreground">上传资料，让 AI 帮您生成专业演示文稿</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notebooks Grid */}
          {notebooks.length > 0 ? (
            <div>
              <h2 className="font-semibold mb-4">任务列表</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {notebooks.map((notebook) => (
                  <div
                    key={notebook.id}
                    className="bg-card rounded-2xl p-6 border border-border/50 hover-lift cursor-pointer group relative"
                    onClick={() => {
                      if (notebook.status === 'completed') {
                        navigate(`/notebook/${notebook.id}/result`);
                      } else {
                        navigate(`/notebook/${notebook.id}`);
                      }
                    }}
                  >
                    <div className="absolute top-4 right-4">

                    </div>

                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>

                    <h3 className="font-semibold mb-2 pr-8">{notebook.title}</h3>

                    {notebook.description && (
                      <p className="text-destructive text-sm mb-4 line-clamp-2">
                        {notebook.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(notebook.updated_at)}
                      </div>
                      {getStatusBadge(notebook.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">还没有任务</h3>
              <p className="text-muted-foreground mb-6">创建您的第一个任务，开始 AI 智能创作</p>
              <Button
                onClick={createNotebook}
                disabled={creating}
                className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                新建任务
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
