'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Square,
  Trash2,
  Loader2,
  Bot,
  User,
  AlertCircle,
  ChevronDown,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: number;
}

// ─── Tab-scoped session storage ──────────────────────────────────────────────
//
// Using sessionStorage instead of localStorage provides true tab isolation:
// each browser tab gets its own conversation that cannot leak into others.

const SESSION_KEY = 'career-ops-chat-session-id';
const MESSAGES_KEY = 'career-ops-chat-messages';
const SYSTEM_PROMPT_KEY = 'career-ops-chat-system-prompt';
const TURN_COUNT_KEY = 'career-ops-chat-turns';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function getTurnCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(sessionStorage.getItem(TURN_COUNT_KEY) || '0', 10);
}

function incrementTurnCount(): number {
  const count = getTurnCount() + 1;
  sessionStorage.setItem(TURN_COUNT_KEY, String(count));
  return count;
}

function loadMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch {}
}

function loadSystemPrompt(): string {
  if (typeof window === 'undefined') return '';
  // System prompt persists across tabs (intentional — it's a user preference)
  return localStorage.getItem(SYSTEM_PROMPT_KEY) || '';
}

function saveSystemPrompt(prompt: string) {
  if (typeof window === 'undefined') return;
  if (prompt) {
    localStorage.setItem(SYSTEM_PROMPT_KEY, prompt);
  } else {
    localStorage.removeItem(SYSTEM_PROMPT_KEY);
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Initialize from sessionStorage on mount
  useEffect(() => {
    setSessionId(getSessionId());
    setMessages(loadMessages());
    setSystemPrompt(loadSystemPrompt());
  }, []);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Send message ────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      setInput('');

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      // Determine if this is a follow-up in an existing Claude CLI session
      const turnNumber = incrementTurnCount();
      const isFollowUp = turnNumber > 1;

      try {
        const payload: Record<string, unknown> = {
          message: trimmed,
          sessionId,
          isFollowUp,
        };
        if (systemPrompt.trim()) {
          payload.systemPrompt = systemPrompt.trim();
        }

        const res = await fetch('/api/claude/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No readable stream');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() || '';

          for (const chunk of chunks) {
            const lines = chunk.split('\n');
            let event = '';
            let data = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) event = line.slice(7);
              if (line.startsWith('data: ')) data = line.slice(6);
            }

            if (!event || !data) continue;

            if (event === 'session') {
              // Server confirmed our sessionId binding
            } else if (event === 'delta') {
              try {
                const text = JSON.parse(data);
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + text,
                    };
                  }
                  return updated;
                });
              } catch {}
            } else if (event === 'error') {
              try {
                const errText = JSON.parse(data);
                setError(errText);
              } catch {}
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + '\n\n*[Stopped by user]*',
              };
            }
            return updated;
          });
        } else {
          setError(err.message);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant' && !last.content) {
              updated[updated.length - 1] = {
                ...last,
                role: 'error',
                content: err.message,
              };
            }
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [isStreaming, sessionId, systemPrompt]
  );

  // ─── Stop ────────────────────────────────────────────────────────────

  const stopGeneration = useCallback(async () => {
    abortRef.current?.abort();
    if (sessionId) {
      try {
        await fetch('/api/claude/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      } catch {}
    }
  }, [sessionId]);

  // ─── Clear (resets this tab's session) ───────────────────────────────

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(MESSAGES_KEY);
      sessionStorage.removeItem(TURN_COUNT_KEY);
      // Generate a fresh session ID for the next conversation
      const newSid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, newSid);
      setSessionId(newSid);
    }
    inputRef.current?.focus();
  }, []);

  // ─── Key handler ─────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-zinc-800/50 shrink-0">
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              Claude Chat
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Freeform conversation with Claude CLI — each tab gets its own session
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSystemPrompt((v) => !v)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-all border',
                systemPrompt.trim()
                  ? 'text-orange-400 bg-orange-500/5 border-orange-500/20 hover:border-orange-400/40'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
              )}
            >
              <Settings2 className="w-4 h-4" />
              System Prompt
              <ChevronDown className={cn('w-3 h-3 transition-transform', showSystemPrompt && 'rotate-180')} />
            </button>
            <button
              onClick={clearChat}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all border border-transparent hover:border-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
              New Chat
            </button>
          </div>
        </div>

        {/* System Prompt Editor */}
        {showSystemPrompt && (
          <div className="px-8 pb-4 animate-in slide-in-from-top-2 duration-200">
            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-3">
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block mb-2">
                System Prompt <span className="text-zinc-600 normal-case">(replaces CLAUDE.md via --system-prompt when set)</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value);
                  saveSystemPrompt(e.target.value);
                }}
                placeholder="Leave empty to use CLAUDE.md defaults. Set a value to fully replace CLAUDE.md for this session."
                rows={4}
                className="w-full bg-zinc-800/40 text-sm text-zinc-200 placeholder:text-zinc-600 rounded-lg px-3 py-2 border border-zinc-700/50 focus:outline-none focus:border-orange-500/30 resize-y min-h-[80px] max-h-[300px]"
              />
              {systemPrompt.trim() ? (
                <p className="text-xs text-orange-400/60 mt-1.5">
                  ✓ Active — CLAUDE.md will be replaced by this system prompt
                </p>
              ) : (
                <p className="text-xs text-zinc-600 mt-1.5">
                  Using CLAUDE.md defaults (backend career-ops instructions)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in fade-in duration-700">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-500/20 flex items-center justify-center mx-auto">
                <Bot className="w-8 h-8 text-orange-400" />
              </div>
              <h2 className="text-xl font-bold text-zinc-200">Chat with Claude</h2>
              <p className="text-sm text-zinc-500 max-w-md">
                Freeform conversation with Claude CLI running in your backend directory.
                Claude remembers this conversation across messages via{' '}
                <code className="text-zinc-400">--session-id</code>.
              </p>
              <p className="text-xs text-zinc-600 max-w-md">
                For backend operations (scan jobs, filter expired, process pipeline),
                use the <a href="/operations" className="text-blue-400 hover:underline">Operations</a> page.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3 py-4 px-4 rounded-xl',
              msg.role === 'user' && 'bg-zinc-900/30',
              msg.role === 'error' && 'bg-red-500/5 border border-red-500/20'
            )}
          >
            <div className="shrink-0 mt-0.5">
              {msg.role === 'user' ? (
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-400" />
                </div>
              ) : msg.role === 'error' ? (
                <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-orange-400" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">
                {msg.role === 'user' ? 'You' : msg.role === 'error' ? 'Error' : 'Claude'}
              </div>

              {msg.role === 'user' ? (
                <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-mono bg-zinc-800/30 rounded-lg px-3 py-2 border border-zinc-800/50">
                  {msg.content}
                </pre>
              ) : msg.role === 'error' ? (
                <p className="text-sm text-red-400">{msg.content}</p>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none text-zinc-300 [&_pre]:bg-zinc-900 [&_pre]:border [&_pre]:border-zinc-800/50 [&_pre]:rounded-lg [&_code]:text-orange-300 [&_a]:text-blue-400">
                  {msg.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  ) : isStreaming && msg === messages[messages.length - 1] ? (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-8 mb-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="px-8 pb-6 pt-2 shrink-0">
        <div className="flex gap-3 items-end bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-3 focus-within:border-orange-500/30 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message to Claude..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none min-h-[36px] max-h-[160px] py-1.5"
            style={{
              height: 'auto',
              overflow: input.split('\n').length > 6 ? 'auto' : 'hidden',
            }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 160) + 'px';
            }}
            disabled={isStreaming}
          />

          {isStreaming ? (
            <button
              onClick={stopGeneration}
              className="shrink-0 w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-600/30 transition-colors"
              title="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className={cn(
                'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                input.trim()
                  ? 'bg-orange-500 text-white hover:bg-orange-400 active:scale-95'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              )}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-[11px] text-zinc-600 mt-2 text-center">
          Session <code className="text-zinc-500">{sessionId.slice(0, 8)}</code> · Claude CLI in <code className="text-zinc-500">backend/</code> · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
