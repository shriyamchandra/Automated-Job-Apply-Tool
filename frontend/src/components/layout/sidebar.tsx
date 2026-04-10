'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Briefcase, 
  GitBranch, 
  Clock, 
  MessageSquare,
  Terminal,
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Applications', href: '/applications', icon: Briefcase },
  { label: 'Pipeline', href: '/pipeline', icon: GitBranch },
  { label: 'Scan History', href: '/scan-history', icon: Clock },
  { label: 'Operations', href: '/operations', icon: Terminal },
  { label: 'Chat', href: '/chat', icon: MessageSquare },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col h-full bg-[#0a0a0b] border-r border-[#1a1a1b] w-64", className)}>
      <div className="p-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white">
            C
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Career-Ops</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-blue-600/10 text-blue-400 font-medium" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                isActive ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300"
              )} />
              <span>{item.label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 ml-auto text-blue-500/50" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-[#1a1a1b]">
        <div className="px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-zinc-300">System Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
