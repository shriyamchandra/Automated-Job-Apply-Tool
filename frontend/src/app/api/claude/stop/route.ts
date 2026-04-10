import { NextRequest, NextResponse } from 'next/server';
import { killProcess, getProcessRegistry } from '@/lib/claude-registry';

// ─── POST /api/claude/stop ──────────────────────────────────────────────────
//
// Kill a running process by its session/operation ID.
// Works for both chat sessions and operations.

export async function POST(req: NextRequest) {
  let body: { sessionId?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sessionId = body.sessionId;
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const killed = killProcess(sessionId);
  if (!killed) {
    // Check if it even exists (could already be done)
    const registry = getProcessRegistry();
    if (!registry.has(sessionId)) {
      return NextResponse.json({ error: 'No active process for this session' }, { status: 404 });
    }
  }

  return NextResponse.json({ ok: true, sessionId });
}
