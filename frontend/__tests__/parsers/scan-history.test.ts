import { describe, it, expect } from 'vitest';
import { parseScanHistory, parseScanHistoryRow } from '@/lib/parsers/scan-history';

const SAMPLE_TSV = `url\tfirst_seen\tportal\ttitle\tcompany\tstatus
https://example.com/1\t2025-01-15\tgreenhouse\tSenior Engineer\tAcme\tadded
https://example.com/2\t2025-01-15\tashby\tStaff Dev\tBeta\tskipped_title
https://example.com/3\t2025-01-16\tlever\tML Engineer\tGamma\tskipped_dup
https://example.com/4\t2025-01-16\twellfound\tBackend Dev\tDelta\tskipped_seen
`;

describe('parseScanHistory', () => {
  it('parses all rows', () => {
    const entries = parseScanHistory(SAMPLE_TSV);
    expect(entries).toHaveLength(4);
  });

  it('returns newest first', () => {
    const entries = parseScanHistory(SAMPLE_TSV);
    expect(entries[0].company).toBe('Delta');
  });

  it('returns empty for empty input', () => {
    expect(parseScanHistory('')).toEqual([]);
  });

  it('skips the header row', () => {
    const entries = parseScanHistory(SAMPLE_TSV);
    expect(entries.every((e) => e.url !== 'url')).toBe(true);
  });

  it('extracts statuses correctly', () => {
    const entries = parseScanHistory(SAMPLE_TSV);
    const statuses = entries.map((e) => e.status);
    expect(statuses).toContain('added');
    expect(statuses).toContain('skipped_title');
    expect(statuses).toContain('skipped_dup');
    expect(statuses).toContain('skipped_seen');
  });
});

describe('parseScanHistoryRow', () => {
  it('parses a valid TSV row', () => {
    const result = parseScanHistoryRow('https://ex.com\t2025-01-15\tgreenhouse\tDev\tCo\tadded');
    expect(result).not.toBeNull();
    expect(result!.portal).toBe('greenhouse');
    expect(result!.status).toBe('added');
  });

  it('returns null for incomplete rows', () => {
    expect(parseScanHistoryRow('only\ttwo\tcols')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseScanHistoryRow('')).toBeNull();
  });
});
