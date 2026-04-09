import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'purple' | 'green' | 'yellow';
}

const colorMap = {
  blue: 'from-blue-600/20 to-blue-500/5 text-blue-400 border-blue-500/20',
  purple: 'from-purple-600/20 to-purple-500/5 text-purple-400 border-purple-500/20',
  green: 'from-green-600/20 to-green-500/5 text-green-400 border-green-500/20',
  yellow: 'from-yellow-600/20 to-yellow-500/5 text-yellow-400 border-yellow-500/20',
};

const iconColorMap = {
  blue: 'bg-blue-500/10 text-blue-500',
  purple: 'bg-purple-500/10 text-purple-500',
  green: 'bg-green-500/10 text-green-500',
  yellow: 'bg-yellow-500/10 text-yellow-500',
};

export function StatCard({ label, value, icon: Icon, subtext, trend, color }: StatCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border p-6 bg-gradient-to-br transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/20",
      colorMap[color]
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2.5 rounded-xl", iconColorMap[color])}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            trend.isPositive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-400 mb-1">{label}</p>
        <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
        {subtext && (
          <p className="text-xs text-zinc-500 mt-2 font-medium">{subtext}</p>
        )}
      </div>
    </div>
  );
}
