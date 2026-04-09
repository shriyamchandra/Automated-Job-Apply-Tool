export interface Application {
  number: number;
  date: string;
  company: string;
  role: string;
  score: number | null;
  scoreRaw: string;
  status: string;
  pdf: string;
  reportPath: string | null;
  notes: string;
}

export interface PipelineItem {
  url: string;
  company: string;
  role: string;
  processed: boolean;
  score?: string;
  pdfStatus?: string;
  number?: number;
}

export interface ScanHistoryEntry {
  url: string;
  firstSeen: string;
  portal: string;
  title: string;
  company: string;
  status: 'added' | 'skipped_title' | 'skipped_dup' | 'skipped_seen' | string;
}

export interface DashboardStats {
  totalApplications: number;
  avgScore: number | null;
  pendingPipeline: number;
  processedPipeline: number;
  statusCounts: Record<string, number>;
}

export const CANONICAL_STATUSES = [
  'Evaluated',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Skip',
  'Withdrawn',
  'SKIP'
];

export const STATUS_COLORS: Record<string, string> = {
  Evaluated: 'blue',
  Applied: 'yellow',
  Interview: 'purple',
  Offer: 'green',
  Rejected: 'red',
  Skip: 'gray',
  SKIP: 'gray',
  Withdrawn: 'orange',
};
