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
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Course Knowledge Materials</h1>
        <p className="text-[var(--foreground)] opacity-70 mt-1">Audit and curate what the AI knows about your curriculum.</p>
      </div>
      
      <div className="bg-[var(--card)] p-20 rounded-3xl border border-[var(--border)] shadow-xl text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
          <Users className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Course Curations Loading...</h2>
        <p className="text-[var(--foreground)] opacity-60 max-w-md mx-auto">Manage your course-specific knowledge base by uploading latest PDFs, slides, and syllabus documents to keep the AI updated.</p>
        <Link 
          href="/add-document"
          className="mt-8 inline-flex items-center px-8 py-3 bg-[var(--primary)] text-white rounded-xl font-bold transition-all hover:opacity-90"
        >
          <Upload className="w-5 h-5 mr-3" />
          Add Material Now
        </Link>
      </div>
    </div>
  );
}
