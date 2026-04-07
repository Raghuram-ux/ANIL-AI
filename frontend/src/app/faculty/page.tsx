"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Users, BarChart, BookOpen, Clock, ArrowRight, MessageSquare, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function FacultyDashboard() {
  const router = useRouter();
  const [facultyName, setFacultyName] = useState("Faculty Member");

  useEffect(() => {
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('username');
    if (user) setFacultyName(user);
    
    if (role !== 'faculty' && role !== 'admin') {
      router.push('/');
    }
  }, [router]);

  const stats = [
    { label: 'Active Students', value: '1,284', icon: Users, color: 'text-blue-500' },
    { label: 'Total Queries', value: '14,029', icon: MessageSquare, color: 'text-purple-500' },
    { label: 'Knowledge Base', value: '42 Files', icon: BookOpen, color: 'text-amber-500' },
    { label: 'Avg Responsiveness', value: '98.2%', icon: Clock, color: 'text-emerald-500' },
  ];

  const recentActivity = [
    { id: 1, type: 'Query', content: 'Student asked about End Semester Exams schedule', time: '2 mins ago' },
    { id: 2, type: 'Upload', content: 'Distributed Systems Lecture 12 added to AI', time: '1 hour ago' },
    { id: 3, type: 'Alert', content: 'High traffic detected on "Campus Placements" topic', time: '3 hours ago' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border)] pb-8">
        <div>
          <h2 className="text-[10px] uppercase font-black tracking-[0.3em] text-[var(--primary)] mb-2">Faculty Command Center</h2>
          <h1 className="text-4xl font-extrabold text-[var(--foreground)] tracking-tighter">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-amber-500">{facultyName}</span>
          </h1>
          <p className="text-[var(--foreground)] opacity-50 mt-2 font-medium">Manage your curriculum's AI presence and track student engagement.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/add-document"
            className="flex items-center px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl font-bold text-sm hover:translate-y-[-2px] hover:shadow-lg hover:shadow-[var(--primary)]/20 transition-all"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Course Material
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl bg-opacity-10 mb-4 flex items-center justify-center ${stat.color.replace('text-', 'bg-')}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--foreground)] opacity-40">{stat.label}</p>
            <p className="text-2xl font-black text-[var(--foreground)] mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] overflow-hidden shadow-xl">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <h3 className="font-bold flex items-center">
                <BarChart className="w-5 h-5 mr-3 text-blue-500" />
                Student Interest Analytics
              </h3>
              <button className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] hover:underline">View Report</button>
            </div>
            <div className="p-8 h-64 flex items-center justify-center bg-[var(--background)] m-4 rounded-xl border border-dashed border-[var(--border)]">
              <div className="text-center">
                <BarChart className="w-12 h-12 mx-auto text-[var(--border)] mb-4" />
                <p className="text-sm font-medium text-[var(--foreground)] opacity-50">Interactive Analytics Chart Loading...</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-2">Automate Your Office Hours</h3>
              <p className="opacity-80 mb-6 text-sm max-w-md">Laxx AI can now handle course-specific FAQs using your lecture notes. Upload your syllabus to get started.</p>
              <button className="px-6 py-3 bg-white text-indigo-700 rounded-xl font-bold text-sm flex items-center group-hover:px-8 transition-all">
                Learn More <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            </div>
            <GraduationCap className="absolute -bottom-10 -right-10 w-64 h-64 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] p-6 shadow-xl">
            <h3 className="font-bold mb-6 flex items-center">
              <Clock className="w-5 h-5 mr-3 text-amber-500" />
              Live Pulse
            </h3>
            <div className="space-y-6">
              {recentActivity.map((act) => (
                <div key={act.id} className="relative pl-6 border-l-2 border-[var(--border)] hover:border-[var(--primary)] transition-colors py-1">
                  <div className="absolute top-2 -left-[5px] w-2 h-2 rounded-full bg-[var(--border)] group-hover:bg-[var(--primary)]" />
                  <p className="text-[10px] uppercase font-black tracking-widest text-[var(--primary)] opacity-70 mb-1">{act.type}</p>
                  <p className="text-sm font-bold text-[var(--foreground)] leading-snug">{act.content}</p>
                  <p className="text-[10px] text-[var(--foreground)] opacity-40 mt-1">{act.time}</p>
                </div>
              ))}
            </div>
            <button className="w-full py-4 mt-6 text-[10px] font-bold uppercase tracking-widest bg-[var(--background)] border border-[var(--border)] rounded-xl hover:bg-[var(--secondary)] transition-colors">
              Show All Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
