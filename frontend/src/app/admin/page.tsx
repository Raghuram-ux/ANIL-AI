"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Trash2, FileText, Volume2, Save } from 'lucide-react';

export default function AdminDashboard() {
  const [documents, setDocuments] = useState([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [selectedVoiceLang, setSelectedVoiceLang] = useState("");

  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'admin' && role !== 'faculty') {
      router.push('/');
    } else {
      fetchDocuments();
      fetchVoiceSetting();
      
      const populateVoices = () => setVoices(window.speechSynthesis.getVoices());
      populateVoices();
      if (typeof window !== "undefined" && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
      }
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

  const fetchVoiceSetting = async () => {
    try {
      const res = await api.get('/settings/voice');
      if (res.data.voice_name) setSelectedVoiceName(res.data.voice_name);
      if (res.data.voice_lang) setSelectedVoiceLang(res.data.voice_lang);
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

  const handleSaveVoice = async () => {
    try {
      await api.post('/settings/voice', { voice_name: selectedVoiceName, voice_lang: selectedVoiceLang });
      alert("Voice settings successfully saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save voice settings");
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto transition-all duration-300">
      <div className="pb-6 border-b border-[var(--border)]">
        <h2 className="text-3xl font-extrabold text-[var(--primary)] tracking-tight">Archive Repository</h2>
        <p className="text-[var(--foreground)] opacity-70 mt-1">Audit and manage the active university intelligence datasets.</p>
      </div>

      <div className="bg-[var(--card)] p-4 md:p-8 rounded-2xl shadow-xl border border-[var(--border)] glass-card">
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
                      Inserted {new Date(doc.uploaded_at).toLocaleDateString()} • Target: <span className="text-[var(--primary)]">{doc.audience === 'all' ? 'All Users' : doc.audience === 'faculty' ? 'Faculty/Staff Only' : 'Student Only'}</span>
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

      <div className="bg-[var(--card)] p-4 md:p-8 rounded-2xl shadow-xl border border-[var(--border)] glass-card mt-8">
        <div className="flex items-center mb-6">
          <Volume2 className="w-6 h-6 mr-3 text-[var(--primary)]" />
          <h3 className="text-xl font-bold text-[var(--foreground)]">Global Voice Configuration</h3>
        </div>
        <p className="text-[var(--foreground)] opacity-70 mb-6 text-sm">
          Select the default text-to-speech voice used by the chatbot for all users. Note that voice availability may vary by the browser, falling back to basic matching if exactly not found.
        </p>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--primary)] mb-2">Select Voice</label>
            <select 
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
              value={selectedVoiceName}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedVoiceName(val);
                if (val === 'Brian' || val === 'Bella (Cute)') {
                  setSelectedVoiceLang('en-US');
                } else {
                  const voice = voices.find(v => v.name === val);
                  if (voice) {
                    setSelectedVoiceLang(voice.lang);
                  } else {
                    setSelectedVoiceLang('');
                  }
                }
              }}
            >
              <option value="Disabled">-- Turn Off Voice --</option>
              <option value="">-- System Default --</option>
              <option value="Brian">Brian (StreamElements)</option>
              <option value="Bella (Cute)">Bella (Cute - ElevenLabs)</option>
              {voices.map((voice, idx) => (
                <option key={idx} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--primary)] mb-2">Target Language Code</label>
            <input 
              type="text" 
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] opacity-70 cursor-not-allowed"
              value={selectedVoiceLang}
              readOnly
              placeholder="e.g. en-US"
            />
          </div>
        </div>
        
        <button 
          onClick={handleSaveVoice}
          className="w-full md:w-auto flex items-center justify-center px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md"
        >
          <Save className="w-5 h-5 mr-2" />
          Save Voice Settings
        </button>
      </div>
    </div>
  );
}
