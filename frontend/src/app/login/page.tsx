"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { GraduationCap, LogIn } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        await api.post('/auth/register', { username, password, role });
      }
      
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const res = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      localStorage.setItem('access_token', res.data.access_token);
      
      const tokenParts = res.data.access_token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      localStorage.setItem('role', payload.role);
      
      if (payload.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/chat');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
      <div className="bg-blue-900 p-6 text-center text-white">
        <GraduationCap className="w-12 h-12 mx-auto text-amber-500 mb-2" />
        <h2 className="text-2xl font-serif font-bold">{isRegistering ? 'Student/Staff Enrollment' : 'Campus Portal Login'}</h2>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">{error}</div>}
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">University ID (Username)</label>
          <input 
            type="text" 
            required 
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input 
            type="password" 
            required 
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {isRegistering && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="student">Student / Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        )}

        <button 
          type="submit" 
          className="w-full bg-blue-800 hover:bg-blue-900 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
        >
          <LogIn className="w-4 h-4 mr-2" />
          {isRegistering ? 'Register & Login' : 'Login'}
        </button>
        
        <div className="text-center pt-2">
          <button 
            type="button" 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div>
      </form>
    </div>
  );
}
