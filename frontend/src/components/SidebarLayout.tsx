"use client";
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { ChatProvider } from '../context/ChatContext';
import { Menu } from 'lucide-react';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (pathname === '/login' || pathname === '/chat/embed') {
    return <>{children}</>;
  }

  return (
    <ChatProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-transparent transition-colors duration-300 relative z-10">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-[var(--border)] glass-card sticky top-0 z-40 rounded-none border-x-0 border-t-0 shadow-none">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">RIT</span>
            </div>
            <span className="font-bold text-sm tracking-tight">Intelligence Portal</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-[var(--foreground)] opacity-60 hover:opacity-100"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </ChatProvider>
  );
}
