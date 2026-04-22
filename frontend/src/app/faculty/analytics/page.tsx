"use client";
import { useState, useEffect } from 'react';
import { BarChart as BarChartIcon, ArrowLeft, TrendingUp, Users, MessageSquare, Activity } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from 'recharts';

interface AnalyticsData {
  daily_activity: { date: string; count: number }[];
  top_keywords: { text: string; value: number }[];
  role_distribution: Record<string, number>;
  stats: {
    total_messages: number;
    total_users: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/chat/admin/analytics');
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const pieData = data ? Object.entries(data.role_distribution).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="pb-6 border-b border-[var(--border)] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link href="/faculty" className="flex items-center text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] mb-4 hover:translate-x-[-5px] transition-transform w-fit">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
          </Link>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Institutional Intelligence</h1>
          <p className="text-[var(--foreground)] opacity-60 mt-1">Real-time breakdown of campus knowledge demand.</p>
        </div>
        <div className="flex bg-[var(--card)] p-1 rounded-xl border border-[var(--border)]">
           <div className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20">Live Pulse</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Total Queries</p>
          <h3 className="text-3xl font-black mt-1">{data?.stats.total_messages?.toLocaleString() || 0}</h3>
        </div>

        <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Unique Seekers</p>
          <h3 className="text-3xl font-black mt-1">{data?.stats.total_users?.toLocaleString() || 0}</h3>
        </div>

        <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
              <BarChartIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Active Roles</p>
          <h3 className="text-3xl font-black mt-1">{pieData.length}</h3>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Chart */}
        <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 mr-3 text-[var(--primary)]" />
            Query Volume (Last 7 Days)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.daily_activity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold' }} 
                  dy={10}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Keywords Chart */}
        <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-3 text-emerald-500" />
            Student Curiosities (Top Keywords)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.top_keywords} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="text" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 'bold' }} 
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                  {data?.top_keywords.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Distribution */}
        <div className="bg-[var(--card)] p-6 rounded-3xl border border-[var(--border)] shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold mb-6">User Base Segmentation</h3>
          <div className="flex flex-col md:flex-row items-center justify-around">
            <div className="h-64 w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-1/2 mt-8 md:mt-0">
               {pieData.map((role, idx) => (
                 <div key={idx} className="p-4 bg-[var(--secondary)] rounded-2xl border border-[var(--border)]">
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-40">{role.name}</p>
                    <div className="flex items-end space-x-2">
                      <span className="text-2xl font-black">{role.value}</span>
                      <span className="text-[10px] mb-1 font-bold opacity-30">Accounts</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
