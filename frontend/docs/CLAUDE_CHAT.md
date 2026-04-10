# Claude Chat & Operations Integration

> Architecture documentation for the Career-Ops frontend/backend integration.

## Overview

The frontend provides two distinct modes for interacting with the backend:

1. **Chat Mode** (`/chat`) — Freeform conversation with Claude CLI
2. **Operations Mode** (`/operations`) — Deterministic backend command execution

These are intentionally separated. Chat is for interactive, open-ended AI work. Operations are for running specific, known backend commands with structured output.

---

## Chat Mode

### Session Model

Each browser tab gets its own isolated Claude CLI session:

- **Session ID**: Generated client-side via `crypto.randomUUID()` on tab open
- **Storage**: `sessionStorage` (tab-scoped, not `localStorage`)
- **Isolation**: Two tabs = two independent Claude conversations

### CLI Flags Used

| Turn | CLI Command |
|------|-------------|
| First message | `claude --dangerously-skip-permissions -p <msg> --session-id <uuid>` |
| Follow-up | `claude --dangerously-skip-permissions -p <msg> --resume <uuid>` |

The `--session-id` flag pins the conversation to a specific UUID that the client controls. On follow-ups, `--resume` replays Claude CLI's own saved history for that session.

### System Prompt

- **Default** (empty): CLAUDE.md in `backend/` is used as-is
- **When set**: Passed via `--system-prompt`, which **fully replaces** CLAUDE.md for that session
- **Persistence**: System prompt is stored in `localStorage` (shared across tabs — it's a user preference, not session state)

### API Route

```
POST /api/claude/chat
Body: { message: string, sessionId: string, isFollowUp: boolean, systemPrompt?: string }
Response: SSE stream (events: session, delta, error, done)
```

### Process Lifecycle

1. Client sends message with `sessionId` and `isFollowUp` flag
2. Server kills any existing process for that `sessionId`
3. Server spawns `claude` with correct flags
4. stdout/stderr stream as `delta` SSE events
5. On exit: `done` event with exit code
6. On client disconnect: process killed via `req.signal` abort listener
7. 5-minute timeout guard

---

## Operations Mode

### Endpoints

| Endpoint | Backend Command | Claude CLI? | Description |
|----------|----------------|-------------|-------------|
| `POST /api/ops/scan` | `/career-ops scan` | Yes | Scan portals for new listings |
| `POST /api/ops/active-gate` | `node active-gate.mjs` | No | HTTP liveness filter (zero tokens) |
| `POST /api/ops/pipeline` | `/career-ops pipeline` | Yes | Evaluate pending URLs against CV |

### SSE Events

All operations emit the same structured events:

| Event | Payload | Description |
|-------|---------|-------------|
| `started` | `{ opId, operation }` | Operation has begun |
| `log` | `string` | stdout/stderr output |
| `error` | `string` | Error message |
| `done` | `{ exitCode, operation }` | Operation completed |

### Concurrency

Each operation type prevents concurrent runs. If you try to start a scan while one is already running, the endpoint returns `409 Conflict` with the active operation ID.

### Ethical Constraints

Per `CLAUDE.md` line 234:

> **NEVER submit an application without the user reviewing it first.**

The pipeline operation evaluates and prepares but does not auto-submit. The Apply mode (when accessed via Chat) prepares forms but always stops before clicking Submit.

### Playwright Limitation

Per `CLAUDE.md` line 248:

> Playwright is not available in headless pipe mode (`claude -p`).

Operations that would benefit from Playwright (PDF generation, portal scanning with browser automation) use WebFetch/WebSearch as fallback when run from the frontend. For full Playwright support, use the terminal directly:

```bash
cd backend && claude  # interactive mode with Playwright
```

---

## Shared Infrastructure

### Process Registry (`src/lib/claude-registry.ts`)

A `globalThis`-based singleton `Map<string, ChildProcess>` that survives Next.js HMR reloads. Used by:

- `POST /api/claude/chat` — registers chat processes by sessionId
- `POST /api/claude/stop` — kills processes by ID
- `POST /api/ops/*` — registers operation processes by opId

### Backend Path Resolution

Resolves `backend/` directory by checking (in order):
1. `../backend` relative to `process.cwd()`
2. `./backend` relative to `process.cwd()`
3. `../../backend` relative to `__dirname`

Validates by checking for `CLAUDE.md` in the candidate directory. Result is cached.

---

## Files

| File | Purpose |
|------|---------|
| `src/lib/claude-registry.ts` | Shared process registry, backend path resolver, SSE helpers |
| `src/app/api/claude/chat/route.ts` | Chat Mode API (--session-id / --resume) |
| `src/app/api/claude/stop/route.ts` | Kill process by ID (works for both modes) |
| `src/app/api/ops/scan/route.ts` | Scan operation endpoint |
| `src/app/api/ops/active-gate/route.ts` | Active-gate operation endpoint |
| `src/app/api/ops/pipeline/route.ts` | Pipeline operation endpoint |
| `src/app/chat/page.tsx` | Chat UI (sessionStorage, tab-isolated) |
| `src/app/operations/page.tsx` | Operations UI (run/stop/log viewer) |
