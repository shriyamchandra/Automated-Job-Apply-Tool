import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-xl bg-zinc-800/50', className)} />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800/50 p-6 bg-zinc-900/20 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="w-12 h-6 rounded-full" />
      </div>
      <Skeleton className="w-24 h-4 rounded" />
      <Skeleton className="w-16 h-8 rounded" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="w-full h-4 rounded" />
        </td>
      ))}
    </tr>
  );
}
