import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  FileText, 
  Clock, 
  Sparkles, 
  Loader2,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface Notebook {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchNotebooks();
    }
  }, [user]);

  const fetchNotebooks = async () => {
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotebooks(data || []);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNotebook = async () => {
    if (!user) return;
    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('notebooks')
        .insert({
          user_id: user.id,
          title: '未命名笔记本',
        })
        .select()
        .single();

      if (error) throw error;
      navigate(`/notebook/${data.id}`);
    } catch (error) {
      console.error('Error creating notebook:', error);
      toast({
        title: '创建失败',
        description: '无法创建笔记本，请重试',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteNotebook = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notebooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotebooks(notebooks.filter(n => n.id !== id));
      toast({
        title: '删除成功',
        description: '笔记本已删除',
      });
    } catch (error) {
      console.error('Error deleting notebook:', error);
      toast({
        title: '删除失败',
        description: '无法删除笔记本，请重试',
        variant: 'destructive',
      });
    }
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
      draft: 'bg-secondary text-secondary-foreground',
      generating: 'bg-accent/20 text-accent',
      completed: 'bg-success/20 text-success',
    };
    const labels = {
      draft: '草稿',
      generating: '生成中',
      completed: '已完成',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
        {labels[status as keyof typeof labels] || '草稿'}
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
              <h1 className="text-3xl font-bold mb-2">我的笔记本</h1>
              <p className="text-muted-foreground">管理您的 PPT 创作项目</p>
            </div>
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
              新建笔记本
            </Button>
          </div>

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
                  <h3 className="text-xl font-semibold mb-1">创建新的 PPT</h3>
                  <p className="text-muted-foreground">上传资料，让 AI 帮您生成专业演示文稿</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notebooks Grid */}
          {notebooks.length > 0 ? (
            <div>
              <h2 className="font-semibold mb-4">所有笔记本</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {notebooks.map((notebook) => (
                  <div
                    key={notebook.id}
                    className="bg-card rounded-2xl p-6 border border-border/50 hover-lift cursor-pointer group relative"
                    onClick={() => navigate(`/notebook/${notebook.id}`)}
                  >
                    <div className="absolute top-4 right-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotebook(notebook.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    
                    <h3 className="font-semibold mb-2 pr-8">{notebook.title}</h3>
                    
                    {notebook.description && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
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
              <h3 className="text-xl font-semibold mb-2">还没有笔记本</h3>
              <p className="text-muted-foreground mb-6">创建您的第一个笔记本，开始 AI 智能创作</p>
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
                新建笔记本
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
