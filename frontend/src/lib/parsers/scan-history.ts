import fs from 'fs';
import { scanHistoryPath } from '../data-path';
import { ScanHistoryEntry } from '../types';

export function parseScanHistoryFile(): ScanHistoryEntry[] {
  if (!fs.existsSync(scanHistoryPath())) return [];
  const content = fs.readFileSync(scanHistoryPath(), 'utf-8');
  return parseScanHistory(content);
}

export function parseScanHistory(content: string): ScanHistoryEntry[] {
  const lines = content.split('\n');
  const entries: ScanHistoryEntry[] = [];
  
  for (const line of lines) {
    if (!line.trim() || line.startsWith('url\tfirst_seen')) continue;
    
    const entry = parseScanHistoryRow(line);
    if (entry) entries.push(entry);
  }
  
  return entries.reverse(); // Newest first
}

export function parseScanHistoryRow(line: string): ScanHistoryEntry | null {
  const cols = line.split('\t');
  if (cols.length < 6) return null;
  
  return {
    url: cols[0],
    firstSeen: cols[1],
    portal: cols[2],
    title: cols[3],
    company: cols[4],
    status: cols[5],
  };
}
