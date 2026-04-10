/**
 * Shared process registry and backend path resolver.
 * Used by both chat and operations API routes.
 *
 * The registry lives on globalThis so it survives Next.js HMR
 * module reloads in dev mode — the stop endpoint and any route
 * can always find the correct ChildProcess reference.
 */

import type { ChildProcess } from 'child_process';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

// ─── Process registry (globalThis singleton) ────────────────────────────────

const REGISTRY_KEY = Symbol.for('career-ops-processes');

export function getProcessRegistry(): Map<string, ChildProcess> {
  const g = globalThis as Record<symbol, unknown>;
  if (!g[REGISTRY_KEY]) {
    g[REGISTRY_KEY] = new Map<string, ChildProcess>();
  }
  return g[REGISTRY_KEY] as Map<string, ChildProcess>;
}

/**
 * Kill and remove a process from the registry, if it exists.
 */
export function killProcess(id: string): boolean {
  const registry = getProcessRegistry();
  const proc = registry.get(id);
  if (!proc) return false;
  if (!proc.killed) proc.kill('SIGTERM');
  registry.delete(id);
  return true;
}

// ─── Backend path resolution ────────────────────────────────────────────────

let cachedBackendPath: string | null | undefined;

/**
 * Resolve the backend/ directory path. Returns null if not found.
 * Result is cached for the lifetime of the process.
 */
export function resolveBackendCwd(): string | null {
  if (cachedBackendPath !== undefined) return cachedBackendPath;

  const candidates = [
    resolve(process.cwd(), '..', 'backend'),
    resolve(process.cwd(), 'backend'),
    resolve(__dirname, '..', '..', '..', '..', 'backend'),
  ];

  for (const dir of candidates) {
    if (existsSync(join(dir, 'CLAUDE.md'))) {
      cachedBackendPath = dir;
      return dir;
    }
  }

  cachedBackendPath = null;
  return null;
}

// ─── SSE event formatters ───────────────────────────────────────────────────

const encoder = new TextEncoder();

export function sseEvent(event: string, data: string): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function sseJSON(event: string, obj: Record<string, unknown>): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(obj)}\n\n`);
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const MAX_MESSAGE_LENGTH = 32_000;
export const PROCESS_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const OPS_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes for operations
