import fs from 'fs';
import { pipelinePath } from '../data-path';
import { PipelineItem } from '../types';

export function parsePipelineFile(): PipelineItem[] {
  if (!fs.existsSync(pipelinePath())) return [];
  const content = fs.readFileSync(pipelinePath(), 'utf-8');
  return parsePipeline(content);
}

export function parsePipeline(content: string): PipelineItem[] {
  const items: PipelineItem[] = [];
  const lines = content.split('\n');
  
  let section: 'pending' | 'processed' = 'pending';
  
  for (const line of lines) {
    if (line.toLowerCase().includes('## pendientes')) {
      section = 'pending';
      continue;
    }
    if (line.toLowerCase().includes('## procesadas')) {
      section = 'processed';
      continue;
    }
    
    if (section === 'pending') {
      const item = parsePendingItem(line);
      if (item) items.push(item);
    } else {
      const item = parseProcessedItem(line);
      if (item) items.push(item);
    }
  }
  
  return items;
}

export function parsePendingItem(line: string): PipelineItem | null {
  const match = line.match(/- \[ \] (.*) \| (.*) \| (.*)/);
  if (!match) return null;
  return {
    url: match[1].trim(),
    company: match[2].trim(),
    role: match[3].trim(),
    processed: false,
  };
}

export function parseProcessedItem(line: string): PipelineItem | null {
  const match = line.match(/- \[x\] #(\d+) \| (.*) \| (.*) \| (.*) \| (.*) \| PDF (.*)/);
  if (!match) return null;
  return {
    number: parseInt(match[1]),
    url: match[2].trim(),
    company: match[3].trim(),
    role: match[4].trim(),
    score: match[5].trim(),
    pdfStatus: match[6].trim(),
    processed: true,
  };
}
