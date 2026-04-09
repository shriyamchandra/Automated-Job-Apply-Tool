import { describe, it, expect } from 'vitest';
import {
  parseApplicationsTable,
  parseApplicationRow,
  parseScore,
  parseReportLink,
} from '@/lib/parsers/applications';

const SAMPLE_TABLE = `# Applications Tracker

| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|------|---------|------|-------|--------|-----|--------|-------|
| 1 | 2025-01-15 | Acme Corp | Senior Engineer | 4.2/5 | Evaluated | ✅ | [1](reports/001-acme-2025-01-15.md) | Good fit |
| 2 | 2025-01-16 | Beta Inc | Staff Dev | 3.8/5 | Applied | ❌ | [2](reports/002-beta-2025-01-16.md) | Needs follow-up |
| 3 | 2025-01-17 | Gamma Labs | Junior Dev | N/A | SKIP | ❌ | | Too junior |
`;

describe('parseApplicationsTable', () => {
  it('parses a complete table', () => {
    const apps = parseApplicationsTable(SAMPLE_TABLE);
    expect(apps).toHaveLength(3);
  });

  it('extracts company names', () => {
    const apps = parseApplicationsTable(SAMPLE_TABLE);
    expect(apps.map((a) => a.company)).toEqual(['Acme Corp', 'Beta Inc', 'Gamma Labs']);
  });

  it('extracts statuses', () => {
    const apps = parseApplicationsTable(SAMPLE_TABLE);
    expect(apps.map((a) => a.status)).toEqual(['Evaluated', 'Applied', 'SKIP']);
  });

  it('returns empty for empty input', () => {
    expect(parseApplicationsTable('')).toEqual([]);
  });

  it('returns empty for non-table content', () => {
    expect(parseApplicationsTable('# Just a heading\nSome text.')).toEqual([]);
  });

  it('handles single-row tables', () => {
    const single = `| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|------|---------|------|-------|--------|-----|--------|-------|
| 1 | 2025-01-15 | Solo Corp | Dev | 4.0/5 | Applied | ✅ | | Good |`;
    const apps = parseApplicationsTable(single);
    expect(apps).toHaveLength(1);
    expect(apps[0].company).toBe('Solo Corp');
  });
});

describe('parseApplicationRow', () => {
  it('parses a valid row', () => {
    const cells = ['1', '2025-01-15', 'Acme', 'Dev', '4.0/5', 'Applied', '✅', '[1](reports/r.md)', 'Notes'];
    const result = parseApplicationRow(cells);
    expect(result).not.toBeNull();
    expect(result!.number).toBe(1);
    expect(result!.score).toBe(4.0);
    expect(result!.status).toBe('Applied');
  });

  it('returns null for non-numeric first cell', () => {
    expect(parseApplicationRow(['abc', 'date', 'co', 'role', 'score', 'status'])).toBeNull();
  });

  it('handles N/A scores', () => {
    const cells = ['5', '2025-01-20', 'Co', 'Role', 'N/A', 'SKIP', '❌', '', 'Nope'];
    const result = parseApplicationRow(cells);
    expect(result!.score).toBeNull();
  });

  it('parses report links', () => {
    const cells = ['1', '2025-01-15', 'Acme', 'Dev', '4.0/5', 'Applied', '✅', '[1](reports/001-acme.md)', ''];
    const result = parseApplicationRow(cells);
    expect(result!.reportPath).toBe('reports/001-acme.md');
  });

  it('handles missing report', () => {
    const cells = ['1', '2025-01-15', 'Acme', 'Dev', '4.0/5', 'Applied', '✅', '', ''];
    const result = parseApplicationRow(cells);
    expect(result!.reportPath).toBeNull();
  });
});

describe('parseScore', () => {
  it('parses X.X/5 format', () => {
    expect(parseScore('4.2/5')).toBe(4.2);
  });

  it('parses integer/5 format', () => {
    expect(parseScore('3/5')).toBe(3);
  });

  it('returns null for N/A', () => {
    expect(parseScore('N/A')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseScore('')).toBeNull();
  });

  it('returns null for random text', () => {
    expect(parseScore('good')).toBeNull();
  });
});

describe('parseReportLink', () => {
  it('extracts path from markdown link', () => {
    const result = parseReportLink('[1](reports/001-acme.md)');
    expect(result.path).toBe('reports/001-acme.md');
  });

  it('returns null path for empty string', () => {
    const result = parseReportLink('');
    expect(result.path).toBeNull();
  });

  it('returns null path for non-link text', () => {
    const result = parseReportLink('just text');
    expect(result.path).toBeNull();
  });
});
