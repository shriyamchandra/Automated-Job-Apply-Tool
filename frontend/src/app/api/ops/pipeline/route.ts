import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import {
  getProcessRegistry,
  resolveBackendCwd,
  sseEvent,
  sseJSON,
  OPS_TIMEOUT_MS,
} from '@/lib/claude-registry';

// ─── POST /api/ops/pipeline ─────────────────────────────────────────────────
//
// Operations Mode: Process pending pipeline URLs.
// Runs: claude --dangerously-skip-permissions -p "/career-ops pipeline"
//
// This evaluates each pending URL in data/pipeline.md against cv.md,
// generates reports, and updates the tracker.
//
// IMPORTANT: Per CLAUDE.md ethical constraints (L234), applications are
// NEVER auto-submitted. Claude prepares evaluations and CVs but always
// stops before submitting. The user makes the final call.

export async function POST(req: NextRequest) {
  const opId = `ops-pipeline-${randomUUID().slice(0, 8)}`;

  const backendCwd = resolveBackendCwd();
  if (!backendCwd) {
    return new Response(
      JSON.stringify({ error: 'Backend directory not found' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const registry = getProcessRegistry();

  // Prevent concurrent pipeline runs
  for (const [key] of registry) {
    if (key.startsWith('ops-pipeline-')) {
      return new Response(
        JSON.stringify({ error: 'Pipeline processing is already running', activeId: key }),
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
          controller.enqueue(sseJSON('done', { exitCode, operation: 'pipeline' }));
          controller.close();
        } catch {}
      }

      controller.enqueue(sseJSON('started', { opId, operation: 'pipeline' }));

      const proc = spawn('claude', [
        '--dangerously-skip-permissions',
        '-p', '/career-ops pipeline',
      ], {
        cwd: backendCwd,
        env: { ...process.env, TERM: 'dumb' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      registry.set(opId, proc);

      const timeout = setTimeout(() => {
        finalize(-1, 'Pipeline processing timed out after 10 minutes');
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
        finalize(ec, ec !== 0 ? `Pipeline exited with code ${ec}` : undefined);
      });

      proc.on('error', (err) => {
        finalize(-1, `Failed to start pipeline: ${err.message}`);
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
