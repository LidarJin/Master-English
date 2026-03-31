
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      if (isSignUp) {
        await authService.signUp(email, password);
        setSuccessMsg('Garden initialized. Check your email for activation.');
      } else {
        const user = await authService.signIn(email, password);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white relative overflow-hidden">
      {/* Visual Side (Left) */}
      <div className="hidden md:flex flex-1 bg-indigo-600 p-20 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-indigo-500 rounded-full blur-[120px] opacity-20"></div>
        <div className="relative z-10">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-black mb-12">C.</div>
          <h2 className="text-6xl font-extrabold text-white tracking-tighter leading-[1.1] mb-8">
            Master English as a <span className="text-indigo-200">System</span>, not a list.
          </h2>
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl shrink-0">🌱</div>
              <div>
                <h4 className="text-white font-bold text-lg">Chunk Accumulation</h4>
                <p className="text-indigo-100/60 text-sm">Stop memorizing single words. Learn natural "chunks"—the building blocks of native fluency.</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl shrink-0">🧠</div>
              <div>
                <h4 className="text-white font-bold text-lg">Cognitive Drills</h4>
                <p className="text-indigo-100/60 text-sm">AI-generated scenarios that force your brain to retrieve and produce language in real-time.</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl shrink-0">📈</div>
              <div>
                <h4 className="text-white font-bold text-lg">Growth Spaced Repetition</h4>
                <p className="text-indigo-100/60 text-sm">A scientific schedule that turns "Seeds" into "Permanent Reflexes" through our Garden system.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-[10px] font-black text-indigo-300 uppercase tracking-[0.4em]">
          Designed for Advanced Professionals
        </div>
      </div>

      {/* Auth Side (Right) */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-20">
        <div className="w-full max-w-md space-y-12">
          <div className="text-center md:text-left space-y-4">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {isSignUp ? 'Initialize Profile' : 'Resume Growth'}
            </h1>
            <p className="text-slate-400 font-medium">
              {isSignUp ? 'Create your professional linguistic vault.' : 'Welcome back to your Linguistic Studio.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-2xl text-center border border-rose-100 animate-in shake-1">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-2xl text-center border border-indigo-100">
                {successMsg}
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="you@professional.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {isLoading ? 'Processing...' : (isSignUp ? 'Begin Journey' : 'Enter Studio')}
            </button>

            <div className="text-center pt-4">
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-indigo-600 transition-colors"
              >
                {isSignUp ? 'Already have a garden? Login' : 'Need a profile? Register here'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
