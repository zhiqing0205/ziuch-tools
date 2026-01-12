'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import type { SciPlotAspectRatio, SciPlotModel, SciPlotMessage, SciPlotSettings, SciPlotThread } from '@/lib/sci-plot/types';
import {
  deleteSciPlotThread,
  getActiveSciPlotThreadId,
  getSciPlotSettings,
  getSciPlotThreads,
  saveSciPlotSettings,
  setActiveSciPlotThreadId,
  upsertSciPlotThread,
} from '@/lib/sci-plot/store';
import { generateSciPlot } from '@/app/api/sci-plot';

import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loading } from '@/components/ui/loading';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

function makeTitleFromPrompt(prompt: string) {
  const trimmed = prompt.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= 24) return trimmed;
  return `${trimmed.slice(0, 24)}…`;
}

function findLastImageUrl(thread: SciPlotThread): string | null {
  for (let i = thread.messages.length - 1; i >= 0; i -= 1) {
    const url = thread.messages[i]?.imageUrl;
    if (typeof url === 'string' && url.trim()) return url;
  }
  return null;
}

function findLastUserText(thread: SciPlotThread): string | null {
  for (let i = thread.messages.length - 1; i >= 0; i -= 1) {
    const msg = thread.messages[i];
    if (msg?.role === 'user' && typeof msg.text === 'string' && msg.text.trim()) return msg.text.trim();
  }
  return null;
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
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refreshThreads = () => setThreads(getSciPlotThreads());

  const setActive = (threadId: string | null) => {
    setActiveSciPlotThreadId(threadId);
    setActiveThreadId(threadId);
  };

  useEffect(() => {
    const saved = getSciPlotSettings();
    setSettings(saved);
    setSettingsDraft({
      apiBaseUrl: saved?.apiBaseUrl || '',
      apiKey: saved?.apiKey || '',
    });

    refreshThreads();
    setActiveThreadId(getActiveSciPlotThreadId());
  }, []);

  useEffect(() => {
    if (!activeThread) return;
    setModel(activeThread.model);
    setAspectRatio(activeThread.aspectRatio);
  }, [activeThread]);

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

  const ensureSettings = () => {
    if (settings?.apiBaseUrl && settings?.apiKey) return true;
    toast({ title: '请先配置生图 API 的 URL 和 Key', variant: 'destructive' });
    setSettingsOpen(true);
    return false;
  };

  const createNewThread = (firstPrompt: string) => {
    const now = Date.now();
    const thread: SciPlotThread = {
      id: uuidv4(),
      title: makeTitleFromPrompt(firstPrompt),
      model,
      aspectRatio,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    upsertSciPlotThread(thread);
    refreshThreads();
    setActive(thread.id);
    return thread;
  };

  const updateThread = (thread: SciPlotThread) => {
    upsertSciPlotThread(thread);
    refreshThreads();
  };

  const handleNewChat = () => {
    setActive(null);
    setPrompt('');
  };

  const handleGenerate = async () => {
    if (!ensureSettings()) return;
    const userText = prompt.trim();
    if (!userText) {
      toast({ title: '请输入描述文本', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const now = Date.now();
      const shouldStartNew =
        !activeThread || activeThread.model !== model || activeThread.aspectRatio !== aspectRatio;
      const baseThread = shouldStartNew ? createNewThread(userText) : activeThread;

      const nextThread: SciPlotThread = {
        ...baseThread,
        model,
        aspectRatio,
        messages: [...baseThread.messages],
        updatedAt: now,
      };

      const userMsg: SciPlotMessage = {
        id: uuidv4(),
        role: 'user',
        text: userText,
        createdAt: now,
      };
      nextThread.messages.push(userMsg);
      updateThread(nextThread);
      setPrompt('');

      const res = await generateSciPlot({
        apiBaseUrl: settings!.apiBaseUrl,
        apiKey: settings!.apiKey,
        model: nextThread.model,
        aspectRatio: nextThread.aspectRatio,
        messages: nextThread.messages.map((m) => ({ role: m.role, text: m.text, imageUrl: m.imageUrl })),
      });

      const assistantAt = Date.now();
      if (!Array.isArray(res.imageUrls) || res.imageUrls.length === 0) {
        throw new Error('未获取到图片');
      }

      res.imageUrls.forEach((url, idx) => {
        const assistantMsg: SciPlotMessage = {
          id: uuidv4(),
          role: 'assistant',
          imageUrl: url,
          text: idx === 0 ? res.assistantText : undefined,
          createdAt: assistantAt,
        };
        nextThread.messages.push(assistantMsg);
      });
      nextThread.updatedAt = assistantAt;
      updateThread(nextThread);
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
    toast({ title: '已删除' });
  };

  return (
    <div className="container mx-auto px-6 py-6">
      {loading && <Loading text="正在生成并上传图片..." />}

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">科研绘图</h1>
          <p className="text-sm text-muted-foreground">
            使用 Gemini 文生图模型生成科研风格图像，支持多轮对话与本地历史记录。
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">生图 API 配置</CardTitle>
            <p className="text-sm text-muted-foreground">URL 与 Key 仅保存在浏览器本地。</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <div className="font-medium">当前 URL</div>
                <div className="text-muted-foreground break-all">
                  {settings?.apiBaseUrl ? settings.apiBaseUrl : '未配置'}
                </div>
              </div>
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">{settings ? '修改' : '立即配置'}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>配置生图 API</DialogTitle>
                    <DialogDescription>示例：`https://chatapi.ziuch.com`</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sci-plot-api-url">URL</Label>
                      <Input
                        id="sci-plot-api-url"
                        value={settingsDraft.apiBaseUrl}
                        onChange={(e) =>
                          setSettingsDraft((prev) => ({ ...prev, apiBaseUrl: e.target.value }))
                        }
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">生成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sci-plot-prompt">描述文本</Label>
              <Textarea
                id="sci-plot-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：生成一张科研风格的折线图，展示 y=sin(x)，白色背景，坐标轴清晰。"
                className="min-h-[120px]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>模型</Label>
                <Select value={model} onValueChange={(v) => setModel(v as SciPlotModel)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>比例</Label>
                <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as SciPlotAspectRatio)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择比例" />
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

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerate} disabled={loading}>
                生成
              </Button>
              <Button variant="outline" onClick={handleNewChat} disabled={loading}>
                新对话
              </Button>
              {activeThread && (
                <div className="text-sm text-muted-foreground flex items-center">
                  当前对话：{activeThread.title}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">历史记录</h2>
            {threads.length > 0 && (
              <div className="text-sm text-muted-foreground">共 {threads.length} 条</div>
            )}
          </div>

          {threads.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                暂无历史记录
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {threads.map((thread) => {
                const lastImage = findLastImageUrl(thread);
                const lastUser = findLastUserText(thread);
                const isActive = thread.id === activeThreadId;
                return (
                  <Card key={thread.id} className={cn(isActive && 'border-primary')}>
                    <CardHeader className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{thread.title || '未命名对话'}</CardTitle>
                          <div className="text-xs text-muted-foreground break-all">
                            {thread.model} · {thread.aspectRatio} ·{' '}
                            {new Date(thread.updatedAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => setActive(thread.id)}>
                            继续
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteId(thread.id)}>
                            删除
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {lastImage ? (
                        <a href={lastImage} target="_blank" rel="noreferrer">
                          <img
                            src={lastImage}
                            alt={thread.title || 'sci-plot'}
                            className="w-full rounded-md border object-contain max-h-[360px] bg-background"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                          暂无图片
                        </div>
                      )}
                      {lastUser && (
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-24 overflow-hidden">
                          {lastUser}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

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
