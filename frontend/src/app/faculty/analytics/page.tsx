"use client";
import { BarChart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="pb-6 border-b border-[var(--border)]">
        <Link href="/faculty" className="flex items-center text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] mb-4 hover:translate-x-[-10px] transition-transform">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
        </Link>
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Student AI Pulse</h1>
        <p className="text-[var(--foreground)] opacity-70 mt-1">Deep insights into student curiosities and knowledge gaps.</p>
      </div>
      
      <div className="bg-[var(--card)] p-20 rounded-3xl border border-[var(--border)] shadow-xl text-center">
        <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
          <BarChart className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Detailed Analytics Coming Soon</h2>
        <p className="text-[var(--foreground)] opacity-60 max-w-md mx-auto">We are currently aggregating data to provide you with insights into what students are asking the most from your department's resources.</p>
      </div>
    </div>
  );
}
