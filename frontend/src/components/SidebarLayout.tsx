"use client";
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { ChatProvider } from '../context/ChatContext';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  if (pathname === '/login' || pathname === '/chat/embed') {
    return <>{children}</>;
  }

  return (
    <ChatProvider>
      <div className="flex min-h-screen bg-[var(--background)] transition-colors duration-300">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </ChatProvider>
  );
}
