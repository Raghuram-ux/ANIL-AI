import Link from 'next/link';
import { MessageSquare, BookOpen, ShieldCheck, Sparkles, ArrowRight, Zap, GraduationCap } from 'lucide-react';

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto py-8 md:py-12 px-4 transition-all duration-300">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[var(--primary)] p-8 md:p-24 text-white shadow-2xl mb-12 md:mb-16">
        <div className="absolute top-0 right-0 -m-12 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -m-24 w-80 h-80 bg-amber-500 opacity-10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-8 border border-white/10 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 mr-2 text-amber-400" />
            Empowering Campus Intelligence
          </div>
          
          <h1 className="text-4xl md:text-7xl font-extrabold leading-[1.1] mb-6 md:mb-8 tracking-tighter">
            Meet <span className="text-amber-400 underline decoration-amber-400/30 decoration-4 md:decoration-8 underline-offset-4 md:underline-offset-8">LAXX</span>, Your University Concierge.
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 font-medium leading-relaxed mb-8 md:mb-12 max-w-xl">
            The next generation of campus support. Instant answers to your syllabus questions, attendance queries, and university policies—powered by state-of-the-art AI.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6">
            <Link 
              href="/chat"
              className="group inline-flex items-center justify-center px-8 md:px-10 py-4 md:py-5 bg-white text-[var(--primary)] font-black text-base md:text-lg uppercase tracking-wider rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-white/20"
            >
              <MessageSquare className="w-5 h-5 md:w-6 md:h-6 mr-3 group-hover:rotate-12 transition-transform" />
              Chat with Laxx Now
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: BookOpen, color: 'blue', title: 'Syllabus Archive', desc: 'Direct access to Semester 4 and across-dept academic documents.' },
          { icon: ShieldCheck, color: 'emerald', title: 'Campus Policies', desc: 'Detailed insights on attendance, exam rules, and code of conduct.' },
          { icon: GraduationCap, color: 'amber', title: 'Admin Registry', desc: 'Secured management systems for college staff and administration.' }
        ].map((feature, idx) => (
          <div key={idx} className="group p-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/50 hover:shadow-2xl transition-all duration-300 glass-card">
            <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <feature.icon className={`w-7 h-7 text-${feature.color}-500`} />
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-3 tracking-tight">{feature.title}</h3>
            <p className="text-[var(--foreground)] opacity-60 text-sm leading-relaxed mb-6">{feature.desc}</p>
            <div className="h-1 w-0 bg-[var(--primary)] group-hover:w-16 transition-all duration-500 rounded-full"></div>
          </div>
        ))}
      </div>

      {/* Stats/Badge Section */}
      <div className="mt-20 py-10 border-t border-[var(--border)] flex flex-col md:flex-row items-center justify-between gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
        <div className="flex items-center space-x-10 text-[var(--foreground)]">
          <div className="flex flex-col">
            <span className="text-2xl font-black italic">RIT</span>
            <span className="text-[9px] uppercase font-bold tracking-widest">Digital Campus</span>
          </div>
          <div className="h-8 w-px bg-[var(--border)]"></div>
          <div className="flex items-center">
            <Sparkles className="w-4 h-4 mr-2" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">AI Integrated 2026</span>
          </div>
        </div>
        <p className="text-[10px] uppercase font-black tracking-[0.3em] cursor-default">
          Designed for Excellence • Powered by Intelligence
        </p>
      </div>
    </div>
  );
}
