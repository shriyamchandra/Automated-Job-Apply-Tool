import { Search } from 'lucide-react';

export function EmptyState({
  icon: Icon = Search,
  title = 'Nothing here yet',
  description = 'No items to display.',
  action,
}: {
  icon?: React.ElementType;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
      <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
        <Icon className="w-8 h-8 text-zinc-700" />
      </div>
      <h3 className="text-xl font-bold text-zinc-300">{title}</h3>
      <p className="text-zinc-500 max-w-xs">{description}</p>
      {action}
    </div>
  );
}
