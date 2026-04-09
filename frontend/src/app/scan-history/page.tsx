'use client';

import { useEffect, useState } from 'react';
import { Search, Clock, Loader2, ExternalLink } from 'lucide-react';
import { ScanHistoryEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_PILLS: Record<string, string> = {
  added: 'bg-green-500/10 text-green-400 border-green-500/20',
  skipped_title: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  skipped_dup: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  skipped_seen: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

export default function ScanHistoryPage() {
  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const url = statusFilter !== 'all' ? `/api/scan-history?status=${statusFilter}` : '/api/scan-history';
        const res = await fetch(url);
        const data = await res.json();
        setEntries(data.entries || []);
      } catch (err) {
        console.error('Failed to fetch scan history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [statusFilter]);

  const filtered = entries.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.company.toLowerCase().includes(search.toLowerCase()) ||
      e.portal.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const statuses = ['all', 'added', 'skipped_title', 'skipped_dup', 'skipped_seen'];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Scan History</h1>
        <p className="text-zinc-400">{entries.length} entries from portal scans.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search title, company, or portal..."
            className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setLoading(true); }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize",
                statusFilter === s
                  ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                  : "bg-zinc-900/40 text-zinc-400 border-zinc-800/50 hover:text-white"
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/50 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900/40">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Portal</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {filtered.map((entry, i) => (
                <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-3 text-sm text-zinc-500 tabular-nums whitespace-nowrap">{entry.firstSeen}</td>
                  <td className="px-6 py-3 text-sm text-zinc-400">{entry.portal}</td>
                  <td className="px-6 py-3 text-sm text-zinc-200 max-w-[300px] truncate">{entry.title}</td>
                  <td className="px-6 py-3 text-sm text-zinc-300 font-medium">{entry.company}</td>
                  <td className="px-6 py-3">
                    <span className={cn(
                      "inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                      STATUS_PILLS[entry.status] || STATUS_PILLS['skipped_dup']
                    )}>
                      {entry.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-16 text-center text-zinc-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <p className="font-medium">No scan entries found</p>
          </div>
        )}
      </div>
    </div>
  );
}
