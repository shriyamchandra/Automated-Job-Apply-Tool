import fs from 'fs';
import path from 'path';
import { reportsDir } from '../data-path';

export function getReportContent(slug: string): string | null {
  const safeSlug = path.basename(slug);
  const fullPath = path.join(reportsDir(), `${safeSlug}.md`);
  
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8');
}

export function listReports(): string[] {
  if (!fs.existsSync(reportsDir())) return [];
  return fs.readdirSync(reportsDir())
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}
