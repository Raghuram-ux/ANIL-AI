"use client";
import { Users, ArrowLeft, Upload, FileText } from 'lucide-react';
import Link from 'next/link';

export default function MaterialsPage() {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="pb-6 border-b border-[var(--border)]">
        <Link href="/faculty" className="flex items-center text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] mb-4 hover:translate-x-[-10px] transition-transform">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
        </Link>
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">University Archival Materials</h1>
        <p className="text-[var(--foreground)] opacity-70 mt-1">Review the established academic knowledge currently served to students.</p>
      </div>
      
      <div className="bg-[var(--card)] p-20 rounded-3xl border border-[var(--border)] shadow-xl text-center glass-card">
        <div className="w-20 h-20 bg-[var(--primary)]/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-[var(--primary)]/20 shadow-lg shadow-[var(--primary)]/10 text-[var(--primary)] animate-in zoom-in duration-700">
          <FileText className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold mb-4 tracking-tight">University Curriculum Vault</h2>
        <p className="text-[var(--foreground)] opacity-60 max-w-md mx-auto font-medium text-sm leading-relaxed">
          The following materials represent the current approved course knowledge for students.
          <br /><br />
          <span className="font-bold text-[var(--foreground)]">To update or add new academic material to the AI intelligence base, please contact the University System Administrator for official processing and approval.</span>
        </p>
      </div>
    </div>
  );
}
