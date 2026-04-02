"use client";
import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { Send, BookOpen, User, Trash2, Sparkles, Mic, MicOff, Volume2, VolumeX, Headphones } from 'lucide-react';
import { useChat } from '@/context/ChatContext';

export default function Chat() {
  const { messages, setMessages, clearChat } = useChat();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle'|'listening'|'processing'|'speaking'>('idle');
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Admin Global Voice Setup
  const [globalVoiceName, setGlobalVoiceName] = useState("");
  const [globalVoiceLang, setGlobalVoiceLang] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Load initial settings
  useEffect(() => {
    // Set user role
    setUserRole(localStorage.getItem('role'));

    // Fetch Admin Voice Setup
    api.get('/settings/voice').then(res => {
      if (res.data.voice_name) setGlobalVoiceName(res.data.voice_name);
      if (res.data.voice_lang) setGlobalVoiceLang(res.data.voice_lang);
    }).catch(err => console.error("Could not fetch global voice setup", err));

  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Speech Synthesis (TTS)
  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined') return;
    window.speechSynthesis.cancel(); 

    // Filter out emojis from the spoken text so they aren't "read" aloud
    const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    
    let selectedVoice = null;

    if (globalVoiceName) {
      selectedVoice = voices.find(v => v.name === globalVoiceName);
    }
    if (!selectedVoice && globalVoiceLang) {
      selectedVoice = voices.find(v => v.lang.startsWith(globalVoiceLang));
    }
    if (!selectedVoice) {
       // Fallback logic preferring female voices
       const hasTamilScript = /[\u0B80-\u0BFF]/.test(text);
       if (hasTamilScript) {
         utterance.lang = 'ta-IN';
         selectedVoice = voices.find(v => v.lang.startsWith('ta') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira'))) || 
                         voices.find(v => v.lang.startsWith('ta')) || null;
       } else {
         utterance.lang = 'en-IN';
         selectedVoice = voices.find(v => v.lang === 'en-IN' && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira'))) || 
                         voices.find(v => v.lang === 'en-IN') ||
                         voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira'))) ||
                         voices.find(v => v.lang.startsWith('en')) || null;
       }
    }

    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;

    utterance.onstart = () => setVoiceState('speaking');
    utterance.onend = () => setVoiceState('idle');
    utterance.onerror = () => setVoiceState('idle');

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
        recognitionRef.current.lang = globalVoiceLang || 'en-IN'; // Better support for Indian English/Tanglish accent

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
          setVoiceState('processing');
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === 'network') {
             alert("Speech Recognition failed: Network error. Note that this feature requires a secure connection (HTTPS or localhost) and an active internet connection to your browser's speech service.");
          } else if (event.error === 'not-allowed') {
             alert("Microphone access denied. Please allow microphone permissions.");
          }
          setIsListening(false);
          setVoiceState('idle');
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          // Auto send logic inside useEffect hook relies on latest state changes, 
          // but we handle auto-send inside the effect watching 'input' if Voice Mode is active
        };
      }
    }
  }, [globalVoiceLang]);

  // Auto trigger handleSend if we just finished listening and are in Voice Mode
  useEffect(() => {
    if (isVoiceMode && input.trim() && !isListening && voiceState === 'processing') {
      handleSend();
    }
  }, [input, isListening, isVoiceMode, voiceState]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoiceState('idle');
    } else {
      if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser.");
        return;
      }
      try {
        window.speechSynthesis.cancel();
        recognitionRef.current.start();
        setIsListening(true);
        setVoiceState('listening');
      } catch (e) {
        console.error("Failed to start listening:", e);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    if (!isVoiceMode) setVoiceState('processing');

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
      // Speak the response 
      speak(res.data.answer);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error communicating with the university servers.' }]);
      setVoiceState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] bg-[var(--card)] rounded-xl shadow-xl border border-[var(--border)] overflow-hidden transition-all duration-300">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-[var(--background)] transition-all">
        <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-[var(--border)] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 md:p-2 bg-[var(--primary)] rounded-lg shadow-lg shadow-[#1e62ff]/20">
              <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <h1 className="text-base md:text-lg font-bold text-[var(--foreground)] tracking-tight">Campus Support</h1>
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
            <p className="text-center max-w-sm text-sm leading-relaxed font-bold tracking-tight opacity-70">
              [SYSTEM INTERFACE ONLINE] Automated Institutional Knowledge Access. Enter query to retrieve data regarding: **attendance**, **syllabus**, or **university policies**.
            </p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[90%] md:max-w-[85%] rounded-2xl p-4 md:p-5 shadow-sm transition-all hover:shadow-md ${
              msg.role === 'user' 
                ? 'bg-[var(--primary)] text-white rounded-tr-none' 
                : 'bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-tl-none glass-card'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center mb-3 text-[var(--primary)] font-bold">
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="text-[10px] uppercase tracking-[0.2em]">Laxx</span>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="flex items-center justify-end mb-3 text-white/70">
                  <span className="text-[10px] uppercase tracking-[0.2em] mr-2">Member</span>
                  <User className="w-4 h-4" />
                </div>
              )}
              
              <div className="whitespace-pre-wrap leading-relaxed transition-colors text-sm md:text-base">{msg.content}</div>
              
              {msg.role === 'assistant' && userRole === 'admin' && msg.sources && msg.sources.length > 0 && (
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
        
        {isVoiceMode ? (
          <div className="flex flex-col items-center justify-center p-4 md:p-6 bg-[var(--secondary)] rounded-3xl animate-in slide-in-from-bottom-10 fade-in duration-500 relative overflow-hidden h-40 md:h-32">
             {/* Animations based on state */}
             {voiceState === 'listening' && (
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 md:w-20 h-16 md:h-20 bg-blue-500/20 rounded-full animate-ping"></div>
               </div>
             )}
             {voiceState === 'speaking' && (
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 md:w-24 h-20 md:h-24 bg-amber-500/20 rounded-full animate-pulse transition-all duration-75"></div>
               </div>
             )}
             
             <div className="relative z-10 flex items-center justify-between w-full">
                <button 
                  onClick={() => setIsVoiceMode(false)}
                  className="px-2 md:px-4 py-2 text-[10px] md:text-xs font-bold text-[var(--foreground)] opacity-60 hover:opacity-100 uppercase tracking-widest"
                >
                  Exit
                </button>
                
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full transition-all shadow-xl z-20 ${
                    voiceState === 'listening' 
                      ? 'bg-red-500 text-white shadow-red-500/50 scale-110' 
                      : voiceState === 'speaking'
                      ? 'bg-[var(--foreground)] text-[var(--background)] shadow-[var(--foreground)]/30 scale-105'
                      : voiceState === 'processing'
                      ? 'bg-slate-500 text-white animate-spin'
                      : 'bg-[var(--primary)] text-white hover:scale-105'
                  }`}
                >
                  {voiceState === 'listening' ? <MicOff className="w-6 h-6 md:w-8 md:h-8" /> : <Mic className="w-6 h-6 md:w-8 md:h-8" />}
                </button>
                
                <div className="w-10 md:w-20"></div> {/* Spacer to keep mic centered */}
             </div>
             <p className="text-[9px] md:text-[10px] mt-2 md:mt-4 uppercase font-bold tracking-widest opacity-50 z-10">
                {voiceState === 'listening' ? 'Listening...' : voiceState === 'processing' ? 'Thinking...' : voiceState === 'speaking' ? 'Speaking...' : 'Tap Mic'}
             </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex space-x-2 md:space-x-3 items-center">
            <input
              type="text"
              className="flex-1 bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] rounded-full px-4 md:px-6 py-2.5 md:py-3.5 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:bg-[var(--card)] transition-all"
              placeholder="Question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            {/* The Voice Mode toggle button */}
            <button
              type="button"
              onClick={() => setIsVoiceMode(true)}
              disabled={isLoading}
              className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--border)] transition-all shrink-0 shadow-sm"
              title="Enter Voice Mode"
            >
              <Headphones className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="bg-[var(--primary)] hover:opacity-90 text-white disabled:bg-slate-300 rounded-full w-10 h-10 md:w-14 md:h-14 flex items-center justify-center transition-all shrink-0 shadow-md"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5 md:ml-1" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
