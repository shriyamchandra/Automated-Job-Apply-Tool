import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import {
  getProcessRegistry,
  killProcess,
  resolveBackendCwd,
  sseEvent,
  sseJSON,
  MAX_MESSAGE_LENGTH,
  PROCESS_TIMEOUT_MS,
} from '@/lib/claude-registry';

// ─── POST /api/claude/chat ──────────────────────────────────────────────────
//
// Chat Mode: freeform conversation with Claude CLI.
//
// Session model:
//   - Client sends sessionId (UUID it generated on tab open).
//   - First message per session: claude -p <msg> --session-id <uuid>
//   - Follow-up messages:      claude -p <msg> --resume <uuid>
//
// System prompt:
//   - If provided, passed via --system-prompt (fully replaces CLAUDE.md).
//   - If omitted, CLAUDE.md is used as-is (default behavior).
//
// One process per session at a time. Sending a new message kills the
// previous process for that session.

export async function POST(req: NextRequest) {
  let body: { message?: string; sessionId?: string; systemPrompt?: string; isFollowUp?: boolean };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const message = body.message?.trim();
  const systemPrompt = body.systemPrompt?.trim();
  const sessionId = body.sessionId || randomUUID();
  const isFollowUp = !!body.isFollowUp;

  // ─── Validation ──────────────────────────────────────────────────────

  if (!message) {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ─── Backend path ────────────────────────────────────────────────────

  const backendCwd = resolveBackendCwd();
  if (!backendCwd) {
    return new Response(
      JSON.stringify({
        error: 'Cannot find backend/ directory. Ensure it exists alongside frontend/ and contains CLAUDE.md.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Kill previous process for this session
  killProcess(sessionId);

  // ─── Build CLI args ──────────────────────────────────────────────────

  const args: string[] = ['--dangerously-skip-permissions', '-p', message];

  if (isFollowUp) {
    // Resume the existing CLI session by its UUID
    args.push('--resume', sessionId);
  } else {
    // Pin this new conversation to a specific session ID
    args.push('--session-id', sessionId);
  }

  // If the user specified a system prompt, replace CLAUDE.md entirely
  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt);
  }

  // ─── Stream response ─────────────────────────────────────────────────

  let finalized = false;
  const registry = getProcessRegistry();

  const stream = new ReadableStream({
    start(controller) {
      function finalize(exitCode: number, errorMsg?: string) {
        if (finalized) return;
        finalized = true;
        clearTimeout(timeout);
        registry.delete(sessionId);
        if (!proc.killed) proc.kill('SIGTERM');
        try {
          if (errorMsg) controller.enqueue(sseEvent('error', errorMsg));
          controller.enqueue(sseJSON('done', { exitCode }));
          controller.close();
        } catch {}
      }

      // Emit sessionId so the client can confirm binding
      controller.enqueue(sseJSON('session', { sessionId }));

      const proc = spawn('claude', args, {
        cwd: backendCwd,
        env: { ...process.env, TERM: 'dumb' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      registry.set(sessionId, proc);

      const timeout = setTimeout(() => {
        finalize(-1, 'Process timed out after 5 minutes');
      }, PROCESS_TIMEOUT_MS);

      // Kill on client disconnect
      req.signal.addEventListener('abort', () => finalize(-1));

      proc.stdout?.on('data', (chunk: Buffer) => {
        if (finalized) return;
        try { controller.enqueue(sseEvent('delta', chunk.toString('utf-8'))); } catch {}
      });

      proc.stderr?.on('data', (chunk: Buffer) => {
        if (finalized) return;
        const text = chunk.toString('utf-8');
        if (text.includes('ENOENT') || text.includes('warn')) return;
        try { controller.enqueue(sseEvent('delta', text)); } catch {}
      });

      proc.on('close', (code) => {
        const ec = code ?? 0;
        finalize(ec, ec !== 0 ? `Process exited with code ${ec}` : undefined);
      });

      proc.on('error', (err) => {
        finalize(-1, `Failed to start Claude CLI: ${err.message}`);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Session-Id': sessionId,
    },
  });
}
