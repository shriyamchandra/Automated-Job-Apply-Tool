import fs from 'fs';
import { applicationsPath } from '../data-path';
import { Application } from '../types';

export function parseApplications(): Application[] {
  if (!fs.existsSync(applicationsPath())) return [];
  const content = fs.readFileSync(applicationsPath(), 'utf-8');
  return parseApplicationsTable(content);
}

export function parseApplicationsTable(content: string): Application[] {
  const lines = content.split('\n');
  const apps: Application[] = [];
  
  let inTable = false;
  for (const line of lines) {
    if (line.includes('| # |') || line.includes('|#|')) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (line.trim() === '' || line.includes('|---|')) continue;
    
    const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
    if (cells.length < 6) {
      if (line.trim() === '') inTable = false;
      continue;
    }
    
    const app = parseApplicationRow(cells);
    if (app) apps.push(app);
  }
  
  return apps;
}

export function parseApplicationRow(cells: string[]): Application | null {
  const num = parseInt(cells[0].replace(/[^\d]/g, ''));
  if (isNaN(num)) return null;

  const scoreRaw = cells[4] || 'N/A';
  const score = parseScore(scoreRaw);
  const reportLink = parseReportLink(cells[7] || '');

  return {
    number: num,
    date: cells[1] || '',
    company: cells[2] || '',
    role: cells[3] || '',
    score,
    scoreRaw,
    status: cells[5] || 'Unknown',
    pdf: cells[6] || '',
    reportPath: reportLink.path,
    notes: cells[8] || '',
  };
}

export function parseScore(s: string): number | null {
  const match = s.match(/(\d+\.?\d*)\/5/);
  return match ? parseFloat(match[1]) : null;
}

export function parseReportLink(s: string): { link: string; path: string | null } {
  const match = s.match(/\[.*\]\((.*)\)/);
  return {
    link: s,
    path: match ? match[1] : null,
  };
}
