import React, { useState, useRef, useEffect } from 'react';
import { invoke, view as forgeView } from '@forge/bridge';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';
import { Send, Bot, User, Clock, Download, ShieldCheck } from 'lucide-react';
import './ChatInterface.css';

/** ---------- Markdown helpers (no remark/rehype) ---------- */
marked.setOptions({ gfm: true, breaks: true });

function safeJson(v) { try { return JSON.stringify(v, null, 2); } catch { return String(v); } }
function toMarkdownString(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(v => (typeof v === "string" ? v : safeJson(v))).join("\n");
  return safeJson(value);
}
function stripDebugSuffix(md) { return String(md).replace(/\s*⚠️\s*\(\d+\)\s*\[[\s\S]*\]\s*$/m, "").trim(); }
function renderMarkdownToSafeHtml(content) {
  const md = stripDebugSuffix(toMarkdownString(content)).replace(/\r\n/g, "\n");
  const html = marked.parse(md);
  return DOMPurify.sanitize(html);
}

const ChatInterface = ({ start, showChat, onBack, onOpenChat, lastScannedAt, cooldownActive, runStatus, runLoading }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingTimeout, setLoadingTimeout] = useState(null);
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);
  const [cloudId, setCloudId] = useState(null);
  const [rescanLoading, setRescanLoading] = useState(false);

  const waitingMessages = [
  "🔄 Scanning all permission schemes...",
  "🛡️ Auditing user roles and access rights...",
  "🔍 Checking for hidden admin privileges...",
  "📊 Mapping users, groups, and roles...",
  "🚦 Detecting risky permission overlaps...",
  "🧩 Piecing together project access levels...",
  "⚙️ Reviewing global vs. project permissions...",
  "📡 Tracing user access across groups...",
  "🔐 Identifying overexposed permissions...",
  "🕵️ Searching for unauthorized access risks...",
  "📑 Analyzing permission scheme details...",
  "🗂️ Cross-checking users against groups...",
  "🏗️ Validating permission scheme structures...",
  "🧭 Guiding towards least-privilege access...",
  "⚡ Highlighting critical security gaps...",
  "🛠️ Checking consistency across projects...",
  "📌 Pinpointing who has powerful roles...",
  "🛰️ Tracking inherited permissions...",
  "🔮 Predicting potential compliance risks...",
  "🚀 Strengthening security for safer projects..."
];


  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fmtTs = (ts) => {
    if (!ts) return '—';
    const n = Number(ts);
    const d = isNaN(n) ? new Date(ts) : new Date(n);
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  const isRunDisabled = runLoading || cooldownActive || !!lastScannedAt;

  useEffect(() => {
    (async () => {
      try {
        const { cloudId } = await forgeView.getContext();
        if (!cloudId) return;
        setCloudId(cloudId);
      } catch (e) {
        console.error('Failed to load cloudId:', e);
      }
    })();
  }, []);

  // ---------- run click ----------
  const handleClick = async () => {
    try {
      setMessages([]);            // clear transcript for a fresh run
      await start();              // parent orchestrates job/poll/stream/llm/open chat
    } catch (e) {
      console.error('Start function failed:', e);
    }
  };

  const resetWindow = () => { onBack?.(); };
  const resetToChat = () => { onOpenChat?.(); };

  // ---------- chat handlers (remain in child) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setLoadingMessage('');

    const timeout = setTimeout(() => {
      const randomMessage = waitingMessages[Math.floor(Math.random() * waitingMessages.length)];
      setLoadingMessage(randomMessage);
    }, 7000);
    setLoadingTimeout(timeout);

    try {
      const response = await invoke('queryPermissionAuditor', {
        query: userMessage.content,
        event: 'permissionaudit',
        orgId: cloudId
      });

      let answer = '';
      let followups = [];
      if (response?.data?.success && response?.data?.data?.result) {
        const result = response.data.data.result;
        answer = result?.answer ? toMarkdownString(result.answer) : 'Sorry, I received an unexpected response format. Please try again.';
        followups = Array.isArray(result?.followups) ? result.followups : [];
      } else {
        answer = 'Sorry, I received an unexpected response format. Please try again.';
        followups = [];
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: answer,
        followups,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      if (error.response) {
        const errorData = error.response.data;
        errorContent = errorData?.error
          ? `Server error: ${error.response.status} - ${errorData.error}`
          : `Server error: ${error.response.status} - ${errorData?.message || 'Unknown error'}`;
      } else if (error.request) {
        errorContent = 'Network error: Unable to connect to the server. Please check if the backend is running.';
      } else {
        errorContent = `Error: ${error.message}`;
      }
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: errorContent,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
    }
  };

  const handleFollowupClick = (followup) => {
    setInputValue(followup.question);
  };

  const handleDownloadPdf = async () => {
    if (!chatRef.current) return;

    const wrapper = document.createElement('div');
    wrapper.style.padding = '16px';
    wrapper.style.fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    wrapper.style.color = '#0f172a';
    const heading = document.createElement('div');
    heading.innerHTML = `
      <h2 style="margin:0 0 4px 0;">Workflow Analyzer Assistant</h2>
      <div style="font-size:12px;color:#475569;margin-bottom:12px;">
        Transcript • ${new Date().toLocaleString()}
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:8px 0 16px 0;" />
    `;
    wrapper.appendChild(heading);

    const clone = chatRef.current.cloneNode(true);
    wrapper.appendChild(clone);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `workflow-analyzer-chat-${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    await html2pdf().set(opt).from(wrapper).save();
  };

  return (
    <div className="chat-container">
      {/* Header with Back + Last Scan */}
      <div className="rescan-container">
        {showChat && (
          <div className="rescan-header">
            <div className="lastScannedTime">
              {lastScannedAt && <div><strong>Last scanned:</strong> {fmtTs(lastScannedAt)}</div>}
            </div>
            <button
              onClick={() => resetWindow()}
              style={{
                background: rescanLoading ? '#94a3b8' : '#0ea5e9',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 14px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Back
            </button>
          </div>
        )}
      </div>

      {/* Welcome / Run section */}
      {!showChat && (
        <div className='welcomeContainer'>
          <div className='headContainer'>
    <h2>Welcome to Permission Auditor</h2>
  </div>
  <h3 className='headDesc'>
    Run the assistant to analyze your Jira project permissions and uncover hidden risks.  
    You’ll then be able to review detailed insights and recommendations for tightening access and improving security.
  </h3>

  <ul className='welcomeList'>
    <li><strong>What it solves:</strong> Overexposed permissions, unauthorized access, role misconfigurations, group overlaps, and hidden security risks.</li>
    <li><strong>Who it’s for:</strong> Jira Administrators, Project Leads, Compliance Teams, Security Officers, and IT Governance teams.</li>
    <li><strong>What’s inside each analysis:</strong> Permission scheme mapping, user-to-group breakdowns, role visibility, admin privilege detection, and potential conflicts.</li>
    <li><strong>AI in action:</strong> Pattern recognition, anomaly detection, and risk scoring to flag misconfigurations and suggest best practices.</li>
    <li><strong>Measure impact:</strong> Reduced security vulnerabilities, clearer ownership, controlled access, improved compliance, and stronger audit readiness.</li>
  </ul>

          <div className='buttDiv'>
            <button
              onClick={handleClick}
              disabled={isRunDisabled}
              style={{
                background: isRunDisabled ? '#94a3b8' : '#0ea5e9',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 14px',
                cursor: isRunDisabled ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              {runLoading ? 'Running…' : 'Run Permission Auditor Assistant'}
            </button>

            <div className='lastScan'>
              {lastScannedAt && <div><strong>Last scanned:</strong> {fmtTs(lastScannedAt)}</div>}
            </div>
          </div>

          {/* live run status ticker */}
          {runStatus && <div className='runStatus'>{runStatus}</div>}

          {lastScannedAt && (
            <div className='reBack'>
              <button
                onClick={handleClick}
                disabled={runLoading}
                style={{
                  background: runLoading ? '#94a3b8' : '#0ea5e9',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 14px',
                  cursor: runLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Rescan
              </button>
              <button
                onClick={resetToChat}
                disabled={runLoading}
                style={{
                  background: runLoading ? '#94a3b8' : '#0ea5e9',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 14px',
                  cursor: runLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Chat
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chat section */}
      {showChat && (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="welcome-message">
  <div className="welcome-icon">
    <ShieldCheck size={48} />
  </div>
  <h2>Welcome to Permission Auditor Assistant</h2>
  <p>
    Ask me anything about analyzing Jira project permissions, identifying risks, checking user access, 
    or improving security and compliance.
  </p>
  <div className="suggestions">
    <h3>Try asking:</h3>
    <div className="suggestion-buttons">
      <button className="suggestion-button" onClick={() => setInputValue("Show users with Admin access")}>Show users with Admin access</button>
      <button className="suggestion-button" onClick={() => setInputValue("List all permissions for a project")}>List all permissions for a project</button>
      <button className="suggestion-button" onClick={() => setInputValue("Find users with overlapping roles")}>Find users with overlapping roles</button>
      <button className="suggestion-button" onClick={() => setInputValue("Identify overexposed permissions")}>Identify overexposed permissions</button>
      <button className="suggestion-button" onClick={() => setInputValue("Suggest best practices for permission security")}>Suggest best practices for permission security</button>
    </div>
  </div>
</div>

            )}

            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className='wrap-header'>
                  <div className="message-header">
                    <div className="message-avatar">
                      {message.type === 'user' ? <User size={20} /> : <Bot size={20} />}
                    </div>
                    <span className="message-timestamp">{message.timestamp}</span>
                  </div>

                  {message.type === 'bot' && (
                    <div className="button-container">
                      <button className="download-button" onClick={handleDownloadPdf} title="Download PDF">
                        <Download size={16} />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="message-content" ref={chatRef}>
                  {message.type === 'bot'
                    ? <div className="md-body" dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeHtml(message.content) }} />
                    : <div style={{ whiteSpace: 'pre-wrap' }}>{String(message.content)}</div>}
                </div>

                {!!message.followups?.length && (
                  <div className="followup-questions">
                    <h4>Suggested follow-up questions:</h4>
                    <div className="followup-buttons">
                      {message.followups.map((followup, index) => (
                        <button key={index} className="followup-button" onClick={() => handleFollowupClick(followup)}>
                          {followup?.question || 'Ask more'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="message bot">
                <div className="message-header">
                  <div className="message-avatar"><Bot size={20} /></div>
                </div>
                <div className="message-content">
                  <div className="typing-indicator"><span></span><span></span><span></span></div>
                  {loadingMessage && <div className="loading-message"><Clock size={16} />{loadingMessage}</div>}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-form" onSubmit={handleSubmit}>
            <div className="input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about Workflow Analyzer..."
                disabled={isLoading}
                className="chat-input"
              />
              <button type="submit" disabled={isLoading || !inputValue.trim()} className="send-button">
                <Send size={20} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatInterface;