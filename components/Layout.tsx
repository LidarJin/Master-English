
import React from 'react';
import { View } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  setView: (view: View) => void;
  dueCount: number;
  onQuickCapture: (text: string) => void;
  syncStatus?: 'saved' | 'syncing' | 'error';
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, dueCount, syncStatus }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sidebar */}
      <nav className="w-full md:w-80 border-r border-slate-100 bg-white/50 backdrop-blur-md p-10 flex flex-col shrink-0 z-20">
        <div className="flex items-center gap-4 px-2 mb-16">
          <div className="w-11 h-11 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
            <span className="text-lg font-extrabold tracking-tighter">C.</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">Chunkify</h1>
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.25em] mt-1.5 block">Linguistic Studio</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {[
            { id: 'Dashboard', label: 'Dashboard', icon: '✦' },
            { id: 'Library', label: 'My Garden', icon: '🪴' },
            { id: 'HFLab', label: 'Reflex Lab', icon: '⚡️' },
            { id: 'Quiz', label: 'Daily Drill', icon: '🧠', badge: dueCount },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`group flex items-center justify-between px-6 h-14 rounded-2xl text-[13px] font-bold transition-all duration-300 active:scale-[0.97] ${
                currentView === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-base transition-transform group-hover:scale-110 ${currentView === item.id ? 'opacity-100' : 'opacity-40'}`}>
                  {item.icon}
                </span>
                {item.label}
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${currentView === item.id ? 'bg-white/20 text-white' : 'bg-indigo-600 text-white'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto pt-10 flex flex-col gap-6">
           <div className={`px-6 py-4 rounded-2xl bg-white border flex items-center gap-3 shadow-sm ${syncStatus === 'error' ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : 
                syncStatus === 'error' ? 'bg-rose-500' : 
                'bg-emerald-400'
              }`}></div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${syncStatus === 'error' ? 'text-rose-600' : 'text-slate-400'}`}>
                {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Error' : 'Encrypted'}
              </span>
           </div>

           <button 
             onClick={() => setView('Settings')}
             className={`flex items-center gap-4 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
               currentView === 'Settings' ? 'text-indigo-600 font-bold' : 'text-slate-300 hover:text-slate-600'
             }`}
           >
             <span>⚙️</span> System
           </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        <header className="h-24 px-10 md:px-16 flex items-center justify-end shrink-0">
          <button 
            onClick={() => setView('Add')}
            className="bg-indigo-600 text-white px-10 h-12 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-3 active:scale-95"
          >
            <span>+</span> Plant New Seed
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 md:p-16 pt-4">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
