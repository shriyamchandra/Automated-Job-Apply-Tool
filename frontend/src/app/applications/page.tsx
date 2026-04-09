'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  ExternalLink, 
  FileBox, 
  MoreHorizontal,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { Application, STATUS_COLORS } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<keyof Application>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/applications');
        const data = await res.json();
        setApps(data.applications || []);
      } catch (err) {
        console.error('Failed to fetch applications:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredApps = useMemo(() => {
    return apps
      .filter(app => {
        const matchesSearch = 
          app.company.toLowerCase().includes(search.toLowerCase()) ||
          app.role.toLowerCase().includes(search.toLowerCase()) ||
          app.notes.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === valB) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;
        
        const comparison = valA < valB ? -1 : 1;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [apps, search, statusFilter, sortField, sortOrder]);

  const toggleSort = (field: keyof Application) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const statuses = ['All', ...Array.from(new Set(apps.map(a => a.status)))];

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Applications</h1>
        <p className="text-zinc-400">Manage and track your active job submissions.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search company, role, or notes..."
            className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/40 border border-zinc-800/50 rounded-xl text-sm text-zinc-400">
            <Filter className="w-4 h-4" />
            <select 
              className="bg-transparent focus:outline-none text-zinc-200"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          <div className="text-sm text-zinc-500 px-2 font-medium">
            {filteredApps.length} results
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/50 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900/40">
                <th className="px-6 py-4 cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => toggleSort('number')}>
                  <div className="flex items-center gap-2"># <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-2">Date <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => toggleSort('company')}>
                  <div className="flex items-center gap-2">Company <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => toggleSort('score')}>
                  <div className="flex items-center gap-2">Score <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Resources</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {filteredApps.map((app) => (
                <tr key={app.number} className="group hover:bg-zinc-800/30 transition-all border-l-2 border-l-transparent hover:border-l-blue-500">
                  <td className="px-6 py-4 text-sm text-zinc-500 font-mono">
                    {app.number.toString().padStart(3, '0')}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {app.date}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-zinc-100">{app.company}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {app.role}
                  </td>
                  <td className="px-6 py-4">
                    {app.score !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              app.score >= 4 ? "bg-green-500" : app.score >= 3 ? "bg-blue-500" : "bg-yellow-500"
                            )}
                            style={{ width: `${(app.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-zinc-300">{app.score.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-sm">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {app.pdf && (
                        <button title="View PDF" className="p-1.5 text-zinc-500 hover:text-white bg-zinc-800/50 rounded-md transition-colors">
                          <FileBox className="w-4 h-4" />
                        </button>
                      )}
                      {app.reportPath && (
                        <button title="Open Report" className="p-1.5 text-zinc-500 hover:text-white bg-zinc-800/50 rounded-md transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredApps.length === 0 && (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold text-zinc-300">No applications found</h3>
            <p className="text-zinc-500 max-w-xs mx-auto">Try adjusting your filters or search query to find what you're looking for.</p>
            <button 
              onClick={() => { setSearch(''); setStatusFilter('All'); }}
              className="text-blue-500 font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
