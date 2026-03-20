"use client";
import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { Send, BookOpen, User, Trash2, Sparkles, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

export default function Chat() {
  const [messages, setMessages] = useState<{role: string, content: string, sources?: string[]}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('chat_messages');
  };
  
  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat_messages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to parse saved messages", e);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Speech Synthesis (TTS)
  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined') return;
    window.speechSynthesis.cancel(); 

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Detect if content is likely Tamil (checking for Tamil script range)
    const hasTamilScript = /[\u0B80-\u0BFF]/.test(text);
    
    // Attempt to find a suitable voice
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    if (hasTamilScript) {
      utterance.lang = 'ta-IN';
      selectedVoice = voices.find(v => v.lang.startsWith('ta')) || null;
    } else {
      // For Tanglish/English, en-IN often sounds more natural for this use case
      utterance.lang = 'en-IN';
      selectedVoice = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en')) || null;
    }

    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Initialize Speech Recognition (STT)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-IN'; // Better support for Indian English/Tanglish accent

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start listening:", e);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/chat', { query: userMessage });
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: res.data.answer,
        sources: res.data.sources
      }]);
      // Speak the response if voice is enabled
      speak(res.data.answer);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error communicating with the university servers.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[var(--card)] rounded-xl shadow-xl border border-[var(--border)] overflow-hidden transition-all duration-300">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--background)] transition-all">
        <div className="flex justify-between items-center mb-6 border-b border-[var(--border)] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[var(--primary)] rounded-lg shadow-lg shadow-[#1e62ff]/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-[var(--foreground)] tracking-tight">Campus Support Chat</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-lg transition-all ${voiceEnabled ? 'bg-amber-500/10 text-amber-500' : 'text-[var(--foreground)] opacity-30 hover:opacity-100'}`}
              title={voiceEnabled ? "Turn off voice" : "Turn on voice"}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            {messages.length > 0 && (
              <button 
                onClick={clearChat}
                className="group flex items-center text-xs font-bold text-red-500 hover:text-red-700 transition-all uppercase tracking-widest px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2 group-hover:rotate-12 transition-transform" />
                Reset
              </button>
            )}
          </div>
        </div>

        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[var(--primary)] blur-3xl opacity-10 rounded-full animate-pulse"></div>
              <BookOpen className="w-20 h-20 text-[var(--primary)] opacity-20 relative z-10" />
            </div>
            <p className="text-center max-w-sm text-sm leading-relaxed italic">
              "Hey there. I'm **ANIL**, a senior here. Take it easy and don't stress—I'm here to help you find whatever you need. Ask me about **attendance, syllabus, or campus life**."
            </p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm transition-all hover:shadow-md ${
              msg.role === 'user' 
                ? 'bg-[var(--primary)] text-white rounded-tr-none' 
                : 'bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-tl-none glass-card'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center mb-3 text-[var(--primary)] font-bold">
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="text-[10px] uppercase tracking-[0.2em]">Concierge AI</span>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="flex items-center justify-end mb-3 text-white/70">
                  <span className="text-[10px] uppercase tracking-[0.2em] mr-2">Member</span>
                  <User className="w-4 h-4" />
                </div>
              )}
              
              <div className="whitespace-pre-wrap leading-relaxed transition-colors">{msg.content}</div>
              
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] opacity-80">
                  <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest mb-2">Campus Sources:</p>
                  <ul className="text-xs text-[var(--foreground)] opacity-70 list-disc list-inside space-y-1">
                    {msg.sources.map((src, idx) => (
                      <li key={idx} className="truncate">{src}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 rounded-tl-none shadow-md flex space-x-2">
              <div className="w-2.5 h-2.5 bg-[var(--primary)] rounded-full animate-bounce"></div>
              <div className="w-2.5 h-2.5 bg-[var(--primary)]/60 rounded-full animate-bounce delay-75"></div>
              <div className="w-2.5 h-2.5 bg-[var(--primary)]/30 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-[var(--card)] border-t border-[var(--border)] transition-colors">
        <form onSubmit={handleSend} className="flex space-x-3 items-center">
          <input
            type="text"
            className="flex-1 bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] rounded-full px-6 py-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--card)] transition-all"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading}
            className={`w-14 h-14 flex items-center justify-center rounded-full transition-all shrink-0 shadow-md ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse shadow-red-500/50' 
                : 'bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--border)]'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="bg-[var(--primary)] hover:opacity-90 text-white disabled:bg-slate-300 rounded-full w-14 h-14 flex items-center justify-center transition-all shrink-0 shadow-md"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
