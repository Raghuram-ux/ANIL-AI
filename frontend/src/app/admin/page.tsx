"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Trash2, FileText } from 'lucide-react';

export default function AdminDashboard() {
  const [documents, setDocuments] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin') {
      router.push('/');
    } else {
      fetchDocuments();
    }
  }, [router]);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/admin/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/admin/documents/${id}`);
      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto transition-all duration-300">
      <div className="pb-6 border-b border-[var(--border)]">
        <h2 className="text-3xl font-extrabold text-[var(--primary)] tracking-tight">Archive Repository</h2>
        <p className="text-[var(--foreground)] opacity-70 mt-1">Audit and manage the active university intelligence datasets.</p>
      </div>

      <div className="bg-[var(--card)] p-8 rounded-2xl shadow-xl border border-[var(--border)] glass-card">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-[var(--foreground)] flex items-center">
            <FileText className="w-6 h-6 mr-3 text-amber-500" />
            Active Documents
          </h3>
          <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] uppercase font-bold tracking-widest rounded-full">
            {documents.length} Files Total
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-20 bg-[var(--background)] rounded-xl border-2 border-dashed border-[var(--border)]">
            <FileText className="w-12 h-12 mx-auto text-[var(--border)] mb-4" />
            <p className="text-[var(--foreground)] opacity-50 font-medium tracking-tight">Your vault is currently empty.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden shadow-inner bg-[var(--background)]">
            {documents.map((doc: any) => (
              <li key={doc.id} className="p-5 flex justify-between items-center hover:bg-[var(--secondary)] transition-all group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-amber-500 shadow-sm group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--foreground)] tracking-tight">
                      {doc.filename}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-[var(--foreground)] opacity-50 font-bold mt-1">
                      Inserted {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(doc.id)} 
                  className="p-3 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  title="Expunge Document"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
