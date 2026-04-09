'use client';

import { 
  Search, 
  Bell, 
  Settings, 
  Menu 
} from 'lucide-react';

export function Header({ toggleMobileSidebar }: { toggleMobileSidebar?: () => void }) {
  return (
    <header className="h-16 border-b border-[#1a1a1b] bg-[#0a0a0b]/80 backdrop-blur-xl sticky top-0 z-30 flex items-center px-6 gap-4">
      <button 
        onClick={toggleMobileSidebar}
        className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex-1 max-w-xl relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
        <input 
          type="text" 
          placeholder="Search everywhere..."
          className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-zinc-600"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-zinc-800 mx-1" />
        <div className="flex items-center gap-3 pl-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 border border-zinc-600" />
        </div>
      </div>
    </header>
  );
}
