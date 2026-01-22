import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Send,
  FileText,
  Image,
  Music,
  X,
  Loader2,
  Sparkles,
  Upload,
  File as FileIcon,
  Trash2,
  Eye,
  ListOrdered,
  RefreshCw,
} from 'lucide-react';

interface LocalFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface Notebook {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

interface OutlineItem {
  id: number;
  title: string;
  points: string[];
}

export default function NotebookPage() {
  const { id } = useParams<{ id: string }>();
  // If id is 'new', we are in create mode.
  // Actually dashboard navigates to /notebook/new? No, I set it to / for now.
  // But let's assume we use /notebook/new or just creating a new one.

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('未命名演示文稿');
  const [isDragging, setIsDragging] = useState(false);

  // Outline generation state
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modifyInput, setModifyInput] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      if (id !== 'new') {
        fetchNotebook();
        // Fetching files for existing notebook is complex because backend generate-slides 
        // doesn't store file metadata in a separate 'files' table for retrieval yet.
        // For this MVP, we might only support viewing status for existing notebooks.
      } else {
        setNotebook({
          id: 'new',
          title: '未命名演示文稿',
          description: null,
          status: 'draft'
        });
        setLoading(false);
      }
    }
  }, [user, id]);

  const fetchNotebook = async () => {
    try {
      const res = await api.get(`/status/${id}`);
      const data = res.data;
      setNotebook({
        id: data.task_id,
        title: data.title,
        description: data.error,
        status: data.status
      });
      setTitleInput(data.title);
      // If task is completed, maybe redirect to result?
      if (data.status === 'completed') {
        // Optional: redirect
      }
    } catch (error) {
      console.error('Error fetching notebook:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const updateTitle = () => {
    // For local draft, just update state
    if (notebook) {
      setNotebook({ ...notebook, title: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleFiles = (fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList).map(file => ({
      id: Math.random().toString(36).substring(7),
      file: file,
      previewUrl: URL.createObjectURL(file)
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const removeFile = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('audio/')) return Music;
    if (fileType.includes('pdf')) return FileText;
    return FileIcon;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Mock outline for now
  const generateOutline = async () => {
    if (files.length === 0) {
      toast({
        title: '请先上传材料',
        description: '请上传 PDF、Word 或图片等文件后再生成大纲',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      const mockOutline: OutlineItem[] = [
        { id: 1, title: '引言', points: ['背景介绍', '核心问题', '研究目的'] },
        { id: 2, title: '现状分析', points: ['市场概况', '竞争格局', '发展趋势'] },
        { id: 3, title: '解决方案', points: ['核心策略', '实施步骤', '预期效果'] },
        { id: 4, title: '案例展示', points: ['成功案例一', '成功案例二', '经验总结'] },
        { id: 5, title: '未来展望', points: ['发展规划', '风险评估', '行动建议'] },
      ];
      setOutline(mockOutline);
      setIsGenerating(false);
    }, 2000);
  };

  const handleModifyOutline = async () => {
    if (!modifyInput.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      toast({ title: '已收到修改意见', description: '大纲已根据您的建议进行调整' });
      setModifyInput('');
      setIsGenerating(false);
    }, 1500);
  };

  const handleGeneratePPT = async () => {
    if (files.length === 0) {
      toast({
        title: '请先上传文件',
        description: '请上传 PDF、Word 或图片等文件后再生成',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const formData = new FormData();
      files.forEach(f => {
        formData.append('files', f.file);
      });

      // Use current title input or notebook title
      const title = titleInput || notebook?.title || 'WenfengAI 生成';

      const res = await api.post(`/generate-slides?title=${encodeURIComponent(title)}`, formData);
      const data = res.data;

      // Navigate to result
      navigate(`/notebook/${data.task_id}/result?task_id=${data.task_id}`);

    } catch (error: any) {
      console.error('生成失败:', error);
      toast({
        title: '生成失败',
        description: error.response?.data?.detail || error.message || '无法连接到后端服务',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // If viewing an existing notebook that is already processing/completed, redirect to Result
  if (notebook && notebook.id !== 'new' && notebook.status !== 'draft') {
    // Check if we should redirect or show read-only view. 
    // For now, let's redirect to result view which handles status display.
    // But we can't do this during render easily.
    // Ideally check this in useEffect or render a "Go to Result" button.
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {isEditingTitle ? (
            <Input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={updateTitle}
              onKeyDown={(e) => e.key === 'Enter' && updateTitle()}
              className="max-w-xs h-9"
              autoFocus
            />
          ) : (
            <h1
              className="font-semibold text-lg cursor-pointer hover:text-accent transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {titleInput}
            </h1>
          )}

          <div className="ml-auto">
            <Button
              onClick={handleGeneratePPT}
              disabled={files.length === 0 || isGenerating}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成 PPT
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Column - Materials */}
        <div className="w-[400px] border-r border-border flex flex-col bg-card/30">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Upload className="w-4 h-4" />
              素材管理
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              上传文档、图片或音频作为 PPT 素材
            </p>
          </div>

          <div className="p-4">
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                transition-all duration-200
                ${isDragging ? 'border-accent bg-accent/5 scale-[1.02]' : 'border-border hover:border-accent/50 hover:bg-accent/5'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp3,.wav,.m4a"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                  <Upload className="w-7 h-7 text-accent" />
                </div>
                <p className="font-medium mb-1">拖拽文件到此处</p>
                <p className="text-sm text-muted-foreground mb-3">或点击选择文件</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无上传文件</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">已上传 {files.length} 个文件</p>
                {files.map((file) => {
                  const Icon = getFileIcon(file.file.type);
                  return (
                    <div key={file.id} className="group flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.file.size)}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeFile(file.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Outline Preview (Mocked) */}
        <div className="flex-1 flex flex-col">
          {/* Same outline UI as before, kept for visual consistency */}
          <div className="flex-1 overflow-y-auto p-6">
            {outline.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                  <ListOrdered className="w-10 h-10 text-accent" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">PPT 大纲预览</h2>
                <Button onClick={generateOutline} disabled={files.length === 0 || isGenerating} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {isGenerating ? "正在生成..." : "生成大纲"}
                </Button>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-4">
                {outline.map((item, index) => (
                  <div key={item.id} className="p-4 rounded-xl bg-card border border-border">
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <ul className="space-y-1.5 list-disc pl-5">
                      {item.points.map((p, i) => <li key={i} className="text-sm text-muted-foreground">{p}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
