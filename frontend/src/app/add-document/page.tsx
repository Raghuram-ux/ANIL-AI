"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HardDrive, FolderOpen, FileText, Trees } from 'lucide-react';
import api from '@/lib/api';

export default function AddDocument() {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState('all');
  const [allowDisplay, setAllowDisplay] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      router.push('/');
    }
  }, [router]);

  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    formData.append('audience', audience);
    formData.append('allow_display', allowDisplay.toString());
    
    try {
      await api.post('/admin/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      alert('Document uploaded and processed successfully.');
    } catch (err: any) {
      console.error('Upload error:', err);
      const detail = err?.response?.data?.detail;
      const status = err?.response?.status;
      if (status === 401) {
        alert('Session expired. Please log in again.');
      } else if (status === 403) {
        alert('Permission denied. Admin access required.');
      } else if (detail) {
        alert(`Upload failed: ${detail}`);
      } else if (err?.message) {
        alert(`Upload failed: ${err.message}`);
      } else {
        alert('Upload failed. Please check your connection and try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTitle || !textContent) return;
    setIsUploading(true);
    
    try {
      await api.post('/admin/documents/text', {
        title: textTitle,
        content: textContent,
        category: category || 'general',
        audience: audience,
        allow_display: allowDisplay
      });
      setTextTitle('');
      setTextContent('');
      alert('Text knowledge ingested successfully.');
    } catch (err: any) {
      console.error('Text ingest error:', err);
      const detail = err?.response?.data?.detail;
      const status = err?.response?.status;
      if (status === 401) {
        alert('Session expired. Please log in again.');
      } else if (status === 403) {
        alert('Permission denied. Admin access required.');
      } else if (detail) {
        alert(`Ingest failed: ${detail}`);
      } else if (err?.message) {
        alert(`Ingest failed: ${err.message}`);
      } else {
        alert('Failed to ingest text. Please check your connection and try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 transition-all duration-300">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] flex items-center justify-center md:justify-start mb-3">
          <div className="p-2.5 bg-[#1e62ff]/10 rounded-xl mr-4">
            <HardDrive className="w-8 h-8 text-[#1e62ff]" />
          </div>
          Knowledge Ingestion
        </h1>
        <p className="text-[var(--foreground)] opacity-60 max-w-2xl">Expand the AI's intelligence by supplying new university documents, policies, or raw text data.</p>
      </div>

      <div className="bg-[var(--card)] rounded-2xl shadow-xl border border-[var(--border)] overflow-hidden glass-card">
        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] bg-[var(--secondary)] p-1.5 gap-1.5">
          <button 
            className={`px-6 py-3 text-sm font-bold rounded-xl transition-all flex items-center ${
              activeTab === 'upload' 
                ? 'bg-[var(--card)] text-[var(--primary)] shadow-sm border border-[var(--border)]' 
                : 'text-[var(--foreground)] opacity-50 hover:opacity-100'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Bulk Upload
          </button>
          <button 
            className={`px-6 py-3 text-sm font-bold rounded-xl transition-all flex items-center ${
              activeTab === 'paste' 
                ? 'bg-[var(--card)] text-[var(--primary)] shadow-sm border border-[var(--border)]' 
                : 'text-[var(--foreground)] opacity-50 hover:opacity-100'
            }`}
            onClick={() => setActiveTab('paste')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Snippet Paste
          </button>
        </div>

        <div className="p-6 md:p-10">
          {activeTab === 'upload' ? (
            <form onSubmit={handleUpload} className="space-y-8">
              
              <div className="group border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--background)] p-8 md:p-16 text-center hover:border-[var(--primary)] transition-all cursor-pointer relative overflow-hidden">
                <input 
                  type="file" 
                  accept=".txt,.md,.pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                    {file ? 'Selected: ' + file.name : 'Drag & drop campus document'}
                  </h3>
                  <p className="text-sm text-[var(--foreground)] opacity-50 mb-6">
                    Supports PDF, TXT, and Markdown up to 10MB
                  </p>
                  <div className="inline-flex items-center px-6 py-2.5 bg-[var(--card)] text-[var(--primary)] text-xs font-bold uppercase tracking-widest rounded-full shadow-sm border border-[var(--border)]">
                    Browse Files
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--foreground)] opacity-60">
                    Document Category
                  </label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] transition-all"
                  >
                    <option value="">General Archives</option>
                    <option value="syllabus">Academic Syllabus</option>
                    <option value="policy">University Policy</option>
                    <option value="general">Campus Life</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--foreground)] opacity-60">
                    Target Audience
                  </label>
                  <select 
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] transition-all"
                  >
                    <option value="all">Entire University (All)</option>
                    <option value="student">Student Only</option>
                    <option value="faculty">Faculty & Staff Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-5 bg-[var(--background)] border border-[var(--border)] rounded-2xl">
                <input 
                  type="checkbox" 
                  id="allowDisplayDoc"
                  checked={allowDisplay}
                  onChange={(e) => setAllowDisplay(e.target.checked)}
                  className="w-5 h-5 accent-[var(--primary)] cursor-pointer"
                />
                <label htmlFor="allowDisplayDoc" className="text-sm font-semibold text-[var(--foreground)] cursor-pointer">
                  Allow chatbot to display this file link/image upon explicit user request
                </label>
              </div>

              <button 
                type="submit" 
                disabled={!file || isUploading}
                className="w-full bg-[var(--primary)] hover:opacity-90 text-white font-bold py-5 rounded-xl shadow-lg shadow-[var(--primary)]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {isUploading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                    Processing Knowledge...
                  </span>
                ) : 'Upload to Intelligence Base'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasteSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--foreground)] opacity-60">
                  Document Title
                </label>
                <input 
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="e.g., Staff Members List 2024"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] transition-all"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--foreground)] opacity-60">
                  Knowledge Body
                </label>
                <textarea 
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={10}
                  placeholder="Paste the raw text content here..."
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] transition-all min-h-[250px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--foreground)] opacity-60">
                    Category Tag
                  </label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] transition-all"
                  >
                    <option value="">General Archives</option>
                    <option value="syllabus">Academic Syllabus</option>
                    <option value="policy">University Policy</option>
                    <option value="general">Campus Life</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--foreground)] opacity-60">
                    Target Audience
                  </label>
                  <select 
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] transition-all"
                  >
                    <option value="all">Entire University (All)</option>
                    <option value="student">Student Only</option>
                    <option value="faculty">Faculty & Staff Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-5 bg-[var(--background)] border border-[var(--border)] rounded-2xl mt-6">
                <input 
                  type="checkbox" 
                  id="allowDisplayPaste"
                  checked={allowDisplay}
                  onChange={(e) => setAllowDisplay(e.target.checked)}
                  className="w-5 h-5 accent-[var(--primary)] cursor-pointer"
                />
                <label htmlFor="allowDisplayPaste" className="text-sm font-semibold text-[var(--foreground)] cursor-pointer">
                  Allow chatbot to reference this source context (Information mapping)
                </label>
              </div>

              <button 
                type="submit" 
                disabled={!textTitle || !textContent || isUploading}
                className="w-full bg-[var(--primary)] hover:opacity-90 text-white font-bold py-5 rounded-xl shadow-lg shadow-[var(--primary)]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {isUploading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                    Synthesizing...
                  </span>
                ) : 'Ingest Raw Information'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
