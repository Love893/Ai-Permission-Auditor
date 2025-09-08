// src/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import { invoke, view as forgeView , router } from '@forge/bridge';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';

// shadcn/ui
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Drawer } from './ui/drawer';
import { MoreAppsDrawer } from './MoreAppsDrawer';

// icons
import {
  Send, Bot as BotIcon, User as UserIcon, DollarSign,
  HelpCircle, FileText, Bot, Zap, Ruler, ClipboardList, Download, Clock, ArrowLeft, Search, Users, Sliders, PiggyBank, Store
} from 'lucide-react';

// styles (keep yours; most visuals come from Tailwind/shadcn now)
import './ChatInterface.css';

/** ---------- Markdown helpers ---------- */
marked.setOptions({ gfm: true, breaks: true });
function safeJson(v){ try{return JSON.stringify(v,null,2);}catch{return String(v);} }
function toMd(value){ if(value==null) return ""; if(typeof value==="string") return value; if(Array.isArray(value)) return value.map(v=>typeof v==="string"?v:safeJson(v)).join("\n"); return safeJson(value); }
function stripDebugSuffix(md){ return String(md).replace(/\s*⚠️\s*\(\d+\)\s*\[[\s\S]*\]\s*$/m, "").trim(); }
function renderMarkdownToSafeHtml(content){ const md=stripDebugSuffix(toMd(content)).replace(/\r\n/g,"\n"); const html=marked.parse(md); return DOMPurify.sanitize(html); }

function formatStr(str, vars) {
  if (!str) return '';
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? String(vars[k]) : _));
}

const qaIconMap = {
  search: Search,
  users: Users,
  sliders: Sliders,
  'piggy-bank': PiggyBank,
};

export default function ChatInterface({
  start,
  showChat,
  onBack,
  onOpenChat,
  lastScannedAt,
  cooldownActive,
  runStatus,
  runLoading,
  content,
  locale,
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingTimeout, setLoadingTimeout] = useState(null);
  const [isMoreAppsOpen, setIsMoreAppsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);
  const [cloudId, setCloudId] = useState(null);

  // Use waiting messages from content, with a tiny fallback set
  const waitingMessages = (content?.chat?.waitingMessages?.length
    ? content.chat.waitingMessages
    : ["Working on it...", "Analyzing data...", "Crunching numbers..."]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    (async () => {
      try { const { cloudId } = await forgeView.getContext(); if (cloudId) setCloudId(cloudId); }
      catch (e) { console.error('Failed to load cloudId:', e); }
    })();
  }, []);

  // Log locale and content changes for debugging
  useEffect(() => {
    // console.log('ChatInterface: Locale changed to:', locale);
    // console.log('ChatInterface: Content pack loaded:', content?.heroTitle || 'Unknown');
  }, [locale, content]);

  const fmtTs = (ts) => {
    if (!ts) return '—';
    const n = Number(ts);
    const d = isNaN(n) ? new Date(ts) : new Date(n);
    
    // Use the resolved locale for date formatting
    const localeMap = {
      'en': 'en-US',
      'fr': 'fr-FR', 
      'es': 'es-ES',
      'de': 'de-DE'
    };
    
    const resolvedLocale = localeMap[locale?.split('_')[0]] || 'en-US';
    return d.toLocaleString(resolvedLocale, { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Parse "Processing ABC (3/10)…" → {current:3,total:10,pct:30}
  function parseProgressFromStatus(s) {
    if (!s) return null;
    const m = /\((\d+)\s*\/\s*(\d+)\)/.exec(s);
    if (!m) return null;
    const current = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    if (!total) return null;
    return { current, total, pct: Math.round((current / total) * 100) };
  }

  const progress = parseProgressFromStatus(runStatus);
  const isRunDisabled = runLoading || cooldownActive || !!lastScannedAt;

  const handleRunClick = async () => {
    try {
      setMessages([]);   // clear transcript
      await start();     // parent does the scan
    } catch (e) {
      console.error('start() failed:', e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = { id: Date.now(), type: 'user', content: inputValue, timestamp: new Date().toLocaleTimeString(locale?.split('_')[0] || 'en') };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setLoadingMessage('');

    const timeout = setTimeout(() => {
      const msg = waitingMessages[Math.floor(Math.random() * waitingMessages.length)];
      setLoadingMessage(msg);
    }, 7000);
    setLoadingTimeout(timeout);

    try {
      const ctx = await forgeView.getContext();
      const currentLocale = ctx?.locale || locale || 'en_US';
      const userId = ctx?.accountId
      const response = await invoke('queryPermissionAuditor', {
        query: userMessage.content,
        locale: currentLocale,
        userId: userId,
        event: 'permissionaudit',
        orgId: cloudId
      });

     let answer = content?.defaultRetry?.retryMessage;
      let followups = [];

      const nested = response?.data?.data?.result;
      const flat = response?.data?.result;
      const result = nested || flat;

      if (result?.answer) {
        answer = toMd(result.answer);
        followups = Array.isArray(result.followups) ? result.followups : [];
      }

      const botMessage = { id: Date.now() + 1, type: 'bot', content: answer, followups, timestamp: new Date().toLocaleTimeString(locale?.split('_')[0] || 'en') };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = { id: Date.now() + 1, type: 'error', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toLocaleTimeString(locale?.split('_')[0] || 'en') };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      if (loadingTimeout) { clearTimeout(loadingTimeout); setLoadingTimeout(null); }
    }
  };

  const handleFollowupClick = (f) => setInputValue(f?.question || '');

  const handleDownloadPdf = async () => {
    if (!chatRef.current) return;
    const wrapper = document.createElement('div');
    wrapper.style.padding = '16px';
    wrapper.style.fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    wrapper.style.color = '#0f172a';
    const heading = document.createElement('div');
    heading.innerHTML = `
      <h2 style="margin:0 0 4px 0;">${content?.assistant?.title || 'License Optimization Assistant'}</h2>
      <div style="font-size:12px;color:#475569;margin-bottom:12px;">
        Transcript • ${new Date().toLocaleString(locale?.split('_')[0] || 'en')}
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0 16px 0;" />
    `;
    wrapper.appendChild(heading);
    wrapper.appendChild(chatRef.current.cloneNode(true));
    await html2pdf().set({
      margin: [10,10,10,10],
      filename: `permission-auditor-chat-${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).from(wrapper).save();
  };

  const resetWindow = () => onBack?.();
  const resetToChat = () => onOpenChat?.();

  /** ----------------- UI ----------------- */
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar when chat is open (back + last scanned) */}
      {showChat && (
        <>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          
              <ArrowLeft  onClick={resetWindow} 
              className="h-5 w-5 cursor-pointer text-slate-700 hover:text-blue-600 transition-colors"
               aria-label={content?.ctas?.back || 'Back'}
                title={content?.ctas?.back || 'Back'}
              />
          {lastScannedAt && (
            <div className="text-xs text-muted-foreground">
              <strong>{content?.labels?.lastScanned || 'Last scanned:'}</strong> {fmtTs(lastScannedAt)}
            </div>
          )}
        </div>
        <Separator />
        </>
      )}

      {!showChat && (
        <div className="mx-auto max-w-5xl px-4 pb-4">
          <h1 className="text-center text-4xl font-semibold tracking-tight">{content?.heroTitle}</h1>
          <p className="mt-2 text-center text-lg text-muted-foreground">{content?.heroSubtitle}</p>

          <Card className="mt-4 rounded-xl">
            <CardContent className="space-y-2 p-3">
              {(content?.specRows || []).map((row) => (
                <div key={row.id} className="grid grid-cols-[220px_1fr] items-start gap-4 rounded-md bg-muted/40 px-3 py-2">
                  <div className="flex items-center gap-2 font-semibold underline">
                    {row.id === 'solves' && <ClipboardList className="h-4 w-4 text-muted-foreground" />}
                    {row.id === 'who' && <HelpCircle className="h-4 w-4 text-muted-foreground" />}
                    {row.id === 'inside' && <FileText className="h-4 w-4 text-muted-foreground" />}
                    {row.id === 'ai' && <Bot className="h-4 w-4 text-muted-foreground" />}
                    {row.id === 'build' && <Zap className="h-4 w-4 text-muted-foreground" />}
                    {row.id === 'measure' && <Ruler className="h-4 w-4 text-muted-foreground" />}
                    {row.label}
                  </div>
                  <div className="space-y-1 text-sm underline">
                    {(row.links || []).map((l, i) => <div key={i}>
                        {/* <a href="#">{l}</a> */}
                        <span>{l}</span>
                        </div>)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="mt-4 flex flex-col items-center gap-3">
            {!lastScannedAt ? (
              <Button onClick={handleRunClick} disabled={isRunDisabled}>
                {runLoading ? 'Running…' : (content?.ctas?.run || 'Run')}
              </Button>
            ) : (
              <>
                <div className="text-xs text-muted-foreground">
                  <strong>{content?.labels?.lastScanned || 'Last scanned :'}</strong> {fmtTs(lastScannedAt)}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleRunClick} disabled={runLoading}>
                    {content?.ctas?.rescan || 'Rescan'}
                  </Button>
                  <Button onClick={resetToChat} disabled={runLoading}>
                    {content?.ctas?.analyse || 'Analyse'}
                  </Button>
                </div>
                {/* Progress (when runStatus has (x/y)) */}
                {progress && (
                  <div className="w-[300px]">
                    <Progress value={progress.pct} />
                    <div className="mt-1 text-center text-[11px] text-muted-foreground">
                      {/* Language-agnostic version */}
                      {/* Scanning project {progress.current} of {progress.total}. */}
                      {formatStr(content?.labels?.scanningProgress || 'Scanning project {current} of {total}.', {
                        current: progress.current,
                        total: progress.total
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* status line */}
            {runStatus && !progress && (
              <div className="text-sm text-muted-foreground">{runStatus}</div>
            )}
          </div>

                  <div className="flex items-center justify-between">
                      {/* "More apps from us" - now a clickable button that opens drawer */}
                      <button
                          onClick={() => setIsMoreAppsOpen(true)}
                          className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:from-blue-600 hover:to-indigo-600 hover:text-white transition-all duration-200 border border-blue-200 hover:border-blue-600 hover:shadow-md active:scale-95"
                          title={content?.moreApps?.title || 'Discover more apps from our company'}
                      >
                          <Store className="h-4 w-4" />
                          {content?.ctas?.moreApps || 'More apps from us'}
                      </button>

                      {/* Contact us button - styled similar to "More apps" */}
                      <button
                           onClick={() =>
                              router.open(
                                  'https://clovity.com/contact',
                                  '_blank',
                                  'noopener,noreferrer'
                              )
                          }
                          className="inline-flex items-center gap-2 hover:text-white rounded-md bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:from-slate-100 hover:to-gray-100 transition-all duration-200 border border-slate-200 hover:border-slate-300 hover:shadow-md active:scale-95 group hover:text-white"
                          title={content?.ctas?.contactUs || 'Get in touch with us'}
                      >
                          <UserIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                          {content?.ctas?.contactUs || 'Get in touch'}
                      </button>
                  </div>

        </div>
      )}

      {/* CHAT / ASSISTANT */}
      {showChat && (
        <>
          <div className="mx-auto max-w-4xl px-4">
            {/* Empty thread → landing */}
            {messages.length === 0 && (
              <div className="my-8 rounded-2xl border">
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  {/* <div className="rounded-full bg-blue-50 p-3 text-blue-600"><DollarSign size={28} /></div> */}
                  <h2 className="text-2xl font-semibold">{content?.assistant?.title}</h2>
                  <p className="text-muted-foreground">{content?.assistant?.subtitle}</p>

                                  <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                                      {(content?.assistant?.quickActions || []).map((qa) => {
                                          const Icon = qa?.icon && qaIconMap[qa.icon] ? qaIconMap[qa.icon] : null;
                                          return (
                                              <button
                                                variant="outline"
                                                  key={qa.id}
                                                  type="button"
                                                  onClick={() => setInputValue(qa.value || qa.label)}
                                                  className="inline-flex items-center justify-center gap-2 rounded-md bg-muted px-4 py-2 text-sm text-slate-700 hover:bg-blue-600 hover:text-white transition-colors"
                                                  title={qa.label}
                                                  aria-label={qa.label}
                                              >
                                                  {Icon && <Icon className="h-4 w-4" />}
                                                  <span className="font-normal">
                                                    {qa.label}
                                                    </span>
                                              </button>
                                          );
                                      })}
                                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-6">
              {messages.map((m) => (
                <div key={m.id} className={m.type === 'user' ? "flex justify-end" : "flex justify-start"}>
                  <div className={m.type === 'user'
                    ? "max-w-[680px] rounded-xl bg-blue-600 px-4 py-3 text-white"
                    : "max-w-[680px] rounded-xl bg-muted px-4 py-3"}>
                    {/* header row with avatar + time + (download for bot) */}
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                          {m.type === 'user' ? <UserIcon size={14} /> : <BotIcon size={14} />}
                        </div>
                        <span>{m.timestamp}</span>
                      </div>
                      {m.type === 'bot' && (
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 hover:text-white" onClick={handleDownloadPdf}>
                          <Download size={14} /> PDF
                        </Button>
                      )}
                    </div>

                    {/* body */}
                    <div  ref={chatRef}>
                      {m.type === 'bot'
                        ? <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(m.content) }} />
                        : <div style={{ whiteSpace: 'pre-wrap' }}>{String(m.content)}</div>}
                    </div>

                    {/* followups */}
                    {m.followups && m.followups.length > 0 && (
                      <div className="mt-3">
                        <div className="mb-2 text-xs font-medium text-muted-foreground">{content?.chat?.suggestionsTitle}</div>
                        <div className="flex flex-wrap gap-2">
                          {m.followups.map((f, i) => (
                            <button key={i} onClick={() => handleFollowupClick(f)} className="rounded-md bg-muted px-3 py-1 text-xs hover:bg-muted/80 hover:text-white">
                              {f?.question || 'Ask more'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* typing / loading bubble */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[680px] rounded-xl bg-muted px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex animate-pulse">…</span>
                      {loadingMessage && (<span className="flex items-center gap-1"><Clock size={16} /> {loadingMessage}</span>)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* (Optional) network error alert – toggle if you need it */}
            {/* <Alert variant="destructive" className="mt-6">
              <AlertDescription>
                <div className="font-medium">{content?.chat?.networkErrorTitle}</div>
                <div className="text-sm">{content?.chat?.networkErrorHint}</div>
              </AlertDescription>
            </Alert> */}
          </div>

          {/* input row */}
          <form className="mx-auto mt-6 max-w-4xl px-4 pb-6" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={content?.assistant?.inputPlaceholder || "Enter your Query"}
                disabled={isLoading}
                className="h-11"
              />
              <Button type="submit" disabled={isLoading || !inputValue.trim()} className="h-11">
                <Send size={20} />
              </Button>
            </div>
          </form>
        </>
      )}

      {/* More Apps Drawer */}
      <Drawer 
        isOpen={isMoreAppsOpen} 
        onClose={() => setIsMoreAppsOpen(false)}
        title={content?.moreApps?.drawerTitle || "More Apps from Us"}
      >
        <MoreAppsDrawer content={content} />
      </Drawer>
    </div>
  );
}