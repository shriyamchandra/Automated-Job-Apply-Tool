#!/usr/bin/env node

/**
 * active-gate.mjs — Token-free active-link gate for pipeline URLs
 *
 * Checks every pending URL in pipeline.md using HTTP fetch (no Playwright, no LLM).
 * Removes expired/unconfirmed links before they reach Claude evaluation.
 *
 * Usage:
 *   node active-gate.mjs              # apply changes
 *   node active-gate.mjs --dry-run    # report only, no file changes
 *
 * Options:
 *   --input      <path>   Pipeline file   (default: data/pipeline.md)
 *   --history    <path>   Scan history    (default: data/scan-history.tsv)
 *   --timeout-ms <ms>     Fetch timeout   (default: 12000)
 *   --dry-run             Report only
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CLI Args ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    input: join(__dirname, 'data', 'pipeline.md'),
    history: join(__dirname, 'data', 'scan-history.tsv'),
    timeoutMs: 12000,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':     opts.input = args[++i]; break;
      case '--history':   opts.history = args[++i]; break;
      case '--timeout-ms': opts.timeoutMs = parseInt(args[++i], 10); break;
      case '--dry-run':   opts.dryRun = true; break;
    }
  }
  return opts;
}

// ─── Expired / Active phrase lists ───────────────────────────────────────────

export const EXPIRED_PHRASES = [
  'no longer accepting applications',
  'position has been filled',
  'job is closed',
  'this posting is no longer available',
  'expired',
  'no longer available',
  'job no longer available',
  'no longer open',
  'this job has expired',
  'job posting has expired',
  'this position is no longer',
  'this job listing is closed',
  'job listing not found',
  'job not found',
  'this job may have been taken down',
  'may have been taken down',
];

export const ACTIVE_PHRASES = [
  'apply now',
  'apply',
  'application form',
  'submit application',
  'start application',
  'easy apply',
];

// ATS metadata hints that indicate a live job entity
export const ATS_HINTS = [
  'boards-api.greenhouse.io',
  'job-boards.greenhouse.io',
  'jobs.ashbyhq.com',
  'jobs.lever.co',
  '"application"',
  '"departments"',
  '"offices"',
];

// ─── URL patterns indicating expired redirect ───────────────────────────────

export const EXPIRED_URL_PATTERNS = [
  /[?&]error=true/i,
];

// ─── Detection logic ─────────────────────────────────────────────────────────

/**
 * Classify a URL as active, skipped_expired, or skipped_unconfirmed.
 * Pure HTTP — no Playwright, no LLM.
 */
export async function classifyUrl(url, timeoutMs = 12000) {
  let response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timer);
  } catch (err) {
    // Network error, timeout, DNS failure, etc.
    return { status: 'skipped_unconfirmed', reason: `fetch error: ${err.message.split('\n')[0]}` };
  }

  const httpStatus = response.status;

  // Hard-expired HTTP codes
  if (httpStatus === 404 || httpStatus === 410) {
    return { status: 'skipped_expired', reason: `HTTP ${httpStatus}` };
  }

  // Bot wall / auth required
  if (httpStatus === 403 || httpStatus === 401 || httpStatus === 429) {
    return { status: 'skipped_unconfirmed', reason: `HTTP ${httpStatus} (likely bot-blocked)` };
  }

  // Check final URL for ATS redirect patterns (e.g. Greenhouse ?error=true)
  const finalUrl = response.url;
  for (const pattern of EXPIRED_URL_PATTERNS) {
    if (pattern.test(finalUrl)) {
      return { status: 'skipped_expired', reason: `redirect to error URL: ${finalUrl}` };
    }
  }

  // Read body text
  let body = '';
  try {
    body = await response.text();
  } catch {
    return { status: 'skipped_unconfirmed', reason: 'could not read response body' };
  }

  const lower = body.toLowerCase();

  // Check body for expired phrases
  for (const phrase of EXPIRED_PHRASES) {
    if (lower.includes(phrase)) {
      return { status: 'skipped_expired', reason: `body contains: "${phrase}"` };
    }
  }

  // Check body for active signals
  for (const phrase of ACTIVE_PHRASES) {
    if (lower.includes(phrase)) {
      return { status: 'active', reason: `active signal: "${phrase}"` };
    }
  }

  // Check for ATS structural hints
  for (const hint of ATS_HINTS) {
    if (lower.includes(hint.toLowerCase()) || finalUrl.includes(hint)) {
      return { status: 'active', reason: `ATS hint: "${hint}"` };
    }
  }

  // Neither positive nor negative → ambiguous
  return { status: 'skipped_unconfirmed', reason: 'no positive or negative signals found' };
}

// ─── Pipeline parser ─────────────────────────────────────────────────────────

/**
 * Parse pipeline.md into { pending: PendingItem[], rest: string }
 * A PendingItem is { url, company, title, raw }
 */
export function parsePipeline(content) {
  const lines = content.split('\n');
  const pending = [];
  const beforePending = [];
  const afterPending = [];

  let section = 'before'; // before | pending | after

  for (const line of lines) {
    // Section headers
    if (/^##\s*Pendientes/i.test(line)) {
      section = 'pending';
      beforePending.push(line);
      continue;
    }
    if (section === 'pending' && /^##\s/.test(line)) {
      section = 'after';
      afterPending.push(line);
      continue;
    }

    if (section === 'pending') {
      const match = line.match(/^- \[ \] (.+?) \| (.+?) \| (.+)$/);
      if (match) {
        pending.push({
          url: match[1].trim(),
          company: match[2].trim(),
          title: match[3].trim(),
          raw: line,
        });
      } else if (line.trim() !== '') {
        // Non-standard line in pending, preserve it
        beforePending.push(line);
      }
    } else if (section === 'before') {
      beforePending.push(line);
    } else {
      afterPending.push(line);
    }
  }

  return { pending, beforePending, afterPending };
}

/**
 * Rebuild pipeline.md from active items and preserved sections.
 */
export function rebuildPipeline(beforePending, activeItems, afterPending) {
  const parts = [];
  parts.push(...beforePending);
  parts.push('');

  for (const item of activeItems) {
    parts.push(`- [ ] ${item.url} | ${item.company} | ${item.title}`);
  }

  parts.push('');
  parts.push(...afterPending);

  return parts.join('\n');
}

// ─── Scan history ────────────────────────────────────────────────────────────

const HISTORY_HEADER = 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus';

/**
 * Ensure the scan-history.tsv file exists with a header.
 */
export function ensureHistoryFile(historyPath) {
  if (!existsSync(historyPath)) {
    writeFileSync(historyPath, HISTORY_HEADER + '\n');
    return;
  }
  const content = readFileSync(historyPath, 'utf-8');
  if (!content.startsWith('url\t')) {
    writeFileSync(historyPath, HISTORY_HEADER + '\n' + content);
  }
}

/**
 * Load existing history entries as a Set of "url\tstatus" for dedup.
 */
export function loadHistoryDedup(historyPath) {
  const dedup = new Set();
  if (!existsSync(historyPath)) return dedup;

  const today = new Date().toISOString().slice(0, 10);
  const lines = readFileSync(historyPath, 'utf-8').split('\n');
  for (const line of lines) {
    if (line.startsWith('url\t')) continue;
    const cols = line.split('\t');
    if (cols.length >= 6 && cols[1] === today) {
      dedup.add(`${cols[0]}\t${cols[5]}`);
    }
  }
  return dedup;
}

/**
 * Append a row to scan-history.tsv (if not a duplicate for today).
 */
export function appendHistory(historyPath, item, status, dedup) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${item.url}\t${status}`;
  if (dedup.has(key)) return false;

  dedup.add(key);
  const row = `${item.url}\t${today}\tactive-gate\t${item.title}\t${item.company}\t${status}\n`;
  appendFileSync(historyPath, row);
  return true;
}

// ─── ANSI colors ─────────────────────────────────────────────────────────────

const isTTY = process.stdout.isTTY;
const c = {
  green:  (s) => isTTY ? `\x1b[32m${s}\x1b[0m` : s,
  red:    (s) => isTTY ? `\x1b[31m${s}\x1b[0m` : s,
  yellow: (s) => isTTY ? `\x1b[33m${s}\x1b[0m` : s,
  dim:    (s) => isTTY ? `\x1b[2m${s}\x1b[0m` : s,
  bold:   (s) => isTTY ? `\x1b[1m${s}\x1b[0m` : s,
};

const ICONS = {
  active: c.green('✓'),
  skipped_expired: c.red('✗'),
  skipped_unconfirmed: c.yellow('?'),
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv);

  console.log(`\n${c.bold('active-gate')} — token-free link liveness check`);
  console.log('═'.repeat(50));
  if (opts.dryRun) console.log(c.yellow('DRY RUN — no files will be modified\n'));

  // Read pipeline
  if (!existsSync(opts.input)) {
    console.log(c.dim(`No pipeline file at ${opts.input}, nothing to check.`));
    process.exit(0);
  }

  const content = readFileSync(opts.input, 'utf-8');
  const { pending, beforePending, afterPending } = parsePipeline(content);

  if (pending.length === 0) {
    console.log(c.dim('No pending URLs in pipeline. Nothing to check.'));
    process.exit(0);
  }

  console.log(`Checking ${pending.length} pending URL(s)...\n`);

  // Prepare history dedup
  if (!opts.dryRun) ensureHistoryFile(opts.history);
  const dedup = loadHistoryDedup(opts.history);

  // Classify all URLs
  const results = [];
  const active = [];
  let expiredCount = 0;
  let unconfirmedCount = 0;

  for (const item of pending) {
    const { status, reason } = await classifyUrl(item.url, opts.timeoutMs);
    results.push({ item, status, reason });

    const icon = ICONS[status];
    const label = status.padEnd(22);
    console.log(`${icon} ${label} ${item.company} | ${item.title}`);
    if (status !== 'active') console.log(`  ${c.dim(`→ ${reason}`)}`);

    if (status === 'active') {
      active.push(item);
    } else if (status === 'skipped_expired') {
      expiredCount++;
      if (!opts.dryRun) appendHistory(opts.history, item, 'skipped_expired', dedup);
    } else {
      unconfirmedCount++;
      if (!opts.dryRun) appendHistory(opts.history, item, 'skipped_unconfirmed', dedup);
    }
  }

  // Rewrite pipeline
  if (!opts.dryRun) {
    const newContent = rebuildPipeline(beforePending, active, afterPending);
    writeFileSync(opts.input, newContent);
  }

  // Summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${c.bold('Results:')}`);
  console.log(`  ${c.green('Active:')}        ${active.length}`);
  console.log(`  ${c.red('Expired:')}       ${expiredCount}`);
  console.log(`  ${c.yellow('Unconfirmed:')}   ${unconfirmedCount}`);
  console.log(`  ${c.dim('Total checked:')} ${pending.length}`);

  if (!opts.dryRun) {
    console.log(`\n${c.dim('Pipeline updated:')} ${opts.input}`);
    if (expiredCount + unconfirmedCount > 0) {
      console.log(`${c.dim('History updated:')} ${opts.history}`);
    }
  }

  console.log('');
}

const isDirectRun = Boolean(
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
);

if (isDirectRun) {
  main().catch((err) => {
    console.error('active-gate failed:', err.message);
    process.exit(1);
  });
}
