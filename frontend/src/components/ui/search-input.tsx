'use client';

import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    timer.current = setTimeout(() => onChange(local), 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [local]);

  return (
    <div className="relative w-full md:w-96 group">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-xl py-2 pl-10 pr-10 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-zinc-600"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
      {local && (
        <button
          onClick={() => {
            setLocal('');
            onChange('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
