// // src/components/ChatInterface.jsx
// import React, { useState, useRef, useEffect } from 'react';
// import { invoke, view as forgeView , router } from '@forge/bridge';
// import { marked } from 'marked';
// import DOMPurify from 'dompurify';
// import html2pdf from 'html2pdf.js';

// // shadcn/ui
// import { Button } from './ui/button';
// import { Card, CardContent } from './ui/card';
// import { Input } from './ui/input';
// import { Separator } from './ui/separator';
// import { Alert, AlertDescription } from './ui/alert';
// import { Progress } from './ui/progress';
// import { Drawer } from './ui/drawer';
// import { MoreAppsDrawer } from './MoreAppsDrawer';

// // icons
// import {
//   Send, Bot as BotIcon, User as UserIcon, DollarSign,
//   HelpCircle, FileText, Bot, Zap, Ruler, ClipboardList, Download, Clock, ArrowLeft, Search, Users, Sliders, PiggyBank, Store
// } from 'lucide-react';

// // styles (keep yours; most visuals come from Tailwind/shadcn now)
// import './ChatInterface.css';

// /** ---------- Markdown helpers ---------- */
// marked.setOptions({ gfm: true, breaks: true });
// function safeJson(v){ try{return JSON.stringify(v,null,2);}catch{return String(v);} }
// function toMd(value){ if(value==null) return ""; if(typeof value==="string") return value; if(Array.isArray(value)) return value.map(v=>typeof v==="string"?v:safeJson(v)).join("\n"); return safeJson(value); }
// function stripDebugSuffix(md){ return String(md).replace(/\s*⚠️\s*\(\d+\)\s*\[[\s\S]*\]\s*$/m, "").trim(); }
// function renderMarkdownToSafeHtml(content){ const md=stripDebugSuffix(toMd(content)).replace(/\r\n/g,"\n"); const html=marked.parse(md); return DOMPurify.sanitize(html); }

// function formatStr(str, vars) {
//   if (!str) return '';
//   return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? String(vars[k]) : _));
// }

// const qaIconMap = {
//   search: Search,
//   users: Users,
//   sliders: Sliders,
//   'piggy-bank': PiggyBank,
// };

// export default function ChatInterface({
//   start,
//   showChat,
//   onBack,
//   onOpenChat,
//   lastScannedAt,
//   cooldownActive,
//   runStatus,
//   runLoading,
//   content,
//   locale,
// }) {
//   const [messages, setMessages] = useState([]);
//   const [inputValue, setInputValue] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [loadingMessage, setLoadingMessage] = useState('');
//   const [loadingTimeout, setLoadingTimeout] = useState(null);
//   const [isMoreAppsOpen, setIsMoreAppsOpen] = useState(false);
//   const messagesEndRef = useRef(null);
//   const chatRef = useRef(null);
//   const [cloudId, setCloudId] = useState(null);

//   // Use waiting messages from content, with a tiny fallback set
//   const waitingMessages = (content?.chat?.waitingMessages?.length
//     ? content.chat.waitingMessages
//     : ["Working on it...", "Analyzing data...", "Crunching numbers..."]);

//   const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   useEffect(() => { scrollToBottom(); }, [messages]);

//   useEffect(() => {
//     (async () => {
//       try { const { cloudId } = await forgeView.getContext(); if (cloudId) setCloudId(cloudId); }
//       catch (e) { console.error('Failed to load cloudId:', e); }
//     })();
//   }, []);

//   // Log locale and content changes for debugging
//   useEffect(() => {
//     // console.log('ChatInterface: Locale changed to:', locale);
//     // console.log('ChatInterface: Content pack loaded:', content?.heroTitle || 'Unknown');
//   }, [locale, content]);

//   const fmtTs = (ts) => {
//     if (!ts) return '—';
//     const n = Number(ts);
//     const d = isNaN(n) ? new Date(ts) : new Date(n);
    
//     // Use the resolved locale for date formatting
//     const localeMap = {
//       'en': 'en-US',
//       'fr': 'fr-FR', 
//       'es': 'es-ES',
//       'de': 'de-DE'
//     };
    
//     const resolvedLocale = localeMap[locale?.split('_')[0]] || 'en-US';
//     return d.toLocaleString(resolvedLocale, { 
//       timeZone: 'Asia/Kolkata',
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   // Parse "Processing ABC (3/10)…" → {current:3,total:10,pct:30}
//   function parseProgressFromStatus(s) {
//     if (!s) return null;
//     const m = /\((\d+)\s*\/\s*(\d+)\)/.exec(s);
//     if (!m) return null;
//     const current = parseInt(m[1], 10);
//     const total = parseInt(m[2], 10);
//     if (!total) return null;
//     return { current, total, pct: Math.round((current / total) * 100) };
//   }

//   const progress = parseProgressFromStatus(runStatus);
//   const isRunDisabled = runLoading || cooldownActive || !!lastScannedAt;

//   const handleRunClick = async () => {
//     try {
//       setMessages([]);   // clear transcript
//       await start();     // parent does the scan
//     } catch (e) {
//       console.error('start() failed:', e);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!inputValue.trim() || isLoading) return;

//     const userMessage = { id: Date.now(), type: 'user', content: inputValue, timestamp: new Date().toLocaleTimeString(locale?.split('_')[0] || 'en') };
//     setMessages(prev => [...prev, userMessage]);
//     setInputValue('');
//     setIsLoading(true);
//     setLoadingMessage('');

//     const timeout = setTimeout(() => {
//       const msg = waitingMessages[Math.floor(Math.random() * waitingMessages.length)];
//       setLoadingMessage(msg);
//     }, 7000);
//     setLoadingTimeout(timeout);

//     try {
//       const ctx = await forgeView.getContext();
//       const currentLocale = ctx?.locale || locale || 'en_US';
//       const userId = ctx?.accountId
//       const response = await invoke('queryPermissionAuditor', {
//         query: userMessage.content,
//         locale: currentLocale,
//         userId: userId,
//         event: 'permissionaudit',
//         orgId: cloudId
//       });

//      let answer = content?.defaultRetry?.retryMessage;
//       let followups = [];

//       const nested = response?.data?.data?.result;
//       const flat = response?.data?.result;
//       const result = nested || flat;

//       if (result?.answer) {
//         answer = toMd(result.answer);
//         followups = Array.isArray(result.followups) ? result.followups : [];
//       }

//       const botMessage = { id: Date.now() + 1, type: 'bot', content: answer, followups, timestamp: new Date().toLocaleTimeString(locale?.split('_')[0] || 'en') };
//       setMessages(prev => [...prev, botMessage]);
//     } catch (error) {
//       console.error('Error sending message:', error);
//       const errorMessage = { id: Date.now() + 1, type: 'error', content: content?.defaultRetry?.retryMessage, timestamp: new Date().toLocaleTimeString(locale?.split('_')[0] || 'en') };
//       setMessages(prev => [...prev, errorMessage]);
//     } finally {
//       setIsLoading(false);
//       setLoadingMessage('');
//       if (loadingTimeout) { clearTimeout(loadingTimeout); setLoadingTimeout(null); }
//     }
//   };

//   const handleFollowupClick = (f) => setInputValue(f?.question || '');

//   const handleDownloadPdf = async () => {
//     if (!chatRef.current) return;
//     const wrapper = document.createElement('div');
//     wrapper.style.padding = '16px';
//     wrapper.style.fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
//     wrapper.style.color = '#0f172a';
//     const heading = document.createElement('div');
//     heading.innerHTML = `
//       <h2 style="margin:0 0 4px 0;">${content?.assistant?.title || 'License Optimization Assistant'}</h2>
//       <div style="font-size:12px;color:#475569;margin-bottom:12px;">
//         Transcript • ${new Date().toLocaleString(locale?.split('_')[0] || 'en')}
//       </div>
//       <hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0 16px 0;" />
//     `;
//     wrapper.appendChild(heading);
//     wrapper.appendChild(chatRef.current.cloneNode(true));
//     await html2pdf().set({
//       margin: [10,10,10,10],
//       filename: `permission-auditor-chat-${new Date().toISOString().slice(0,10)}.pdf`,
//       image: { type: 'jpeg', quality: 0.98 },
//       html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
//       jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
//       pagebreak: { mode: ['css', 'legacy'] }
//     }).from(wrapper).save();
//   };

//   const resetWindow = () => onBack?.();
//   const resetToChat = () => onOpenChat?.();

//   /** ----------------- UI ----------------- */
//   return (
//     <div className="min-h-screen bg-background text-foreground">
//       {/* Top bar when chat is open (back + last scanned) */}
//       {showChat && (
//         <>
//         <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          
//               <ArrowLeft  onClick={resetWindow} 
//               className="h-5 w-5 cursor-pointer text-slate-700 hover:text-blue-600 transition-colors"
//                aria-label={content?.ctas?.back || 'Back'}
//                 title={content?.ctas?.back || 'Back'}
//               />
//           {lastScannedAt && (
//             <div className="text-xs text-muted-foreground">
//               <strong>{content?.labels?.lastScanned || 'Last scanned:'}</strong> {fmtTs(lastScannedAt)}
//             </div>
//           )}
//         </div>
//         <Separator />
//         </>
//       )}

//       {!showChat && (
//         <div className="mx-auto max-w-5xl px-4 pb-4">
//           <h1 className="text-center text-4xl font-semibold tracking-tight">{content?.heroTitle}</h1>
//           <p className="mt-2 text-center text-lg text-muted-foreground">{content?.heroSubtitle}</p>

//           <Card className="mt-4 rounded-xl">
//             <CardContent className="space-y-2 p-3">
//               {(content?.specRows || []).map((row) => (
//                 <div key={row.id} className="grid grid-cols-[220px_1fr] items-start gap-4 rounded-md bg-muted/40 px-3 py-2">
//                   <div className="flex items-center gap-2 font-semibold underline">
//                     {row.id === 'solves' && <ClipboardList className="h-4 w-4 text-muted-foreground" />}
//                     {row.id === 'who' && <HelpCircle className="h-4 w-4 text-muted-foreground" />}
//                     {row.id === 'inside' && <FileText className="h-4 w-4 text-muted-foreground" />}
//                     {row.id === 'ai' && <Bot className="h-4 w-4 text-muted-foreground" />}
//                     {row.id === 'build' && <Zap className="h-4 w-4 text-muted-foreground" />}
//                     {row.id === 'measure' && <Ruler className="h-4 w-4 text-muted-foreground" />}
//                     {row.label}
//                   </div>
//                   <div className="space-y-1 text-sm underline">
//                     {(row.links || []).map((l, i) => <div key={i}>
//                         {/* <a href="#">{l}</a> */}
//                         <span>{l}</span>
//                         </div>)}
//                   </div>
//                 </div>
//               ))}
//             </CardContent>
//           </Card>

//           <div className="mt-4 flex flex-col items-center gap-3">
//             {!lastScannedAt ? (
//               <Button onClick={handleRunClick} disabled={isRunDisabled}>
//                 {runLoading ? 'Running…' : (content?.ctas?.run || 'Run')}
//               </Button>
//             ) : (
//               <>
//                 <div className="text-xs text-muted-foreground">
//                   <strong>{content?.labels?.lastScanned || 'Last scanned :'}</strong> {fmtTs(lastScannedAt)}
//                 </div>
//                 <div className="flex gap-2">
//                   <Button onClick={handleRunClick} disabled={runLoading}>
//                     {content?.ctas?.rescan || 'Rescan'}
//                   </Button>
//                   <Button onClick={resetToChat} disabled={runLoading}>
//                     {content?.ctas?.analyse || 'Analyse'}
//                   </Button>
//                 </div>
//                 {/* Progress (when runStatus has (x/y)) */}
//                 {progress && (
//                   <div className="w-[300px]">
//                     <Progress value={progress.pct} />
//                     <div className="mt-1 text-center text-[11px] text-muted-foreground">
//                       {/* Language-agnostic version */}
//                       {/* Scanning project {progress.current} of {progress.total}. */}
//                       {formatStr(content?.labels?.scanningProgress || 'Scanning project {current} of {total}.', {
//                         current: progress.current,
//                         total: progress.total
//                       })}
//                     </div>
//                   </div>
//                 )}
//               </>
//             )}

//             {/* status line */}
//             {runStatus && !progress && (
//               <div className="text-sm text-muted-foreground">{runStatus}</div>
//             )}
//           </div>

//                   <div className="flex items-center justify-between">
//                       {/* "More apps from us" - now a clickable button that opens drawer */}
//                       <button
//                           onClick={() => setIsMoreAppsOpen(true)}
//                           className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:from-blue-600 hover:to-indigo-600 hover:text-white transition-all duration-200 border border-blue-200 hover:border-blue-600 hover:shadow-md active:scale-95"
//                           title={content?.moreApps?.title || 'Discover more apps from our company'}
//                       >
//                           <Store className="h-4 w-4" />
//                           {content?.ctas?.moreApps || 'More apps from us'}
//                       </button>

//                       {/* Contact us button - styled similar to "More apps" */}
//                       <button
//                            onClick={() =>
//                               router.open(
//                                   'https://clovity.com/contact',
//                                   '_blank',
//                                   'noopener,noreferrer'
//                               )
//                           }
//                           className="inline-flex items-center gap-2 hover:text-white rounded-md bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:from-slate-100 hover:to-gray-100 transition-all duration-200 border border-slate-200 hover:border-slate-300 hover:shadow-md active:scale-95 group hover:text-white"
//                           title={content?.ctas?.contactUs || 'Get in touch with us'}
//                       >
//                           <UserIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
//                           {content?.ctas?.contactUs || 'Get in touch'}
//                       </button>
//                   </div>

//         </div>
//       )}

//       {/* CHAT / ASSISTANT */}
//       {showChat && (
//         <>
//           <div className="mx-auto max-w-4xl px-4">
//             {/* Empty thread → landing */}
//             {messages.length === 0 && (
//               <div className="my-8 rounded-2xl border">
//                 <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
//                   {/* <div className="rounded-full bg-blue-50 p-3 text-blue-600"><DollarSign size={28} /></div> */}
//                   <h2 className="text-2xl font-semibold">{content?.assistant?.title}</h2>
//                   <p className="text-muted-foreground">{content?.assistant?.subtitle}</p>

//                                   <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
//                                       {(content?.assistant?.quickActions || []).map((qa) => {
//                                           const Icon = qa?.icon && qaIconMap[qa.icon] ? qaIconMap[qa.icon] : null;
//                                           return (
//                                               <button
//                                                 variant="outline"
//                                                   key={qa.id}
//                                                   type="button"
//                                                   onClick={() => setInputValue(qa.value || qa.label)}
//                                                   className="inline-flex items-center justify-center gap-2 rounded-md bg-muted px-4 py-2 text-sm text-slate-700 hover:bg-blue-600 hover:text-white transition-colors"
//                                                   title={qa.label}
//                                                   aria-label={qa.label}
//                                               >
//                                                   {Icon && <Icon className="h-4 w-4" />}
//                                                   <span className="font-normal">
//                                                     {qa.label}
//                                                     </span>
//                                               </button>
//                                           );
//                                       })}
//                                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Messages */}
//             <div className="space-y-6">
//               {messages.map((m) => (
//                 <div key={m.id} className={m.type === 'user' ? "flex justify-end" : "flex justify-start"}>
//                   <div className={m.type === 'user'
//                     ? "max-w-[680px] rounded-xl bg-blue-600 px-4 py-3 text-white"
//                     : "max-w-[680px] rounded-xl bg-muted px-4 py-3"}>
//                     {/* header row with avatar + time + (download for bot) */}
//                     <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
//                       <div className="flex items-center gap-2">
//                         <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
//                           {m.type === 'user' ? <UserIcon size={14} /> : <BotIcon size={14} />}
//                         </div>
//                         <span>{m.timestamp}</span>
//                       </div>
//                       {m.type === 'bot' && (
//                         <Button size="sm" variant="outline" className="h-7 gap-1 px-2 hover:text-white" onClick={handleDownloadPdf}>
//                           <Download size={14} /> PDF
//                         </Button>
//                       )}
//                     </div>

//                     {/* body */}
//                     <div  ref={chatRef}>
//                       {m.type === 'bot'
//                         ? <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(m.content) }} />
//                         : <div style={{ whiteSpace: 'pre-wrap' }}>{String(m.content)}</div>}
//                     </div>

//                     {/* followups */}
//                     {m.followups && m.followups.length > 0 && (
//                       <div className="mt-3">
//                         <div className="mb-2 text-xs font-medium text-muted-foreground">{content?.chat?.suggestionsTitle}</div>
//                         <div className="flex flex-wrap gap-2">
//                           {m.followups.map((f, i) => (
//                             <button key={i} onClick={() => handleFollowupClick(f)} className="rounded-md bg-muted px-3 py-1 text-xs hover:bg-muted/80 hover:text-white">
//                               {f?.question || 'Ask more'}
//                             </button>
//                           ))}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               ))}

//               {/* typing / loading bubble */}
//               {isLoading && (
//                 <div className="flex justify-start">
//                   <div className="max-w-[680px] rounded-xl bg-muted px-4 py-3">
//                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                       <span className="inline-flex animate-pulse">…</span>
//                       {loadingMessage && (<span className="flex items-center gap-1"><Clock size={16} /> {loadingMessage}</span>)}
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* (Optional) network error alert – toggle if you need it */}
//             {/* <Alert variant="destructive" className="mt-6">
//               <AlertDescription>
//                 <div className="font-medium">{content?.chat?.networkErrorTitle}</div>
//                 <div className="text-sm">{content?.chat?.networkErrorHint}</div>
//               </AlertDescription>
//             </Alert> */}
//           </div>

//           {/* input row */}
//           <form className="mx-auto mt-6 max-w-4xl px-4 pb-6" onSubmit={handleSubmit}>
//             <div className="flex items-center gap-2">
//               <Input
//                 value={inputValue}
//                 onChange={(e) => setInputValue(e.target.value)}
//                 placeholder={content?.assistant?.inputPlaceholder || "Enter your Query"}
//                 disabled={isLoading}
//                 className="h-11"
//               />
//               <Button type="submit" disabled={isLoading || !inputValue.trim()} className="h-11">
//                 <Send size={20} />
//               </Button>
//             </div>
//           </form>
//         </>
//       )}

//       {/* More Apps Drawer */}
//       <Drawer 
//         isOpen={isMoreAppsOpen} 
//         onClose={() => setIsMoreAppsOpen(false)}
//         title={content?.moreApps?.drawerTitle || "More Apps from Us"}
//       >
//         <MoreAppsDrawer content={content} />
//       </Drawer>
//     </div>
//   );
// }


// src/components/ChatInterface.jsx
import { useState, useRef, useEffect } from 'react';
import { invoke, view as forgeView, router } from '@forge/bridge';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';

// shadcn/ui
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Drawer } from './ui/drawer';
import { MoreAppsDrawer } from './MoreAppsDrawer';

// icons
import {
  Bot as BotIcon, User as UserIcon, Download, Clock, ArrowLeft,
  Search, Users, Sliders, PiggyBank, Store
} from 'lucide-react';

// fonts & global styles
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/400-italic.css";
import "@fontsource/poppins/600-italic.css";
import "../index.css";

/* ---------------- Markdown helpers ---------------- */
marked.setOptions({ gfm: true, breaks: true });
function safeJson(v){ try { return JSON.stringify(v,null,2); } catch { return String(v); } }
function toMd(value){ if(value==null) return ""; if(typeof value==="string") return value; if(Array.isArray(value)) return value.map(v=>typeof v==="string"?v:safeJson(v)).join("\n"); return safeJson(value); }
function stripDebugSuffix(md){ return String(md).replace(/\s*⚠️\s*\(\d+\)\s*\[[\s\S]*\]\s*$/m,"").trim(); }
function renderMarkdownToSafeHtml(content){ const md=stripDebugSuffix(toMd(content)).replace(/\r\n/g,"\n"); const html=marked.parse(md); return DOMPurify.sanitize(html); }
function formatStr(str,vars){ if(!str) return ''; return String(str).replace(/\{(\w+)\}/g,(_,k)=>(vars&&k in vars?String(vars[k]):_)); }

/* ---------------- Small SVG components (currentColor) ---------------- */
const Svg = ({ viewBox="0 0 24 24", size=24, className, children }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={viewBox} fill="none" className={className}>
    {children}
  </svg>
);

const SolvesIcon = ({ className, size=24 }) => (
  <Svg className={className} size={size}>
    {[
      "M15.0098 3.00001L14.9998 3.01112",
      "M11.0098 3.00001L10.9998 3.01112",
      "M7.00977 3.00001L6.99977 3.01112",
      "M3.00977 3.00001L2.99977 3.01112",
      "M3.00977 7.00001L2.99977 7.01112",
      "M3.00977 11L2.99977 11.0111",
      "M3.00977 15L2.99977 15.0111",
      "M8.99977 21.01L9.00977 20.9989",
      "M12.9998 21.01L13.0098 20.9989",
      "M16.9998 21.01L17.0098 20.9989",
      "M20.9998 21.01L21.0098 20.9989",
      "M20.9998 17.01L21.0098 16.9989",
      "M20.9998 13.01L21.0098 12.9989",
      "M20.9998 9.01L21.0098 8.99889",
    ].map((d,i)=>(
      <path key={i} d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ))}
    <path d="M9 17L9 10C9 9.44772 9.44772 9 10 9L17 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 7L15 14C15 14.5523 14.5523 15 14 15L7 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

const WhoIcon = ({ className, size=24 }) => (
  <Svg className={className} size={size}>
    <path d="M7.90039 8.07954C7.90039 3.30678 15.4004 3.30682 15.4004 8.07955C15.4004 11.4886 11.9913 10.8067 11.9913 14.8976" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 19.01L12.01 18.9989" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const InsideIcon = ({ className, size=24 }) => (
  <Svg className={className} size={size}>
    <path d="M19.4 20H9.6C9.26863 20 9 19.7314 9 19.4V9.6C9 9.26863 9.26863 9 9.6 9H19.4C19.7314 9 20 9.26863 20 9.6V19.4C20 19.7314 19.7314 20 19.4 20Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 9V4.6C15 4.26863 14.7314 4 14.4 4H4.6C4.26863 4 4 4.26863 4 4.6V14.4C4 14.7314 4.26863 15 4.6 15H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AiIcon = ({ className, size=20 }) => (
  <Svg className={className} size={size} viewBox="0 0 20 20">
    <path d="M5.68302 18.3333L5.68305 15.9524C5.55318 14.6599 4.69526 13.6803 3.903 12.4999M12.0467 18.3333L12.0467 16.9047C16.1375 16.9047 15.683 12.143 15.683 12.143C15.683 12.143 17.5012 12.143 17.5012 10.2383L15.683 7.38125C15.683 3.57185 12.5924 1.70133 9.31941 1.66715C7.48571 1.64801 6.02187 2.10928 4.9279 2.91658" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.8333 5.83333L12.5 7.91667L10.8333 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.16667 5.83333L2.5 7.91667L4.16667 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.33334 5L6.66667 10.8333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BuildIcon = ({ className, size=24 }) => (
  <Svg className={className} size={size}>
    <path d="M13 10V3L5 14H11V21L19 10H13Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MeasureIcon = ({ className, size=24 }) => (
  <Svg className={className} size={size}>
    <path d="M16 20V12M16 12L19 15M16 12L13 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 14L12 6L15 9L20 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ROW_ICONS = { solves: SolvesIcon, who: WhoIcon, inside: InsideIcon, ai: AiIcon, build: BuildIcon, measure: MeasureIcon };
const RowIcon = ({ id, className }) => {
  const C = ROW_ICONS[id];
  if (!C) return null;
  return <C className={className} />;
};

/* ---------------- QA Icon map (lucide) ---------------- */
const qaIconMap = { search: Search, users: Users, sliders: Sliders, 'piggy-bank': PiggyBank };

/* ---------------- Component ---------------- */
export default function ChatInterface({
  start, showChat, onBack, onOpenChat, lastScannedAt, cooldownActive,
  runStatus, runLoading, content, locale,
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

  const fmtTs = (ts) => {
    if (!ts) return '—';
    const n = Number(ts);
    const d = isNaN(n) ? new Date(ts) : new Date(n);
    const localeMap = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE' };
    const resolvedLocale = localeMap[locale?.split('_')[0]] || 'en-US';
    return d.toLocaleString(resolvedLocale, {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  function parseProgressFromStatus(s){
    if(!s) return null;
    const m=/\((\d+)\s*\/\s*(\d+)\)/.exec(s);
    if(!m) return null;
    const current=parseInt(m[1],10), total=parseInt(m[2],10);
    if(!total) return null;
    return { current, total, pct: Math.round((current/total)*100) };
  }
  const progress = parseProgressFromStatus(runStatus);
  const isRunDisabled = runLoading || cooldownActive || !!lastScannedAt;

  const handleRunClick = async () => {
    try { setMessages([]); await start(); } catch(e){ console.error('start() failed:', e); }
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
      const userId = ctx?.accountId;
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
      const errorMessage = { id: Date.now() + 1, type: 'error', content: content?.defaultRetry?.retryMessage, timestamp: new Date().toLocaleTimeString(locale?.split('_')[0] || 'en') };
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
    wrapper.style.fontFamily = 'Poppins, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    wrapper.style.color = '#0f172a';
    const heading = document.createElement('div');
    heading.innerHTML = `
      <h1 style="margin:0 0 4px 0;">${content?.assistant?.title || 'Permission Auditor Assistant'}</h1>
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
      pagebreak: { mode: ['css','legacy'] }
    }).from(wrapper).save();
  };

  const resetWindow = () => onBack?.();
  const resetToChat = () => onOpenChat?.();

  return (
    <>
      {/* 3-row grid layout: 40px header / scrollable main / 80px footer */}
      <div className="grid grid-rows-[40px_1fr_80px] h-[99dvh]">
        {/* HEADER */}
        <header className="row-start-1 bg-white">
          {showChat ? (
            <div className="mx-auto flex h-[40px] border-b border-[#222] w-full items-center justify-between px-4">
              <ArrowLeft
                onClick={resetWindow}
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
          ) : (
            <div className="h-[40px]" />
          )}
        </header>

        {/* MAIN */}
        <main className={`row-start-2 ${showChat && messages.length !== 0 ? "overflow-y-auto no-scrollbar" : "grid place-items-center"}`}>
          {/* LANDING */}
          {!showChat && (
            <div className="mx-auto pb-2">
              <h1 className="text-center text-[44px] font-semibold text-[#222] !font-sans">{content?.heroTitle}</h1>
              <p className="mt-2 text-center text-[28px] font-normal text-[#5B5B5B]">{content?.heroSubtitle}</p>

              <Card className="my-8 rounded-xl mx-auto w-max">
                <CardContent className="space-y-2 p-2 bg-[rgba(233,242,254,0.6)]">
                  {(content?.specRows || []).map((row) => (
                    <div key={row.id} className="grid grid-cols-[270px_1fr] items-start gap-y-1 px-2 py-0.5">
                      <div className="flex items-center gap-3 font-semibold text-[16px]">
                        <RowIcon id={row.id} className="h-5 w-5 text-[#131927]" />
                        {row.label}
                      </div>
                      <div className="space-y-1 text-[16px]">
                        {(row.links || []).map((l, i) => <div key={i}><span>{l}</span></div>)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="mt-8 flex flex-col items-center gap-3">
                {(!lastScannedAt) ? (
                  <Button onClick={handleRunClick} disabled={isRunDisabled}>
                    {runLoading ? 'Running…' : (content?.ctas?.run || 'Run')}
                  </Button>
                ) : (
                  <>
                    <div className="text-xs">
                      <strong>{content?.labels?.lastScanned || 'Last scanned :'}</strong> <i>{fmtTs(lastScannedAt)}</i>
                    </div>
                    <div className="flex gap-2 z-[9999]">
                      <Button onClick={handleRunClick} disabled={runLoading} className="!rounded-[3px]">
                        {content?.ctas?.rescan || 'Rescan'}
                      </Button>
                      <Button onClick={resetToChat} disabled={runLoading} className="!rounded-[3px]">
                        {content?.ctas?.analyse || 'Analyse'}
                      </Button>
                    </div>

                    {parseProgressFromStatus(runStatus) && (
                      <div className="w-[300px]">
                        <Progress value={parseProgressFromStatus(runStatus).pct} />
                        <div className="mt-1 text-center text-[12px] text-muted-foreground">
                          <i>
                            {formatStr(content?.labels?.scanningProgress || 'Scanning {current} Project out of {total} Projects.', {
                              current: parseProgressFromStatus(runStatus).current,
                              total: parseProgressFromStatus(runStatus).total,
                            })}
                          </i>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {runStatus && !parseProgressFromStatus(runStatus) && (
                  <div className="text-sm">{runStatus}</div>
                )}
              </div>
            </div>
          )}

          {/* CHAT */}
          {showChat && (
            <div className="mx-auto w-full px-4 py-6">
              {messages.length === 0 && (
                <div className="my-2">
                  <div className="flex flex-col items-center gap-2 px-6 py-4 text-center">
                    <h1 className="text-center text-[44px] font-semibold text-[#222] !font-sans">{content?.assistant?.title}</h1>
                    <p className="mt-2 text-center text-[28px] font-normal text-[#5B5B5B]">{content?.assistant?.subtitle}</p>
                    <div className="my-8 grid grid-cols-1 gap-5 sm:grid-cols-2 gap-x-[200px] pt-5">
                      {(content?.assistant?.quickActions || []).map((qa) => {
                        const Icon = qa?.icon && qaIconMap[qa.icon] ? qaIconMap[qa.icon] : null;
                        return (
                          <button
                            key={qa.id}
                            type="button"
                            onClick={() => setInputValue(qa.value || qa.label)}
                            className="inline-flex justify-start min-w-[240px] items-center gap-2 rounded-[5px] px-2.5 py-2 text-[15px] bg-[rgba(233,242,254,0.6)] hover:bg-blue-600 hover:text-white transition-colors"
                            title={qa.label}
                            aria-label={qa.label}
                          >
                            {Icon && <Icon className="h-4 w-4" />}
                            <span className="font-normal">{qa.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <form className="justify-self-center" onSubmit={handleSubmit}>
                      <div className="flex items-center gap-2 w-[600px] border p-1 rounded-[5px] shadow-sm bg-white">
                        <Input
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder={content?.assistant?.inputPlaceholder || "Enter your Query"}
                          disabled={isLoading}
                          className="h-11 border-none outline-none focus-visible:ring-0 focus:ring-0 flex-grow bg-transparent"
                        />
                        <Button type="submit" disabled={isLoading || !inputValue.trim()} className="h-10 !px-2 !rounded-[3px]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12.25 18.5V6M12.25 6L18.25 12M12.25 6L6.25 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {messages.length > 0 && (
                <div className="mx-auto max-w-6xl">
                  <div className="space-y-5 select-text">
                    {messages.map((m) => {
                      const isUser = m.type === 'user';
                      return (
                        <div key={m.id} className={`flex items-start ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={[
                              'max-w-[680px] w-fit break-words overflow-hidden',
                              'px-4 py-3 rounded-[3px] shadow-sm',
                              isUser ? 'bg-blue-600 text-white' : 'bg-muted border border-border text-foreground',
                            ].join(' ')}
                          >
                            <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                                  {isUser ? <UserIcon size={14} /> : <BotIcon size={14} />}
                                </div>
                                <span>{m.timestamp}</span>
                              </div>

                              {m.type === 'bot' && (
                                <Button size="sm" variant="outline" className="h-7 gap-1 px-2" onClick={handleDownloadPdf}>
                                  <Download size={14} /> PDF
                                </Button>
                              )}
                            </div>

                            <div ref={chatRef}>
                              {m.type === 'bot' ? (
                                <div
                                  className={[
                                    'prose prose-sm max-w-none',
                                    'prose-headings:mt-3 prose-headings:mb-2',
                                    'prose-p:my-2 prose-ul:my-2 prose-ol:my-2',
                                    'prose-pre:my-3 prose-pre:overflow-x-auto',
                                    'prose-img:rounded-md prose-a:break-words',
                                  ].join(' ')}
                                  dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(m.content) }}
                                />
                              ) : (
                                <div className="whitespace-pre-wrap leading-relaxed">
                                  {String(m.content)}
                                </div>
                              )}
                            </div>

                            {m.followups?.length > 0 && (
                              <div className="mt-3">
                                <div className="mb-2 text-xs font-medium text-blue-600">
                                  {content?.chat?.suggestionsTitle}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {m.followups.map((f, i) => (
                                    <button
                                      key={i}
                                      onClick={() => handleFollowupClick(f)}
                                      className="rounded-md border !text-left border-border p-2 text-xs hover:text-white hover:bg-blue-600 transition-colors"
                                    >
                                      {f?.question || 'Ask more'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="max-w-[680px] w-fit rounded-[3px] border px-4 py-1 shadow-sm">
                          <div className="flex items-center gap-2 text-sm">
                            {loadingMessage ? (
                              <span className="flex items-center gap-1">
                                <Clock size={16} /> {loadingMessage}
                              </span>
                            ) : "Processing..."}
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* FOOTER */}
        <footer className="row-start-3">
          <div className={`mx-auto max-w-6xl w-full grid ${(!showChat || messages.length === 0) ? "grid-cols-[1fr_auto]" : "grid-cols-[1fr_auto_1fr]"} items-center gap-2 py-2 px-4`}>
            {/* Left: More apps */}
            <button
              onClick={() => setIsMoreAppsOpen(true)}
              className="pt-1 inline-flex items-center gap-2 text-[16px] font-medium text-[#9E9E9E] hover:text-blue-600 transition-all duration-200 active:scale-95 shadow-none justify-self-start"
              title={content?.moreApps?.title || 'Discover more apps from our company'}
            >
              <Store className="h-4 w-4" />
              {content?.ctas?.moreApps || 'More from us'}
            </button>

            {showChat && messages.length !== 0 && (
              <form className="justify-self-center" onSubmit={handleSubmit}>
                <div className="flex items-center gap-2 w-[600px] border p-1 rounded-[5px] shadow-sm bg-white">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={content?.assistant?.inputPlaceholder || "Enter your Query"}
                    disabled={isLoading}
                    className="h-11 border-none outline-none focus-visible:ring-0 focus:ring-0 flex-grow bg-transparent"
                  />
                  <Button type="submit" disabled={isLoading || !inputValue.trim()} className="h-10 !px-2 !rounded-[3px]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12.25 18.5V6M12.25 6L18.25 12M12.25 6L6.25 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Button>
                </div>
              </form>
            )}

            {/* Right: Contact */}
            <button
              onClick={() => router.open('https://clovity.com/contact', '_blank', 'noopener,noreferrer')}
              className="pt-1 inline-flex items-center gap-2 text-[16px] font-medium text-[#9E9E9E] hover:text-blue-600 transition-all duration-200 active:scale-95 shadow-none justify-self-end"
              title={content?.ctas?.contactUs || 'Get in touch with us'}
            >
              <UserIcon className="h-4 w-4" />
              {content?.ctas?.contactUs || 'Get in touch'}
            </button>
          </div>
        </footer>
      </div>

      {/* Drawer */}
      <Drawer
        isOpen={isMoreAppsOpen}
        onClose={() => setIsMoreAppsOpen(false)}
        title={content?.moreApps?.drawerTitle || "More Apps from Us"}
      >
        <MoreAppsDrawer content={content} />
      </Drawer>
    </>
  );
}