'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  FileText, 
  Target, 
  Calendar, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Application, DashboardStats } from '@/lib/types';
import Link from 'next/link';

export default function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentApps, setRecentApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, appsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/applications')
        ]);
        const statsData = await statsRes.json();
        const appsData = await appsRes.json();
        
        setStats(statsData);
        setRecentApps(appsData.applications?.slice(0, 5) || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
          <p className="text-zinc-400">Welcome back. Here's what's happening in your job search.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all hover:scale-105">
          <Plus className="w-5 h-5" />
          <span>Add Manual entry</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Applications" 
          value={stats?.totalApplications || 0} 
          icon={Users}
          color="blue"
          subtext="Processed submissions"
        />
        <StatCard 
          label="Avg Score" 
          value={(stats?.avgScore || 0).toFixed(1)} 
          icon={Target}
          color="purple"
          subtext="Match strength / 5.0"
        />
        <StatCard 
          label="Pipeline Pending" 
          value={stats?.pendingPipeline || 0} 
          icon={Calendar}
          color="yellow"
          subtext="Links to evaluate"
        />
        <StatCard 
          label="Pipeline Processed" 
          value={stats?.processedPipeline || 0} 
          icon={FileText}
          color="green"
          subtext="Completed analyses"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Applications</h2>
            <Link href="/applications" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800/50 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Company & Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {recentApps.map((app) => (
                  <tr key={app.number} className="group hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-100">{app.company}</span>
                        <span className="text-sm text-zinc-400">{app.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-zinc-500 tabular-nums">
                      {app.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Application Status</h2>
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
            {stats && Object.entries(stats.statusCounts).map(([status, count]) => {
              const percentage = (count / stats.totalApplications) * 100;
              return (
                <div key={status} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">{status}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
