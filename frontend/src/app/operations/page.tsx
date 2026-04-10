'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Search,
  Filter,
  GitBranch,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Square,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type OpStatus = 'idle' | 'running' | 'success' | 'error';

interface Operation {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  endpoint: string;
  color: string;
  activeColor: string;
  note?: string;
}

// ─── Operation definitions ───────────────────────────────────────────────────

const OPERATIONS: Operation[] = [
  {
    id: 'scan',
    label: 'Scan Jobs',
    description: 'Search configured portals for new job listings. Uses Claude CLI with WebFetch for portal scanning.',
    icon: Search,
    endpoint: '/api/ops/scan',
    color: 'from-blue-600/20 to-blue-500/5 border-blue-500/20',
    activeColor: 'border-blue-400/40 ring-2 ring-blue-500/20',
    note: 'Playwright is not available in -p mode. Scan uses WebFetch/WebSearch as fallback.',
  },
  {
    id: 'active-gate',
    label: 'Filter Expired',
    description: 'Run the active-gate liveness filter. Checks pending pipeline URLs via HTTP and removes expired ones. Zero Claude tokens used.',
    icon: Filter,
    endpoint: '/api/ops/active-gate',
    color: 'from-yellow-600/20 to-yellow-500/5 border-yellow-500/20',
    activeColor: 'border-yellow-400/40 ring-2 ring-yellow-500/20',
  },
  {
    id: 'pipeline',
    label: 'Process Pipeline',
    description: 'Evaluate pending URLs in pipeline.md against your CV. Generates reports and updates the tracker.',
    icon: GitBranch,
    endpoint: '/api/ops/pipeline',
    color: 'from-purple-600/20 to-purple-500/5 border-purple-500/20',
    activeColor: 'border-purple-400/40 ring-2 ring-purple-500/20',
    note: 'Applications are never auto-submitted. Claude prepares everything but you make the final call.',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const [statuses, setStatuses] = useState<Record<string, OpStatus>>({});
  const [logs, setLogs] = useState<Record<string, string>>({});
  const [activeOp, setActiveOp] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const abortRefs = useRef<Record<string, AbortController>>({});
  const opIdRefs = useRef<Record<string, string>>({});

  // ─── Run operation ─────────────────────────────────────────────────

  const runOperation = useCallback(async (op: Operation) => {
    if (statuses[op.id] === 'running') return;

    setStatuses((prev) => ({ ...prev, [op.id]: 'running' }));
    setLogs((prev) => ({ ...prev, [op.id]: '' }));
    setErrors((prev) => ({ ...prev, [op.id]: '' }));
    setActiveOp(op.id);

    const controller = new AbortController();
    abortRefs.current[op.id] = controller;

    try {
      const res = await fetch(op.endpoint, {
        method: 'POST',
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

          if (event === 'started') {
            try {
              const parsed = JSON.parse(data);
              opIdRefs.current[op.id] = parsed.opId;
            } catch {}
          } else if (event === 'log') {
            try {
              const text = JSON.parse(data);
              setLogs((prev) => ({
                ...prev,
                [op.id]: (prev[op.id] || '') + text,
              }));
            } catch {}
          } else if (event === 'error') {
            try {
              const errText = JSON.parse(data);
              setErrors((prev) => ({ ...prev, [op.id]: errText }));
            } catch {}
          } else if (event === 'done') {
            try {
              const parsed = JSON.parse(data);
              setStatuses((prev) => ({
                ...prev,
                [op.id]: parsed.exitCode === 0 ? 'success' : 'error',
              }));
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrors((prev) => ({ ...prev, [op.id]: err.message }));
        setStatuses((prev) => ({ ...prev, [op.id]: 'error' }));
      }
    } finally {
      delete abortRefs.current[op.id];
    }
  }, [statuses]);

  // ─── Stop operation ────────────────────────────────────────────────

  const stopOperation = useCallback((opId: string) => {
    const controller = abortRefs.current[opId];
    if (controller) controller.abort();

    const serverOpId = opIdRefs.current[opId];
    if (serverOpId) {
      fetch('/api/claude/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: serverOpId }),
      }).catch(() => {});
    }

    setStatuses((prev) => ({ ...prev, [opId]: 'idle' }));
  }, []);

  // ─── Status icon ───────────────────────────────────────────────────

  function StatusIcon({ status }: { status: OpStatus }) {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-zinc-800/50 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          Operations
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Run backend operations deterministically — each button triggers a specific command
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
        {/* Operation cards */}
        <div className="grid gap-4 mb-6">
          {OPERATIONS.map((op) => {
            const status = statuses[op.id] || 'idle';
            const isRunning = status === 'running';

            return (
              <div
                key={op.id}
                className={cn(
                  'bg-gradient-to-br rounded-xl border p-5 transition-all',
                  op.color,
                  isRunning && op.activeColor,
                  activeOp === op.id && 'bg-opacity-100'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mt-0.5">
                      <op.icon className="w-5 h-5 text-zinc-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
                        {op.label}
                        <StatusIcon status={status} />
                      </h3>
                      <p className="text-sm text-zinc-500 mt-0.5">{op.description}</p>
                      {op.note && (
                        <p className="text-xs text-zinc-600 mt-1 flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3" />
                          {op.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 ml-4">
                    {isRunning ? (
                      <button
                        onClick={() => stopOperation(op.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-red-600/10 border border-red-500/20 rounded-xl hover:bg-red-600/20 transition-colors"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => runOperation(op)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-200 bg-zinc-800/50 border border-zinc-700/50 rounded-xl hover:bg-zinc-700/50 hover:border-zinc-600/50 transition-colors"
                      >
                        Run
                      </button>
                    )}
                  </div>
                </div>

                {/* Error */}
                {errors[op.id] && (
                  <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-400">{errors[op.id]}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Log output */}
        {activeOp && logs[activeOp] && (
          <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800/50 flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Output — {OPERATIONS.find((o) => o.id === activeOp)?.label}
              </span>
              <button
                onClick={() => setActiveOp(null)}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Hide
              </button>
            </div>
            <pre className="px-4 py-3 text-xs text-zinc-400 font-mono whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar">
              {logs[activeOp]}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
