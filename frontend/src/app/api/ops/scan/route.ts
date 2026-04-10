import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import {
  getProcessRegistry,
  killProcess,
  resolveBackendCwd,
  sseEvent,
  sseJSON,
  OPS_TIMEOUT_MS,
} from '@/lib/claude-registry';

// ─── POST /api/ops/scan ─────────────────────────────────────────────────────
//
// Operations Mode: Scan portals for new job listings.
// Runs: claude --dangerously-skip-permissions -p "/career-ops scan"
//
// This uses Claude CLI because scanning requires AI reasoning to
// parse portal pages, filter titles, and deduplicate against history.
// Playwright is NOT available in -p mode (acknowledged in CLAUDE.md L248),
// so the scan uses WebFetch/WebSearch as fallback.

export async function POST(req: NextRequest) {
  const opId = `ops-scan-${randomUUID().slice(0, 8)}`;

  const backendCwd = resolveBackendCwd();
  if (!backendCwd) {
    return new Response(
      JSON.stringify({ error: 'Backend directory not found' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Only one scan at a time
  const registry = getProcessRegistry();
  for (const [key] of registry) {
    if (key.startsWith('ops-scan-')) {
      return new Response(
        JSON.stringify({ error: 'A scan is already running', activeId: key }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  let finalized = false;

  const stream = new ReadableStream({
    start(controller) {
      function finalize(exitCode: number, errorMsg?: string) {
        if (finalized) return;
        finalized = true;
        clearTimeout(timeout);
        registry.delete(opId);
        if (!proc.killed) proc.kill('SIGTERM');
        try {
          if (errorMsg) controller.enqueue(sseEvent('error', errorMsg));
          controller.enqueue(sseJSON('done', { exitCode, operation: 'scan' }));
          controller.close();
        } catch {}
      }

      controller.enqueue(sseJSON('started', { opId, operation: 'scan' }));

      const proc = spawn('claude', [
        '--dangerously-skip-permissions',
        '-p', '/career-ops scan',
      ], {
        cwd: backendCwd,
        env: { ...process.env, TERM: 'dumb' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      registry.set(opId, proc);

      const timeout = setTimeout(() => {
        finalize(-1, 'Scan timed out after 10 minutes');
      }, OPS_TIMEOUT_MS);

      req.signal.addEventListener('abort', () => finalize(-1));

      proc.stdout?.on('data', (chunk: Buffer) => {
        if (finalized) return;
        try { controller.enqueue(sseEvent('log', chunk.toString('utf-8'))); } catch {}
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        if (finalized) return;
        const text = chunk.toString('utf-8');
        if (text.includes('ENOENT') || text.includes('warn')) return;
        try { controller.enqueue(sseEvent('log', text)); } catch {}
      });

      proc.on('close', (code) => {
        const ec = code ?? 0;
        finalize(ec, ec !== 0 ? `Scan exited with code ${ec}` : undefined);
      });

      proc.on('error', (err) => {
        finalize(-1, `Failed to start scan: ${err.message}`);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Operation-Id': opId,
    },
  });
}
