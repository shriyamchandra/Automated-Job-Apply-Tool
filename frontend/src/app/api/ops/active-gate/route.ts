import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { join } from 'path';
import {
  getProcessRegistry,
  resolveBackendCwd,
  sseEvent,
  sseJSON,
  OPS_TIMEOUT_MS,
} from '@/lib/claude-registry';

// ─── POST /api/ops/active-gate ──────────────────────────────────────────────
//
// Operations Mode: Run the active-gate liveness filter.
// Runs: node active-gate.mjs  (NO Claude CLI needed — pure HTTP checks)
//
// This is a token-free operation. It checks pending pipeline URLs via
// HTTP fetch and removes expired ones before they reach Claude evaluation.
//
// Query params:
//   ?dryRun=true — preview only, do not modify files

export async function POST(req: NextRequest) {
  const opId = `ops-gate-${randomUUID().slice(0, 8)}`;
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dryRun') === 'true';

  const backendCwd = resolveBackendCwd();
  if (!backendCwd) {
    return new Response(
      JSON.stringify({ error: 'Backend directory not found' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const registry = getProcessRegistry();

  // Prevent concurrent active-gate runs
  for (const [key] of registry) {
    if (key.startsWith('ops-gate-')) {
      return new Response(
        JSON.stringify({ error: 'Active-gate is already running', activeId: key }),
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
          controller.enqueue(sseJSON('done', { exitCode, operation: 'active-gate', dryRun }));
          controller.close();
        } catch {}
      }

      controller.enqueue(sseJSON('started', { opId, operation: 'active-gate', dryRun }));

      // Build full path to avoid Turbopack trying to resolve it as a module.
      // Use process.execPath instead of literal 'node' to prevent Turbopack
      // from analyzing spawn args as module imports.
      const scriptPath = join(backendCwd, 'active-gate.mjs');
      const nodeArgs = [scriptPath];
      if (dryRun) nodeArgs.push('--dry-run');

      const proc = spawn(process.execPath, nodeArgs, {
        cwd: backendCwd,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      registry.set(opId, proc);

      const timeout = setTimeout(() => {
        finalize(-1, 'Active-gate timed out after 10 minutes');
      }, OPS_TIMEOUT_MS);

      req.signal.addEventListener('abort', () => finalize(-1));

      proc.stdout?.on('data', (chunk: Buffer) => {
        if (finalized) return;
        try { controller.enqueue(sseEvent('log', chunk.toString('utf-8'))); } catch {}
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        if (finalized) return;
        try { controller.enqueue(sseEvent('log', chunk.toString('utf-8'))); } catch {}
      });

      proc.on('close', (code) => {
        const ec = code ?? 0;
        finalize(ec, ec !== 0 ? `Active-gate exited with code ${ec}` : undefined);
      });

      proc.on('error', (err) => {
        finalize(-1, `Failed to start active-gate: ${err.message}`);
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
