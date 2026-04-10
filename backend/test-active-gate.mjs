#!/usr/bin/env node

/**
 * test-active-gate.mjs — Deterministic unit tests for active-gate logic
 *
 * Tests parser, decision logic, and pipeline rewrite.
 * No network, no file I/O — pure in-memory assertions.
 *
 * Usage: node test-active-gate.mjs
 */

import { strict as assert } from 'assert';
import {
  parsePipeline,
  rebuildPipeline,
  EXPIRED_PHRASES,
  ACTIVE_PHRASES,
} from './active-gate.mjs';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

console.log('\nactive-gate tests\n══════════════════\n');

// ─── Pipeline parser ─────────────────────────────────────────────────────────

console.log('Pipeline Parser:');

test('parses pending items', () => {
  const content = `## Pendientes

- [ ] https://example.com/1 | Acme | SWE
- [ ] https://example.com/2 | Beta | ML Eng

## Procesadas

- [x] #1 | https://old.com | Old | Dev | 4.0/5 | PDF ✅
`;
  const { pending, beforePending, afterPending } = parsePipeline(content);
  assert.equal(pending.length, 2);
  assert.equal(pending[0].url, 'https://example.com/1');
  assert.equal(pending[0].company, 'Acme');
  assert.equal(pending[0].title, 'SWE');
  assert.equal(pending[1].company, 'Beta');
});

test('preserves Procesadas section', () => {
  const content = `## Pendientes

- [ ] https://example.com/1 | Acme | SWE

## Procesadas

- [x] #1 | https://old.com | Old | Dev | 4.0/5 | PDF ✅
- [x] #2 | https://old2.com | Old2 | BE | 3.5/5 | PDF ❌
`;
  const { afterPending } = parsePipeline(content);
  assert.ok(afterPending.some(l => l.includes('Procesadas')));
  assert.ok(afterPending.some(l => l.includes('#1')));
  assert.ok(afterPending.some(l => l.includes('#2')));
});

test('handles empty pipeline', () => {
  const { pending } = parsePipeline('## Pendientes\n\n## Procesadas\n');
  assert.equal(pending.length, 0);
});

test('handles pipeline with only header', () => {
  const { pending } = parsePipeline('## Pendientes\n');
  assert.equal(pending.length, 0);
});

test('handles missing Pendientes header', () => {
  const content = 'Some random text\n- [ ] https://example.com | Co | Role\n';
  const { pending } = parsePipeline(content);
  assert.equal(pending.length, 0); // Not inside a Pendientes section
});

// ─── Pipeline rebuild ────────────────────────────────────────────────────────

console.log('\nPipeline Rebuild:');

test('rebuilds with active items only', () => {
  const content = `## Pendientes

- [ ] https://example.com/1 | Acme | SWE
- [ ] https://example.com/2 | Beta | ML Eng
- [ ] https://example.com/3 | Gamma | BE

## Procesadas

- [x] #1 | https://old.com | Old | Dev | 4.0/5 | PDF ✅
`;
  const { pending, beforePending, afterPending } = parsePipeline(content);

  // Only keep first and third items
  const active = [pending[0], pending[2]];
  const rebuilt = rebuildPipeline(beforePending, active, afterPending);

  assert.ok(rebuilt.includes('Acme'));
  assert.ok(!rebuilt.includes('Beta'));
  assert.ok(rebuilt.includes('Gamma'));
  assert.ok(rebuilt.includes('Procesadas'));
  assert.ok(rebuilt.includes('#1'));
});

test('rebuild produces no duplicates', () => {
  const content = `## Pendientes

- [ ] https://example.com/1 | Acme | SWE

## Procesadas
`;
  const { pending, beforePending, afterPending } = parsePipeline(content);
  const rebuilt = rebuildPipeline(beforePending, pending, afterPending);
  const matches = rebuilt.match(/https:\/\/example\.com\/1/g);
  assert.equal(matches.length, 1);
});

test('rebuild with zero active items', () => {
  const content = `## Pendientes

- [ ] https://example.com/1 | Acme | SWE

## Procesadas

- [x] #1 | https://old.com | Old | Dev
`;
  const { beforePending, afterPending } = parsePipeline(content);
  const rebuilt = rebuildPipeline(beforePending, [], afterPending);
  assert.ok(!rebuilt.includes('example.com'));
  assert.ok(rebuilt.includes('Procesadas'));
  assert.ok(rebuilt.includes('#1'));
});

// ─── Expired phrase detection ────────────────────────────────────────────────

console.log('\nExpired Phrase Detection:');

test('"no longer accepting applications" is expired', () => {
  const body = '<html><body><p>This role is no longer accepting applications.</p></body></html>';
  const lower = body.toLowerCase();
  assert.ok(EXPIRED_PHRASES.some(p => lower.includes(p)));
});

test('"position has been filled" is expired', () => {
  const body = '<html><body><h1>Sorry, this position has been filled.</h1></body></html>';
  const lower = body.toLowerCase();
  assert.ok(EXPIRED_PHRASES.some(p => lower.includes(p)));
});

test('"job is closed" is expired', () => {
  const body = '<html><body>This job is closed and no longer available.</body></html>';
  const lower = body.toLowerCase();
  assert.ok(EXPIRED_PHRASES.some(p => lower.includes(p)));
});

test('"this posting is no longer available" is expired', () => {
  const body = 'We\'re sorry, this posting is no longer available.';
  const lower = body.toLowerCase();
  assert.ok(EXPIRED_PHRASES.some(p => lower.includes(p)));
});

test('"expired" is expired', () => {
  const body = '<html><body>This job listing has expired.</body></html>';
  const lower = body.toLowerCase();
  assert.ok(EXPIRED_PHRASES.some(p => lower.includes(p)));
});

test('"job not found" is expired', () => {
  const body = '<html><body><h1>Job not found.</h1><p>This job may have been taken down.</p></body></html>';
  const lower = body.toLowerCase();
  assert.ok(EXPIRED_PHRASES.some(p => lower.includes(p)));
});

// ─── Active phrase detection ─────────────────────────────────────────────────

console.log('\nActive Phrase Detection:');

test('"apply now" is active', () => {
  const body = '<html><body><button>Apply Now</button><p>Senior SWE at Acme...</p></body></html>';
  const lower = body.toLowerCase();
  assert.ok(ACTIVE_PHRASES.some(p => lower.includes(p)));
});

test('"apply" is active', () => {
  const body = '<html><body><a href="/apply">Apply</a></body></html>';
  const lower = body.toLowerCase();
  assert.ok(ACTIVE_PHRASES.some(p => lower.includes(p)));
});

test('"application form" is active', () => {
  const body = '<html><body>Fill out the application form below.</body></html>';
  const lower = body.toLowerCase();
  assert.ok(ACTIVE_PHRASES.some(p => lower.includes(p)));
});

test('"submit application" is active', () => {
  const body = '<html><body><button>Submit Application</button></body></html>';
  const lower = body.toLowerCase();
  assert.ok(ACTIVE_PHRASES.some(p => lower.includes(p)));
});

// ─── Ambiguous / unconfirmed ─────────────────────────────────────────────────

console.log('\nAmbiguous / Unconfirmed:');

test('no signals → unconfirmed (not active, not expired)', () => {
  const body = '<html><body><h1>Welcome to our company</h1><p>Learn more about us.</p></body></html>';
  const lower = body.toLowerCase();
  const hasExpired = EXPIRED_PHRASES.some(p => lower.includes(p));
  const hasActive = ACTIVE_PHRASES.some(p => lower.includes(p));
  assert.ok(!hasExpired);
  assert.ok(!hasActive);
});

test('empty body → no active or expired signals', () => {
  const body = '';
  const lower = body.toLowerCase();
  const hasExpired = EXPIRED_PHRASES.some(p => lower.includes(p));
  const hasActive = ACTIVE_PHRASES.some(p => lower.includes(p));
  assert.ok(!hasExpired);
  assert.ok(!hasActive);
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('');
