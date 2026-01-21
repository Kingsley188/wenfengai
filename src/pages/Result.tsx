import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';

interface Notebook {
  id: string;
  title: string;
  status: string;
  result_pdf_url: string | null;
}

interface TaskStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result_url: string | null;
  error: string | null;
}

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const taskId = searchParams.get('task_id');
  const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchNotebook();
    }
  }, [user, id]);

  // 轮询任务状态
  const pollTaskStatus = useCallback(async () => {
    if (!taskId) return;

    try {
      const res = await api.get(`/status/${taskId}`);
      const data: TaskStatus = res.data;
      setTaskStatus(data);

      if (data.status === 'completed' && data.result_url) {
        // 生成完成，设置 PDF URL
        setPdfUrl(`${apiUrl}${data.result_url}`);

        // 生成完成，设置 PDF URL
        setPdfUrl(`${apiUrl}${data.result_url}`);
      }
    } catch (error) {
      console.error('轮询状态失败:', error);
    }
  }, [taskId, apiUrl, id]);

  useEffect(() => {
    if (taskId && (!taskStatus || taskStatus.status === 'pending' || taskStatus.status === 'processing')) {
      // 每 3 秒轮询一次
      const interval = setInterval(pollTaskStatus, 3000);
      pollTaskStatus(); // 立即执行一次
      return () => clearInterval(interval);
    }
  }, [taskId, taskStatus?.status, pollTaskStatus]);

  const fetchNotebook = async () => {
    try {
      const res = await api.get(`/status/${id}`);
      const data = res.data;

      setNotebook({
        id: data.task_id,
        title: data.title,
        status: data.status,
        result_pdf_url: data.result_url && data.result_url.startsWith('http') ? data.result_url : (data.result_url ? `${apiUrl}${data.result_url}` : null)
      });

      if (data.result_url) {
        setPdfUrl(data.result_url.startsWith('http') ? data.result_url : `${apiUrl}${data.result_url}`);
      }
    } catch (error) {
      console.error('Error fetching notebook:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setRegenerating(true);
    navigate(`/notebook/${id}`);
  };

  const handleDownload = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  // 计算进度步骤状态
  const getStepStatus = (stepProgress: number) => {
    const progress = taskStatus?.progress || 0;
    if (progress >= stepProgress) return 'completed';
    if (progress >= stepProgress - 20) return 'active';
    return 'pending';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // 生成中状态
  if (taskStatus && (taskStatus.status === 'pending' || taskStatus.status === 'processing')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-24 h-24 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto mb-8">
            <Sparkles className="w-12 h-12 text-accent animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold mb-4">AI 正在生成您的 PPT</h1>
          <p className="text-muted-foreground mb-6">
            请稍候，NotebookLM 正在分析您的资料并生成专业的演示文稿...
          </p>

          {/* 进度条 */}
          <div className="mb-8">
            <Progress value={taskStatus.progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">{taskStatus.progress}%</p>
          </div>

          {/* 步骤列表 */}
          <div className="space-y-3 text-left">
            <div className={`flex items-center gap-3 text-sm ${getStepStatus(20) === 'completed' ? 'text-foreground' : 'text-muted-foreground'}`}>
              {getStepStatus(20) === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : getStepStatus(20) === 'active' ? (
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
              )}
              <span>创建 NotebookLM 笔记本</span>
            </div>
            <div className={`flex items-center gap-3 text-sm ${getStepStatus(50) === 'completed' ? 'text-foreground' : 'text-muted-foreground'}`}>
              {getStepStatus(50) === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : getStepStatus(50) === 'active' ? (
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
              )}
              <span>上传并分析文档</span>
            </div>
            <div className={`flex items-center gap-3 text-sm ${getStepStatus(70) === 'completed' ? 'text-foreground' : 'text-muted-foreground'}`}>
              {getStepStatus(70) === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : getStepStatus(70) === 'active' ? (
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
              )}
              <span>生成 Slide Deck</span>
            </div>
            <div className={`flex items-center gap-3 text-sm ${getStepStatus(100) === 'completed' ? 'text-foreground' : 'text-muted-foreground'}`}>
              {getStepStatus(100) === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : getStepStatus(100) === 'active' ? (
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
              )}
              <span>下载 PDF</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-8">
            生成过程通常需要 5-15 分钟，请耐心等待
          </p>
        </div>
      </div>
    );
  }

  // 失败状态
  if (taskStatus?.status === 'failed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-24 h-24 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto mb-8">
            <XCircle className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-4">生成失败</h1>
          <p className="text-muted-foreground mb-6">
            {taskStatus.error || '生成过程中遇到了问题，请重试'}
          </p>
          <Button onClick={handleRegenerate} className="bg-accent hover:bg-accent/90">
            <RefreshCw className="w-4 h-4 mr-2" />
            重新生成
          </Button>
        </div>
      </div>
    );
  }

  // 完成状态 - 显示 PDF
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/notebook/${id}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">{notebook?.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="rounded-xl"
          >
            {regenerating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            重新生成
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!pdfUrl}
            className="rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Download className="w-4 h-4 mr-2" />
            下载 PDF
          </Button>
        </div>
      </header>

      {/* PDF Preview */}
      <div className="flex-1 bg-secondary/30 p-4" style={{ minHeight: 'calc(100vh - 64px)' }}>
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full rounded-lg border border-border bg-white"
            style={{ height: 'calc(100vh - 96px)' }}
            title="PDF Preview"
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">暂无 PDF 预览</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
