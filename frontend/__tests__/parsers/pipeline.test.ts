import { describe, it, expect } from 'vitest';
import { parsePipeline, parsePendingItem, parseProcessedItem } from '@/lib/parsers/pipeline';

const SAMPLE = `# Pipeline

## Pendientes

- [ ] https://jobs.example.com/123 | Acme Corp | Senior Engineer
- [ ] https://jobs.example.com/456 | Beta Inc | Staff Developer
- [ ] https://jobs.example.com/789 | Gamma Labs | ML Engineer

## Procesadas

- [x] #1 | https://jobs.example.com/001 | Delta Co | Backend Dev | 4.2/5 | PDF ✅
- [x] #2 | https://jobs.example.com/002 | Epsilon | Frontend | 3.5/5 | PDF ❌
`;

describe('parsePipeline', () => {
  it('parses both sections', () => {
    const items = parsePipeline(SAMPLE);
    const pending = items.filter((i) => !i.processed);
    const processed = items.filter((i) => i.processed);
    expect(pending).toHaveLength(3);
    expect(processed).toHaveLength(2);
  });

  it('returns empty for empty input', () => {
    expect(parsePipeline('')).toEqual([]);
  });

  it('handles only pending section', () => {
    const pending_only = `## Pendientes\n- [ ] https://example.com | Co | Role\n`;
    const items = parsePipeline(pending_only);
    expect(items).toHaveLength(1);
    expect(items[0].processed).toBe(false);
  });
});

describe('parsePendingItem', () => {
  it('parses a valid pending line', () => {
    const result = parsePendingItem('- [ ] https://example.com | Acme | Dev');
    expect(result).not.toBeNull();
    expect(result!.company).toBe('Acme');
    expect(result!.role).toBe('Dev');
    expect(result!.processed).toBe(false);
  });

  it('returns null for non-matching lines', () => {
    expect(parsePendingItem('random text')).toBeNull();
    expect(parsePendingItem('## Heading')).toBeNull();
    expect(parsePendingItem('')).toBeNull();
  });
});

describe('parseProcessedItem', () => {
  it('parses a valid processed line', () => {
    const result = parseProcessedItem('- [x] #1 | https://example.com | Acme | Dev | 4.0/5 | PDF ✅');
    expect(result).not.toBeNull();
    expect(result!.number).toBe(1);
    expect(result!.company).toBe('Acme');
    expect(result!.processed).toBe(true);
  });

  it('returns null for non-matching lines', () => {
    expect(parseProcessedItem('random text')).toBeNull();
    expect(parseProcessedItem('- [ ] pending item')).toBeNull();
  });
});
