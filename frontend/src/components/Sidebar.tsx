"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageSquare, BookOpen, Sparkles, LogOut, User, Squirrel, Sun, Moon } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    // This runs on client side only
    const storedRole = localStorage.getItem('role') || 'guest';
    setRole(storedRole);

    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { name: 'Home', href: '/', icon: Home, adminOnly: false },
    { name: 'Chat with Laxx', href: '/chat', icon: MessageSquare, adminOnly: false },
    { name: 'Document Library', href: '/admin', icon: BookOpen, adminOnly: true },
    { name: 'Add Document', href: '/add-document', icon: Sparkles, adminOnly: true },
  ];

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div className="w-64 bg-[var(--secondary)] border-r border-[var(--border)] flex flex-col h-screen shrink-0 transition-colors duration-300">
      <div className="p-6 pb-2">
        <div className="flex items-center space-x-3 mb-8">
          <Squirrel className="w-8 h-8 text-[var(--primary)]" />
          <div>
            <h1 className="font-extrabold text-xl text-[var(--foreground)] leading-tight tracking-tighter">RIT</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--foreground)] opacity-40">Intelligence Portal</p>
          </div>
        </div>
        
        <nav className="space-y-1.5">
          {navItems.filter(item => !item.adminOnly || role === 'admin').map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' 
                    : 'text-[var(--foreground)] opacity-60 hover:opacity-100 hover:bg-[var(--background)]'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${isActive ? 'text-amber-400' : 'text-[var(--foreground)] opacity-40'}`} />
                <span className="font-bold text-xs uppercase tracking-wider">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 pt-2">
        <h3 className="text-[10px] font-bold text-[var(--foreground)] opacity-30 uppercase tracking-[0.2em] mb-4 px-2">System Config</h3>
        <div className="space-y-1 mb-6">
          <button 
            onClick={toggleDarkMode}
            className="w-full flex items-center px-4 py-3 text-[var(--foreground)] hover:bg-[var(--background)] rounded-xl transition-all text-xs font-bold group"
          >
            {darkMode ? (
              <>
                <Sun className="w-5 h-5 mr-3 text-amber-500 group-hover:rotate-45 transition-transform" />
                <span className="tracking-widest uppercase">Solar Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 mr-3 text-indigo-400 group-hover:-rotate-12 transition-transform" />
                <span className="tracking-widest uppercase">Lunar Mode</span>
              </>
            )}
          </button>
        </div>

        <h3 className="text-[10px] font-bold text-[var(--foreground)] opacity-30 uppercase tracking-[0.2em] mb-4 px-2">Active Session</h3>
        <div className="space-y-1">
          <div className="flex items-center px-4 py-3 text-[var(--foreground)] text-xs font-bold bg-[var(--background)] rounded-xl border border-[var(--border)]">
            <User className="w-5 h-5 mr-3 text-[var(--primary)]" />
            <span className="capitalize tracking-wider">{role === 'guest' ? 'Guest Access' : role}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all text-xs font-bold uppercase tracking-widest mt-2"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
