'use client';

import { useEffect, useState } from 'react';
import { Search, ExternalLink, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { PipelineItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function PipelinePage() {
  const [pending, setPending] = useState<PipelineItem[]>([]);
  const [processed, setProcessed] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/pipeline');
        const data = await res.json();
        setPending(data.pending || []);
        setProcessed(data.processed || []);
      } catch (err) {
        console.error('Failed to fetch pipeline:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredPending = pending.filter(
    (i) =>
      i.company.toLowerCase().includes(search.toLowerCase()) ||
      i.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Pipeline</h1>
        <p className="text-zinc-400">
          {pending.length} pending · {processed.length} processed
        </p>
      </div>

      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search pipeline..."
          className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Pending */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-yellow-400" />
          <h2 className="text-xl font-bold">Pending ({filteredPending.length})</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredPending.map((item, i) => (
            <div
              key={i}
              className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 hover:border-zinc-700 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 flex items-center justify-center text-lg font-bold text-blue-400">
                    {item.company.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100">{item.company}</p>
                    <p className="text-sm text-zinc-400 line-clamp-1">{item.role}</p>
                  </div>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <button className="w-full py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-sm font-medium text-blue-400 hover:bg-blue-600/20 transition-colors">
                Evaluate now
              </button>
            </div>
          ))}
        </div>

        {filteredPending.length === 0 && (
          <div className="text-center py-16 text-zinc-500 bg-zinc-900/20 rounded-2xl border border-zinc-800/30">
            <p className="text-lg font-medium mb-1">Pipeline is clear</p>
            <p className="text-sm">No pending items to process.</p>
          </div>
        )}
      </section>

      {/* Processed */}
      {processed.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-bold">Processed ({processed.length})</h2>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800/50 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {processed.map((item, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-3 text-sm text-zinc-500 font-mono">
                      {item.number?.toString().padStart(3, '0') || '-'}
                    </td>
                    <td className="px-6 py-3 font-medium text-zinc-200">
                      {item.company}
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-400">
                      {item.role}
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-400">
                      {item.score || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {item.pdfStatus || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
