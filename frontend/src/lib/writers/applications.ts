import fs from 'fs';
import { applicationsPath } from '../data-path';
import { parseApplications } from '../parsers/applications';

export async function updateApplication(
  number: number,
  updates: { status?: string; notes?: string }
) {
  const path = applicationsPath();
  const content = fs.readFileSync(path, 'utf-8');
  const lines = content.split('\n');
  
  let updated = false;
  const newLines = lines.map(line => {
    if (updated) return line;
    if (!line.includes('|')) return line;
    
    const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
    if (cells.length < 6) return line;
    
    const num = parseInt(cells[0].replace(/[^\d]/g, ''));
    if (num === number) {
      updated = true;
      const parts = line.split('|');
      // Indices are 1-based because of split on |
      // | # | Date | Company | Role | Score | Status | PDF | Report | Notes |
      // parts: ["", " # ", " Date ", ...]
      if (updates.status !== undefined) parts[6] = ` ${updates.status} `;
      if (updates.notes !== undefined) parts[9] = ` ${updates.notes} `;
      return parts.join('|');
    }
    
    return line;
  });
  
  if (updated) {
    fs.writeFileSync(path, newLines.join('\n'));
    return parseApplications();
  }
  
  throw new Error(`Application #${number} not found`);
}
