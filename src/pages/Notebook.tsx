import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
  File,
  Trash2,
  Eye,
  ListOrdered,
  RefreshCw,
} from 'lucide-react';

interface UploadedFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
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
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
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
      fetchNotebook();
      fetchFiles();
    }
  }, [user, id]);

  const fetchNotebook = async () => {
    try {
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/dashboard');
        return;
      }
      setNotebook(data);
      setTitleInput(data.title);
    } catch (error) {
      console.error('Error fetching notebook:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('notebook_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const updateTitle = async () => {
    if (!notebook || !titleInput.trim()) return;

    try {
      const { error } = await supabase
        .from('notebooks')
        .update({ title: titleInput.trim() })
        .eq('id', notebook.id);

      if (error) throw error;
      setNotebook({ ...notebook, title: titleInput.trim() });
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    if (!user || !id) return;

    const filesToUpload = Array.from(fileList);
    if (filesToUpload.length === 0) return;

    setUploading(true);

    try {
      for (const file of filesToUpload) {
        const filePath = `${user.id}/${id}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('files')
          .insert({
            notebook_id: id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
          });

        if (dbError) throw dbError;
      }

      fetchFiles();
      toast({
        title: '上传成功',
        description: `已成功上传 ${filesToUpload.length} 个文件`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: '上传失败',
        description: '无法上传文件，请重试',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
  }, [user, id]);

  const removeFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
      setFiles(files.filter(f => f.id !== fileId));
      toast({
        title: '删除成功',
        description: '文件已删除',
      });
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('audio/')) return Music;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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

    // Simulate AI generation - in production this would call an AI service
    setTimeout(() => {
      const mockOutline: OutlineItem[] = [
        {
          id: 1,
          title: '引言',
          points: ['背景介绍', '核心问题', '研究目的'],
        },
        {
          id: 2,
          title: '现状分析',
          points: ['市场概况', '竞争格局', '发展趋势'],
        },
        {
          id: 3,
          title: '解决方案',
          points: ['核心策略', '实施步骤', '预期效果'],
        },
        {
          id: 4,
          title: '案例展示',
          points: ['成功案例一', '成功案例二', '经验总结'],
        },
        {
          id: 5,
          title: '未来展望',
          points: ['发展规划', '风险评估', '行动建议'],
        },
      ];
      setOutline(mockOutline);
      setIsGenerating(false);
    }, 2000);
  };

  const handleModifyOutline = async () => {
    if (!modifyInput.trim()) return;

    setIsGenerating(true);

    // Simulate AI modification
    setTimeout(() => {
      toast({
        title: '已收到修改意见',
        description: '大纲已根据您的建议进行调整',
      });
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
      // 1. 创建 FormData 并添加文件
      const formData = new FormData();

      for (const file of files) {
        // 从 Supabase Storage 获取文件
        const response = await fetch(file.file_url);
        const blob = await response.blob();
        formData.append('files', blob, file.file_name);
      }

      // 2. 调用后端 API
      const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/generate-slides?title=${encodeURIComponent(notebook?.title || 'WenfengAI 生成')}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('生成请求失败');
      }

      const data = await res.json();

      // 3. 保存 task_id 用于轮询
      localStorage.setItem(`notebook_${id}_task`, JSON.stringify({
        task_id: data.task_id,
        started_at: new Date().toISOString(),
      }));

      // 4. 更新数据库状态
      await supabase
        .from('notebooks')
        .update({ status: 'generating' })
        .eq('id', id);

      // 5. 跳转到结果页
      navigate(`/notebook/${id}/result?task_id=${data.task_id}`);

    } catch (error) {
      console.error('生成失败:', error);
      toast({
        title: '生成失败',
        description: error instanceof Error ? error.message : '无法连接到后端服务',
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

  if (!notebook) return null;

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
              {notebook.title}
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

      {/* Main Content - Two Column Layout */}
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

          {/* Drop Zone */}
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
                ${isDragging
                  ? 'border-accent bg-accent/5 scale-[1.02]'
                  : 'border-border hover:border-accent/50 hover:bg-accent/5'
                }
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

              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-10 h-10 text-accent animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">正在上传...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                    <Upload className="w-7 h-7 text-accent" />
                  </div>
                  <p className="font-medium mb-1">拖拽文件到此处</p>
                  <p className="text-sm text-muted-foreground mb-3">或点击选择文件</p>
                  <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-1 rounded bg-secondary">PDF</span>
                    <span className="px-2 py-1 rounded bg-secondary">Word</span>
                    <span className="px-2 py-1 rounded bg-secondary">图片</span>
                    <span className="px-2 py-1 rounded bg-secondary">音频</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无上传文件</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  已上传 {files.length} 个文件
                </p>
                {files.map((file) => {
                  const FileIcon = getFileIcon(file.file_type);
                  return (
                    <div
                      key={file.id}
                      className="group flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-accent/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(file.file_url, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => removeFile(file.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Outline Preview */}
        <div className="flex-1 flex flex-col">
          {/* Outline Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {outline.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                  <ListOrdered className="w-10 h-10 text-accent" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">PPT 大纲预览</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  上传素材后，点击下方按钮生成 PPT 大纲。<br />
                  您可以预览并修改大纲，确认后再生成完整 PPT。
                </p>
                <Button
                  onClick={generateOutline}
                  disabled={files.length === 0 || isGenerating}
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      正在生成大纲...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      生成大纲
                    </>
                  )}
                </Button>
                {files.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-4">
                    请先在左侧上传素材
                  </p>
                )}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">PPT 大纲</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateOutline}
                    disabled={isGenerating}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                    重新生成
                  </Button>
                </div>

                <div className="space-y-4">
                  {outline.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-card border border-border hover:border-accent/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{item.title}</h3>
                          <ul className="space-y-1.5">
                            {item.points.map((point, pIndex) => (
                              <li
                                key={pIndex}
                                className="text-sm text-muted-foreground flex items-center gap-2"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-accent/50" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modify Input - Only show when outline exists */}
          {outline.length > 0 && (
            <div className="p-4 border-t border-border bg-card/50">
              <div className="max-w-2xl mx-auto">
                <p className="text-sm text-muted-foreground mb-3">
                  对大纲有修改意见？在下方输入您的建议：
                </p>
                <div className="flex gap-3">
                  <Textarea
                    value={modifyInput}
                    onChange={(e) => setModifyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleModifyOutline();
                      }
                    }}
                    placeholder="例如：请增加一个关于竞品分析的章节..."
                    className="min-h-[48px] max-h-[120px] resize-none rounded-xl"
                    rows={1}
                  />
                  <Button
                    onClick={handleModifyOutline}
                    disabled={!modifyInput.trim() || isGenerating}
                    className="rounded-xl h-12 px-6 bg-accent hover:bg-accent/90 text-accent-foreground flex-shrink-0"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
