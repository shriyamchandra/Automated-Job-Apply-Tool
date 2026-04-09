'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className="hidden lg:flex" />
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <Sidebar className="fixed inset-y-0 left-0 z-50 lg:hidden animate-in slide-in-from-left duration-300" />
        </>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header toggleMobileSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto custom-scrollbar">{children}</main>
      </div>
    </div>
  );
}
