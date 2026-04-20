"use client";
import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { Send, BookOpen, User, Trash2, Sparkles, Mic, MicOff, Volume2, VolumeX, Headphones, MapPin, Clock, Calendar, CreditCard, ChevronRight, ShieldCheck, X } from 'lucide-react';
import { useChat } from '@/context/ChatContext';

const ELEVENLABS_VOICES: Record<string, string> = {
  "Bella (Cute)": "EXAVITQu4vr4xnSDxMaL",
  "Rachel (Friendly)": "21m00Tcm4TlvDq8ikWAM",
  "Gigi (Enthusiastic)": "jBpf3uUE9Gu6KdeP9E0p",
  "Elli (Professional)": "MF3mGyEYCl7XYW7LdxSj",
  "Charlotte (Soft)": "xb0MDR63uEAbR37vP7zX"
};

const STUDENT_RECOMMENDATIONS = [
  { title: "Campus Map", query: "Show me the campus map", icon: MapPin, color: "text-blue-500", bg: "bg-blue-500/10" },
  { title: "Attendance", query: "What are the attendance requirements?", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  { title: "Holiday List", query: "Can I see the academic holiday list?", icon: Calendar, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { title: "Fee Status", query: "Tell me about the university fee structure", icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10" }
];

const TEACHER_RECOMMENDATIONS = [
  { title: "Staff Leave", query: "What are the staff leave and vacation rules?", icon: User, color: "text-red-500", bg: "bg-red-500/10" },
  { title: "Research Grant", query: "Tell me about available research grants and funding.", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10" },
  { title: "Exam Duty", query: "Show me the exam invigilation schedule.", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
  { title: "University HR", query: "Provide details on university staff policies.", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" }
];

const FluidWaveform = ({ state }: { state: 'idle'|'listening'|'processing'|'speaking' }) => {
  let colors = { blob1: '', blob2: '' };
  let scale = 'scale-100';
  let speedClasses1 = 'mesh-orb-1';
  let speedClasses2 = 'mesh-orb-2';

  if (state === 'listening') {
    colors = { blob1: 'bg-cyan-400', blob2: 'bg-blue-500' };
    scale = 'scale-150';
  } else if (state === 'speaking') {
    colors = { blob1: 'bg-amber-400', blob2: 'bg-orange-500' };
    scale = 'scale-125';
  } else if (state === 'processing') {
    colors = { blob1: 'bg-slate-300', blob2: 'bg-slate-400' };
    scale = 'scale-100';
    speedClasses1 = 'mesh-orb-1 [animation-duration:12s]';
    speedClasses2 = 'mesh-orb-2 [animation-duration:14s]';
  } else {
    // idle
    colors = { blob1: 'bg-blue-400', blob2: 'bg-indigo-400' };
    scale = 'scale-50 opacity-40';
  }

  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-1000 ease-in-out ${scale}`}>
      {/* Siri-style container with stark blur */}
      <div className="relative w-24 h-24 md:w-32 md:h-32 blur-xl opacity-90 orb-pulse">
         <div className={`absolute inset-0 rounded-full ${speedClasses1} opacity-70 ${colors.blob1} transition-colors duration-1000`}></div>
         <div className={`absolute inset-0 rounded-full ${speedClasses2} opacity-70 ${colors.blob2} transition-colors duration-1000`}></div>
         {/* Center bright core */}
         <div className={`absolute inset-4 rounded-full bg-white dark:bg-white/50 opacity-60 blur-md transition-colors duration-1000`}></div>
      </div>
    </div>
  );
};


export default function Chat() {
  const { messages, setMessages, clearChat } = useChat();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle'|'listening'|'processing'|'speaking'>('idle');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{url: string, type: 'pdf'|'image'|'web'} | null>(null);
  
  // Admin Global Voice Setup
  const [globalVoiceName, setGlobalVoiceName] = useState("");
  const [globalVoiceLang, setGlobalVoiceLang] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
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

  // Cleanup effect
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Handle Speech Synthesis (TTS)
  const speak = (text: string) => {
    if (!voiceEnabled || globalVoiceName === 'Disabled' || typeof window === 'undefined') return;
    
    // Cancel any existing synthesis or audio playback
    window.speechSynthesis.cancel(); 
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Filter out emojis from the spoken text so they aren't "read" aloud
    const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    
    // SPECIAL CASE: ELEVENLABS PREMIUM VOICES
    if (Object.keys(ELEVENLABS_VOICES).includes(globalVoiceName)) {
      try {
        setVoiceState('speaking');
        let fallbackTriggered = false;
        
        const triggerFallback = () => {
          if (fallbackTriggered) return;
          fallbackTriggered = true;
          setVoiceState('idle');
          audioRef.current = null;
          speakTraditionalSynthesis(cleanText);
        };
        
        // Define the endpoint URL with the specific voice ID
        const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const vId = ELEVENLABS_VOICES[globalVoiceName];
        const url = `${backendBaseUrl}/chat/speech?text=${encodeURIComponent(cleanText)}&voice_id=${vId}`;
          
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setVoiceState('idle');
          audioRef.current = null;
        };
        audio.onerror = (e) => {
          console.error(`Audio error for premium voice ${globalVoiceName}:`, e);
          triggerFallback();
        };
        audio.play().catch((playError) => {
          console.error(`Audio playback rejected for premium voice ${globalVoiceName}:`, playError);
          triggerFallback();
        });
        return;
      } catch (err) {
        console.error(`Could not initialize audio for premium voice ${globalVoiceName}`, err);
        setVoiceState('idle');
      }
    }

    speakTraditionalSynthesis(cleanText);
  };

  const speakTraditionalSynthesis = (cleanText: string) => {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    
    let selectedVoice = null;

    if (globalVoiceName) {
      selectedVoice = voices.find(v => v.name === globalVoiceName);
    }
    
    const isMale = (v: SpeechSynthesisVoice) => {
      const n = v.name.toLowerCase();
      return n.includes('david') || n.includes('mark') || n.includes('george') || 
             n.includes('ravi') || n.includes('google us english') || n.includes('male');
    };

    if (!selectedVoice && globalVoiceLang) {
      // Prefer female voices for the specified language
      selectedVoice = voices.find(v => v.lang.startsWith(globalVoiceLang) && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha'))) ||
                      voices.find(v => v.lang.startsWith(globalVoiceLang) && !isMale(v));
    }
    if (!selectedVoice) {
       // Fallback logic preferring female voices
       const hasTamilScript = /[\u0B80-\u0BFF]/.test(cleanText);
       if (hasTamilScript) {
         utterance.lang = 'ta-IN';
         selectedVoice = voices.find(v => v.lang.startsWith('ta') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira'))) || 
                         voices.find(v => v.lang.startsWith('ta') && !isMale(v)) || null;
       } else {
         utterance.lang = 'en-IN';
         selectedVoice = voices.find(v => v.lang === 'en-IN' && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira'))) || 
                         voices.find(v => v.lang === 'en-IN' && !isMale(v)) ||
                         voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira'))) ||
                         voices.find(v => v.lang.startsWith('en') && !isMale(v)) || null;
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

  const handleSend = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const userMessage = overrideQuery || input.trim();
    if (!userMessage) return;

    if (!isVoiceMode) setVoiceState('processing');

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
    <div className="flex flex-row h-[calc(100vh-5rem)] md:h-[calc(100vh-4rem)] w-full gap-4 transition-all duration-300">
      <div className={`flex flex-col bg-[var(--card)] rounded-xl shadow-xl border border-[var(--border)] overflow-hidden transition-all duration-300 ${selectedDocument ? 'hidden md:flex md:w-1/2' : 'w-full'}`}>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-[var(--background)] transition-all">
        <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-[var(--border)] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 md:p-2 bg-[var(--primary)] rounded-lg shadow-lg shadow-[#1e62ff]/20">
              <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <h1 className="text-base md:text-lg font-bold text-[var(--foreground)] tracking-tight">Campus Support</h1>
          </div>
          <div className="flex items-center space-x-2">
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
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 max-w-2xl mx-auto space-y-12">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[var(--primary)] blur-3xl opacity-20 rounded-full animate-pulse"></div>
                <BookOpen className="w-16 h-16 text-[var(--primary)] relative z-10" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-[var(--foreground)]">Welcome to Campus Intelligence</h2>
              <p className="text-sm leading-relaxed font-bold tracking-tight opacity-50 px-4">
                Ask me about attendance, academic policies, or department structures. 
                Use the cards below for quick access.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {(userRole === 'faculty' ? TEACHER_RECOMMENDATIONS : STUDENT_RECOMMENDATIONS).map((rec, i) => (
                <button
                  key={i}
                  onClick={() => {
                    handleSend(undefined, rec.query);
                  }}
                  className="flex items-center p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-left hover:scale-[1.02] hover:shadow-lg hover:shadow-[var(--primary)]/5 transition-all group relative overflow-hidden"
                >
                  <div className={`p-3 rounded-xl ${rec.bg} ${rec.color} mr-4 group-hover:scale-110 transition-transform`}>
                    <rec.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--foreground)] mb-0.5">{rec.title}</p>
                    <p className="text-[10px] uppercase font-black tracking-widest text-[var(--foreground)] opacity-30 truncate">Tap to inquire</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--foreground)] opacity-0 group-hover:opacity-40 transition-opacity" />
                  
                  {/* Subtle hover background decoration */}
                  <div className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-5 rounded-full ${rec.bg} group-hover:scale-150 transition-transform`}></div>
                </button>
              ))}
            </div>
            
            <div className="pt-8 flex items-center justify-center text-[10px] space-x-6 uppercase font-black tracking-[0.2em] opacity-30">
               {userRole === 'faculty' ? (
                 <>
                   <span>Staff Benefits</span>
                   <div className="w-1 h-1 bg-[var(--foreground)] rounded-full"></div>
                   <span>Research Hub</span>
                   <div className="w-1 h-1 bg-[var(--foreground)] rounded-full"></div>
                   <span>HR Policies</span>
                 </>
               ) : (
                 <>
                   <span>Attendance Audit</span>
                   <div className="w-1 h-1 bg-[var(--foreground)] rounded-full"></div>
                   <span>Policy Knowledge</span>
                   <div className="w-1 h-1 bg-[var(--foreground)] rounded-full"></div>
                   <span>Campus Maps</span>
                 </>
               )}
            </div>
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
              
              <div className="whitespace-pre-wrap leading-relaxed transition-colors text-sm md:text-base">
                {msg.content.split(/(!\[.*?\]\(.*?\)|\[.*?\]\(.*?\))/g).map((chunk, idx) => {
                  if (chunk.startsWith('![')) {
                    // Match image: ![Alt](Path)
                    const match = chunk.match(/!\[(.*?)\]\((.*?)\)/);
                    if (match) {
                      const [, alt, path] = match;
                      const isAbsolute = path.startsWith('http');
                      let finalUrl = path;
                      
                      if (!isAbsolute) {
                        const encodedPath = path.startsWith('/') ? path.split('/').map(segment => encodeURIComponent(segment)).join('/') : '/' + path.split('/').map(segment => encodeURIComponent(segment)).join('/');
                        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
                        finalUrl = `${baseUrl}${encodedPath.startsWith('/') ? encodedPath : '/' + encodedPath}`;
                      }
                      
                      return (
                        <div key={idx} className="my-4 group relative">
                          <img 
                            src={finalUrl} 
                            alt={alt} 
                            className="max-w-full rounded-2xl shadow-xl shadow-blue-500/10 border border-[var(--border)] hover:scale-[1.02] transition-transform duration-500" 
                          />
                          <div className="mt-2 text-[10px] uppercase font-bold text-[var(--foreground)] opacity-40 text-center tracking-widest">{alt || 'Campus Visual'}</div>
                        </div>
                      );
                    }
                  } else if (chunk.startsWith('[')) {
                    // Match link: [Text](Path)
                    const match = chunk.match(/\[(.*?)\]\((.*?)\)/);
                    if (match) {
                      const [, text, path] = match;
                      const isAbsolute = path.startsWith('http');
                      let finalUrl = path;
                      
                      if (!isAbsolute) {
                        const encodedPath = path.startsWith('/') ? path.split('/').map(segment => encodeURIComponent(segment)).join('/') : '/' + path.split('/').map(segment => encodeURIComponent(segment)).join('/');
                        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
                        finalUrl = `${baseUrl}${encodedPath.startsWith('/') ? encodedPath : '/' + encodedPath}`;
                      }

                      const isPdf = path.toLowerCase().endsWith('.pdf');
                      const isImage = finalUrl.match(/\.(jpeg|jpg|gif|png)$/i) != null;
                      return (
                        <a 
                          key={idx} 
                          href={finalUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => {
                             e.preventDefault();
                             setSelectedDocument({ url: finalUrl, type: isPdf ? 'pdf' : isImage ? 'image' : 'web' });
                          }}
                          className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all my-1 cursor-pointer ${
                            isPdf 
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' 
                              : 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)] hover:text-white shadow-sm'
                          }`}
                        >
                          {isPdf && <BookOpen className="w-3.5 h-3.5 mr-2" />}
                          {text}
                        </a>
                      );
                    }
                  }
                  return <span key={idx}>{chunk}</span>;
                })}
              </div>
              
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
             <FluidWaveform state={voiceState} />
             
             <div className="relative z-10 flex items-center justify-between w-full">
                <button 
                  onClick={() => {
                    setIsVoiceMode(false);
                    window.speechSynthesis.cancel();
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current = null;
                    }
                    setVoiceState('idle');
                  }}
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
              <Mic className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            {/* The Mute button (Voice Toggle) */}
            <button
              type="button"
              onClick={() => {
                const newState = !voiceEnabled;
                setVoiceEnabled(newState);
                if (!newState) {
                  window.speechSynthesis.cancel();
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current = null;
                  }
                  setVoiceState('idle');
                }
              }}
              className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full transition-all shrink-0 shadow-sm ${voiceEnabled ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-[var(--secondary)] text-[var(--foreground)] opacity-30 hover:opacity-100 hover:bg-[var(--border)]'}`}
              title={voiceEnabled ? "Turn off voice" : "Turn on voice"}
              disabled={isLoading}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 md:w-5 md:h-5" /> : <VolumeX className="w-4 h-4 md:w-5 md:h-5" />}
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
      </div></div>

      {/* Right Split: Document Viewer */}
      {selectedDocument && (
        <div className={`flex flex-col bg-[var(--card)] rounded-xl shadow-xl border border-[var(--border)] overflow-hidden transition-all duration-300 w-full md:w-1/2`}>
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-red-500/10 rounded-lg">
                <BookOpen className="w-4 h-4 text-red-500" />
              </div>
              <span className="font-bold text-sm tracking-tight text-[var(--foreground)]">Document Viewer</span>
            </div>
            <button 
              onClick={() => setSelectedDocument(null)}
              className="p-1.5 text-[var(--foreground)] opacity-60 hover:opacity-100 hover:bg-[var(--secondary)] rounded-md transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 bg-[var(--background)] relative p-2 md:p-4">
             {selectedDocument.type === 'pdf' && (
               <iframe src={selectedDocument.url} className="w-full h-full rounded-lg border border-[var(--border)] bg-white" title="PDF Document" />
             )}
             {selectedDocument.type === 'image' && (
               <div className="w-full h-full flex items-center justify-center p-4">
                 <img src={selectedDocument.url} alt="Document View" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
               </div>
             )}
             {selectedDocument.type === 'web' && (
               <iframe src={selectedDocument.url} className="w-full h-full rounded-lg border border-[var(--border)] bg-white" title="Web Document" />
             )}
          </div>
        </div>
      )}
    </div>
  );
}
