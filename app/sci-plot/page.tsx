'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Download, ExternalLink, ImagePlus, Plus, Send, Settings, Trash2 } from 'lucide-react';

import type {
  SciPlotAspectRatio,
  SciPlotLanguage,
  SciPlotMessage,
  SciPlotModel,
  SciPlotSettings,
  SciPlotThread,
} from '@/lib/sci-plot/types';
import { deleteSciPlotThread, getSciPlotSettings, getSciPlotThreads, saveSciPlotSettings, upsertSciPlotThread } from '@/lib/sci-plot/store';
import { generateSciPlot } from '@/app/api/sci-plot';

import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Attachment = {
  id: string;
  name: string;
  localUrl: string;
  remoteUrl?: string;
  status: 'uploading' | 'uploaded' | 'error';
  error?: string;
};

const MODEL_OPTIONS: Array<{ value: SciPlotModel; label: string }> = [
  { value: 'gemini-3-pro-image-preview', label: 'gemini-3-pro-image-preview' },
  { value: 'gemini-3-pro-image-preview-2k', label: 'gemini-3-pro-image-preview-2k' },
  { value: 'gemini-3-pro-image-preview-4k', label: 'gemini-3-pro-image-preview-4k' },
];

const ASPECT_RATIO_OPTIONS: Array<{ value: SciPlotAspectRatio; label: string }> = [
  { value: '1:1', label: '1:1' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
];

const LANGUAGE_OPTIONS: Array<{ value: SciPlotLanguage; label: string }> = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

function makeTitleFromPrompt(prompt: string) {
  const trimmed = prompt.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= 24) return trimmed;
  return `${trimmed.slice(0, 24)}…`;
}

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

function getThreadLastImageUrl(thread: SciPlotThread): string | null {
  for (let i = thread.messages.length - 1; i >= 0; i -= 1) {
    const urls = thread.messages[i]?.imageUrls;
    if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string' && urls[0].trim()) {
      return urls[0].trim();
    }
  }
  return null;
}

function getThreadLastUserText(thread: SciPlotThread): string | null {
  for (let i = thread.messages.length - 1; i >= 0; i -= 1) {
    const msg = thread.messages[i];
    if (msg?.role === 'user' && typeof msg.text === 'string' && msg.text.trim()) return msg.text.trim();
  }
  return null;
}

async function uploadReferenceImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);
  const resp = await fetch('/api/image-hosting', { method: 'POST', body: formData });
  const data = (await resp.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!resp.ok) {
    throw new Error(data?.error || `上传失败 (${resp.status})`);
  }
  if (!data?.url) throw new Error('上传失败：未返回直链');
  return data.url;
}

async function downloadImage(url: string, filename: string) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`下载失败 (${resp.status})`);
  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function SciPlotPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<SciPlotSettings | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<{ apiBaseUrl: string; apiKey: string }>({
    apiBaseUrl: '',
    apiKey: '',
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [threads, setThreads] = useState<SciPlotThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const [model, setModel] = useState<SciPlotModel>('gemini-3-pro-image-preview-2k');
  const [aspectRatio, setAspectRatio] = useState<SciPlotAspectRatio>('1:1');
  const [language, setLanguage] = useState<SciPlotLanguage>('zh');

  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('image');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refreshThreads = () => setThreads(getSciPlotThreads());

  const clearAttachments = () => {
    setAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.localUrl));
      return [];
    });
  };

  useEffect(() => {
    const saved = getSciPlotSettings();
    setSettings(saved);
    setSettingsDraft({
      apiBaseUrl: saved?.apiBaseUrl || '',
      apiKey: saved?.apiKey || '',
    });
    refreshThreads();

    // 刷新默认进入“新对话”
    setActiveThreadId(null);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeThread?.messages?.length]);

  useEffect(() => {
    if (!activeThread) return;
    setModel(activeThread.model);
    setAspectRatio(activeThread.aspectRatio);
    setLanguage(activeThread.language);
    clearAttachments();
    setPrompt('');
  }, [activeThreadId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasApiConfig = !!(settings?.apiBaseUrl && settings?.apiKey);

  const ensureSettings = () => {
    if (hasApiConfig) return true;
    setSettingsOpen(true);
    toast({ title: '请先配置生图 API 的 URL 和 Key', variant: 'destructive' });
    return false;
  };

  const handleSaveSettings = () => {
    const apiBaseUrl = settingsDraft.apiBaseUrl.trim();
    const apiKey = settingsDraft.apiKey.trim();
    if (!apiBaseUrl || !apiKey) {
      toast({ title: '请填写 URL 和 Key', variant: 'destructive' });
      return;
    }
    const next: SciPlotSettings = { apiBaseUrl, apiKey, updatedAt: Date.now() };
    saveSciPlotSettings(next);
    setSettings(next);
    setSettingsOpen(false);
    toast({ title: '已保存 API 配置' });
  };

  const startNewChat = () => {
    setActiveThreadId(null);
    clearAttachments();
    setPrompt('');
  };

  const handlePickFiles = () => fileInputRef.current?.click();

  const addFiles = async (files: File[]) => {
    if (!ensureSettings()) return;
    if (!files.length) return;

    const maxFiles = 4;
    const available = Math.max(0, maxFiles - attachments.length);
    const picked = files.slice(0, available);
    if (picked.length === 0) {
      toast({ title: `最多可添加 ${maxFiles} 张参考图`, variant: 'destructive' });
      return;
    }

    for (const file of picked) {
      const id = uuidv4();
      const localUrl = URL.createObjectURL(file);
      setAttachments((prev) => [...prev, { id, name: file.name, localUrl, status: 'uploading' }]);

      uploadReferenceImage(file)
        .then((url) => {
          setAttachments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, remoteUrl: url, status: 'uploaded' } : a))
          );
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : '上传失败';
          setAttachments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status: 'error', error: message } : a))
          );
          toast({ title: '参考图上传失败', description: message, variant: 'destructive' });
        });
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    await addFiles(files);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    await addFiles(files);
  };

  const handleSend = async () => {
    if (!ensureSettings()) return;
    const userText = prompt.trim();
    const hasAttachment = attachments.length > 0;
    if (!userText && !hasAttachment) {
      toast({ title: '请输入描述或上传参考图', variant: 'destructive' });
      return;
    }

    const blocking = attachments.find((a) => a.status !== 'uploaded');
    if (blocking) {
      toast({ title: '参考图还未就绪', description: '请等待上传完成或移除失败的图片。', variant: 'destructive' });
      return;
    }

    const now = Date.now();
    const threadBase: SciPlotThread = activeThread
      ? { ...activeThread }
      : {
          id: uuidv4(),
          title: makeTitleFromPrompt(userText || '参考图对话'),
          model,
          aspectRatio,
          language,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };

    const refUrls = attachments.map((a) => a.remoteUrl!).filter(Boolean);

    const userMsg: SciPlotMessage = {
      id: uuidv4(),
      role: 'user',
      text: userText || undefined,
      imageUrls: refUrls.length > 0 ? refUrls : undefined,
      createdAt: now,
    };

    const nextThread: SciPlotThread = {
      ...threadBase,
      model,
      aspectRatio,
      language,
      messages: [...threadBase.messages, userMsg],
      updatedAt: now,
    };

    upsertSciPlotThread(nextThread);
    refreshThreads();
    setActiveThreadId(nextThread.id);
    setPrompt('');
    clearAttachments();

    const languageSuffix =
      language === 'en'
        ? '\n\nPlease ensure all labels/legends/annotations in the figure are in English.'
        : '\n\n请确保图中所有标题/坐标轴/图例/注释文字均为中文。';

    setLoading(true);
    try {
      const res = await generateSciPlot({
        apiBaseUrl: settings!.apiBaseUrl,
        apiKey: settings!.apiKey,
        model: nextThread.model,
        aspectRatio: nextThread.aspectRatio,
        language: nextThread.language,
        messages: nextThread.messages.map((m) => ({
          role: m.role,
          text: m.id === userMsg.id && m.text ? `${m.text}${languageSuffix}` : m.text,
          imageUrls: m.imageUrls,
        })),
      });

      if (!Array.isArray(res.imageUrls) || res.imageUrls.length === 0) {
        throw new Error('未获取到图片');
      }

      const assistantAt = Date.now();
      const assistantMsg: SciPlotMessage = {
        id: uuidv4(),
        role: 'assistant',
        text: res.assistantText,
        imageUrls: res.imageUrls,
        createdAt: assistantAt,
      };

      const updated: SciPlotThread = {
        ...nextThread,
        messages: [...nextThread.messages, assistantMsg],
        updatedAt: assistantAt,
      };
      upsertSciPlotThread(updated);
      refreshThreads();
      toast({ title: '已生成并上传到图床' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败';
      toast({ title: '生成失败', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteId) return;
    deleteSciPlotThread(deleteId);
    setDeleteId(null);
    refreshThreads();
    if (activeThreadId === deleteId) startNewChat();
    toast({ title: '已删除' });
  };

  const openPreview = (url: string, name?: string) => {
    setPreviewUrl(url);
    setPreviewName(name || 'image');
  };

  const handleDownload = async () => {
    if (!previewUrl) return;
    const safeName = previewName.replace(/[\\/:*?"<>|]+/g, '-');
    try {
      await downloadImage(previewUrl, safeName);
    } catch (err) {
      const message = err instanceof Error ? err.message : '下载失败';
      toast({ title: '下载失败', description: message, variant: 'destructive' });
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full px-6 py-6">
      {loading && <Loading text="正在生成并上传图片..." />}

      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">科研绘图</h1>
            <p className="text-sm text-muted-foreground">对话式科研绘图，支持参考图、多轮对话、历史记录。</p>
          </div>

          <Button
            variant={hasApiConfig ? 'outline' : 'destructive'}
            onClick={() => setSettingsOpen(true)}
            className="shrink-0"
          >
            <Settings className="h-4 w-4" />
            {hasApiConfig ? 'API 已配置' : '配置 API'}
          </Button>
        </div>

        {!hasApiConfig && (
          <Alert variant="destructive">
            <AlertTitle>需要先配置生图 API</AlertTitle>
            <AlertDescription>
              请填写生图接口 URL 与 Key（仅保存在浏览器本地），否则无法开始对话与上传参考图。
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-[320px,1fr]">
          <Card className="md:h-[calc(100vh-240px)]">
            <CardHeader className="space-y-2 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">历史对话</CardTitle>
                <Button variant="outline" size="sm" onClick={startNewChat}>
                  <Plus className="h-4 w-4" />
                  新对话
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">点击条目继续对话（刷新默认新对话）。</div>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[calc(100vh-320px)] md:h-[calc(100vh-330px)]">
                <div className="space-y-2 pr-3">
                  {threads.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">暂无历史记录</div>
                  ) : (
                    threads.map((thread) => {
                      const lastImage = getThreadLastImageUrl(thread);
                      const lastUser = getThreadLastUserText(thread);
                      const isActive = thread.id === activeThreadId;

                      return (
                        <div
                          key={thread.id}
                          onClick={() => setActiveThreadId(thread.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setActiveThreadId(thread.id);
                          }}
                          className={cn(
                            'w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent',
                            isActive && 'border-primary bg-accent'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-background"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (lastImage) openPreview(lastImage, `${thread.title || 'sci-plot'}.png`);
                              }}
                            >
                              {lastImage ? (
                                <img
                                  src={lastImage}
                                  alt={thread.title}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="h-full w-full bg-muted" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{thread.title || '未命名对话'}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {thread.model} · {thread.aspectRatio} · {thread.language === 'en' ? 'English' : '中文'}
                              </div>
                              {lastUser && <div className="truncate text-xs text-muted-foreground">{lastUser}</div>}
                              <div className="text-[11px] text-muted-foreground">{formatTime(thread.updatedAt)}</div>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(thread.id);
                              }}
                              aria-label="删除对话"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card
            className={cn('flex flex-col md:h-[calc(100vh-240px)]', isDragging && 'ring-2 ring-primary')}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">
                    {activeThread ? activeThread.title : '新对话'}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {activeThread ? `更新时间：${formatTime(activeThread.updatedAt)}` : '输入内容开始生成'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Select value={language} onValueChange={(v) => setLanguage(v as SciPlotLanguage)}>
                    <SelectTrigger className="h-8 w-[110px]">
                      <SelectValue placeholder="语言" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={model} onValueChange={(v) => setModel(v as SciPlotModel)}>
                    <SelectTrigger className="h-8 w-[220px]">
                      <SelectValue placeholder="模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as SciPlotAspectRatio)}>
                    <SelectTrigger className="h-8 w-[90px]">
                      <SelectValue placeholder="比例" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden pt-0">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-3 pb-4">
                  {!activeThread || activeThread.messages.length === 0 ? (
                    <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                      你可以：
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        <li>描述要生成的科研图（例如折线图/散点图/流程图/示意图）</li>
                        <li>上传参考图，让模型在风格或结构上对齐</li>
                        <li>多轮对话逐步修改（例如“把配色改成蓝色系，字体更大”）</li>
                      </ul>
                    </div>
                  ) : (
                    activeThread.messages.map((msg) => {
                      const isUser = msg.role === 'user';
                      const bubbleClass = isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground';

                      return (
                        <div key={msg.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                          <div className={cn('max-w-[85%] space-y-2')}>
                            {msg.text && (
                              <div className={cn('rounded-lg px-3 py-2 text-sm whitespace-pre-wrap', bubbleClass)}>
                                {msg.text}
                              </div>
                            )}

                            {Array.isArray(msg.imageUrls) && msg.imageUrls.length > 0 && (
                              <div className={cn('grid gap-2', msg.imageUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                                {msg.imageUrls.map((url, idx) => (
                                  <button
                                    key={`${msg.id}-${idx}`}
                                    type="button"
                                    className="group relative overflow-hidden rounded-lg border bg-background"
                                    onClick={() => openPreview(url, `sci-plot-${msg.id}-${idx + 1}.png`)}
                                  >
                                    <img
                                      src={url}
                                      alt="generated"
                                      className="max-h-[320px] w-full object-contain transition-transform group-hover:scale-[1.01]"
                                      loading="lazy"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className={cn('text-[11px] text-muted-foreground', isUser ? 'text-right' : 'text-left')}>
                              {formatTime(msg.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
            </CardContent>

            <div className="border-t p-4 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
              />

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
                      <button
                        type="button"
                        className="h-10 w-10 overflow-hidden rounded border"
                        onClick={() => openPreview(a.remoteUrl || a.localUrl, a.name)}
                      >
                        <img src={a.localUrl} alt={a.name} className="h-full w-full object-cover" />
                      </button>
                      <div className="min-w-0">
                        <div className="max-w-[220px] truncate text-xs font-medium">{a.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {a.status === 'uploading'
                            ? '上传中...'
                            : a.status === 'uploaded'
                              ? '已上传'
                              : `失败：${a.error || ''}`}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          URL.revokeObjectURL(a.localUrl);
                          setAttachments((prev) => prev.filter((x) => x.id !== a.id));
                        }}
                      >
                        移除
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <Button type="button" variant="outline" size="icon" onClick={handlePickFiles} disabled={loading}>
                  <ImagePlus className="h-4 w-4" />
                </Button>

                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="输入描述（Enter 发送，Shift+Enter 换行）；也可拖拽参考图到此处"
                  className="min-h-[44px] max-h-[160px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />

                <Button type="button" onClick={handleSend} disabled={loading}>
                  <Send className="h-4 w-4" />
                  发送
                </Button>
              </div>
              {isDragging && (
                <div className="text-xs text-muted-foreground">松开鼠标即可上传参考图（将自动上传到图床）。</div>
              )}
            </div>
          </Card>
        </div>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>配置生图 API</DialogTitle>
              <DialogDescription>URL 与 Key 仅保存在浏览器本地。</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sci-plot-api-url">URL</Label>
                <Input
                  id="sci-plot-api-url"
                  value={settingsDraft.apiBaseUrl}
                  onChange={(e) => setSettingsDraft((prev) => ({ ...prev, apiBaseUrl: e.target.value }))}
                  placeholder="https://chatapi.ziuch.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sci-plot-api-key">Key</Label>
                <Input
                  id="sci-plot-api-key"
                  type="password"
                  value={settingsDraft.apiKey}
                  onChange={(e) => setSettingsDraft((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveSettings}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
          <DialogContent className="max-w-5xl p-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base">预览</DialogTitle>
              <DialogDescription className="break-all">{previewUrl || ''}</DialogDescription>
            </DialogHeader>
            {previewUrl && (
              <div className="rounded-lg border bg-background p-2">
                <img src={previewUrl} alt="preview" className="max-h-[70vh] w-full object-contain" />
              </div>
            )}
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
              <div className="text-xs text-muted-foreground">{previewName}</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownload} disabled={!previewUrl}>
                  <Download className="h-4 w-4" />
                  下载
                </Button>
                {previewUrl && (
                  <Button variant="outline" asChild>
                    <a href={previewUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      新标签打开
                    </a>
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除？</AlertDialogTitle>
              <AlertDialogDescription>删除后将无法恢复（仅影响本地浏览器数据）。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete}>删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
