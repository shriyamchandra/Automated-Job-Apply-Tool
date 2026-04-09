'use client';

import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

export function ReportViewer({ 
  content, 
  isOpen, 
  onClose,
  title
}: { 
  content: string; 
  isOpen: boolean; 
  onClose: () => void;
  title: string;
}) {
  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 backdrop-blur-sm",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <div className={cn(
        "fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-[#0a0a0b] border-l border-[#1a1a1b] z-50 shadow-2xl transition-transform duration-500 ease-out flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-[#1a1a1b]">
          <h2 className="text-xl font-bold text-white truncate pr-4">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </>
  );
}
