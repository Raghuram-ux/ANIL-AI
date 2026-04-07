"use client";
import { Settings, ArrowLeft, Shield, Bell, User } from 'lucide-react';
import Link from 'next/link';

export default function FacultySettingsPage() {
  const sections = [
    { title: 'Personal Configuration', icon: User, items: ['Update Display Name', 'Change Password', 'Faculty Email Preferences'] },
    { title: 'AI Training Rules', icon: Shield, items: ['Custom System Prompts', 'Privacy Controls', 'Department Constraints'] },
    { title: 'Communication Gateways', icon: Bell, items: ['Email Alert Triggers', 'Daily Data Summaries', 'High Load Notifications'] },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="pb-6 border-b border-[var(--border)]">
        <Link href="/faculty" className="flex items-center text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] mb-4 hover:translate-x-[-10px] transition-transform">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
        </Link>
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Staff Preferences</h1>
        <p className="text-[var(--foreground)] opacity-70 mt-1">Configure your portal experience and AI integration layers.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-md hover:shadow-lg transition-transform group">
             <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
               <section.icon className="w-6 h-6 text-[var(--primary)]" />
             </div>
             <h3 className="text-xl font-bold mb-6 text-[var(--foreground)]">{section.title}</h3>
             <ul className="space-y-4">
                {section.items.map((item, idy) => (
                  <li key={idy} className="flex items-center text-sm font-medium opacity-60 hover:opacity-100 cursor-pointer transition-opacity border-b border-[var(--border)] pb-2 last:border-0">
                    {item}
                  </li>
                ))}
             </ul>
          </div>
        ))}
      </div>
      
      <div className="bg-[var(--background)] p-8 rounded-3xl border-2 border-dashed border-[var(--border)] text-center opacity-40">
        <p className="text-xs font-black uppercase tracking-[0.3em]">Module Under Development</p>
      </div>
    </div>
  );
}
