
import React, { Component, useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import ChunkForm from './components/ChunkForm';
import QuizSession from './components/QuizSession';
import Login from './components/Login';
import { Chunk, View, ReviewScore, Tag, User, MemoryStage } from './types';
import { dbService } from './services/dbService';
import { authService } from './services/authService';
import { speakText } from './services/geminiService';
import { playPCMBase64 } from './utils/audio';
import { getDaysFromLevel, getNextInterval, DEFAULT_TAGS } from './constants';

interface ErrorBoundaryProps { children?: React.ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: any; }

// Fixed ErrorBoundary by using React.Component and adding a constructor for better TS compatibility
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: any): ErrorBoundaryState { return { hasError: true, error }; }
  
  componentDidCatch(error: any, info: any) { console.error("Boundary Caught:", error, info); }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-12 text-center">
          <div className="space-y-6">
            <div className="text-5xl">♻️</div>
            <h1 className="text-xl font-extrabold text-slate-900">System Reset</h1>
            <button onClick={() => window.location.reload()} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Reboot</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainApp: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('Dashboard');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [globalTags, setGlobalTags] = useState<Tag[]>([]);
  const [syncStatus, setSyncStatus] = useState<'saved' | 'syncing' | 'error'>('saved');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'az' | 'za'>('newest');
  const [filterTag, setFilterTag] = useState<Tag | 'All'>('All');
  const [editingChunk, setEditingChunk] = useState<Chunk | null>(null);
  const [isReflexMode, setIsReflexMode] = useState(false);
  const [speakingChunkId, setSpeakingChunkId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    authService.getCurrentUser().then(user => {
      if (isMounted) {
        if (user) setCurrentUser(user);
        setIsInitialLoading(false);
      }
    }).catch(() => {
      if (isMounted) setIsInitialLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (currentUser) {
      const fetchData = async () => {
        setSyncStatus('syncing');
        try {
          const [loadedChunks, loadedTags] = await Promise.all([
            dbService.getChunks(),
            dbService.getTags()
          ]);
          setChunks(loadedChunks);
          setGlobalTags(loadedTags.length > 0 ? loadedTags : DEFAULT_TAGS);
          setSyncStatus('saved');
        } catch (e) { 
          setSyncStatus('error');
        }
      };
      fetchData();
    }
  }, [currentUser]);

  const performSync = async (updateFn: () => Promise<void>) => {
    setSyncStatus('syncing');
    try { 
      await updateFn(); 
      setSyncStatus('saved');
    } catch (e) { 
      setSyncStatus('error');
    } 
  };

  const handleAddChunk = (data: any) => {
    if (!currentUser) return;
    const newChunk: Chunk = {
      ...data,
      id: crypto.randomUUID(),
      userId: currentUser.id,
      createdAt: Date.now(),
      nextReviewDate: Date.now(),
      intervalLevel: 0,
      isMastered: false,
      stage: 'Acquisition' as MemoryStage
    };
    setChunks(prev => [newChunk, ...prev]);
    performSync(() => dbService.saveChunk(newChunk));
    setView('Library');
  };

  const handleUpdateChunk = (data: any) => {
    if (!editingChunk) return;
    const updatedChunk = { ...editingChunk, ...data };
    setChunks(prev => prev.map(c => c.id === editingChunk.id ? updatedChunk : c));
    performSync(() => dbService.saveChunk(updatedChunk));
    setEditingChunk(null);
    setView('Library');
  };

  const handleDeleteChunk = (id: string) => {
    if (window.confirm('Delete this chunk? This action cannot be undone.')) {
      setChunks(prev => prev.filter(c => c.id !== id));
      performSync(() => dbService.deleteChunk(id));
    }
  };

  const handleReviewChunk = (chunkId: string, score: ReviewScore) => {
    const now = Date.now();
    let chunkToSave: Chunk | null = null;

    setChunks(prevChunks => {
      return prevChunks.map(chunk => {
        if (chunk.id !== chunkId) return chunk;
        const newLevel = getNextInterval(chunk.intervalLevel, score);
        const stage: MemoryStage = newLevel >= 6 ? 'Maintenance' : 'Acquisition';
        const daysToAdd = getDaysFromLevel(newLevel, stage);
        const updated: Chunk = {
          ...chunk,
          intervalLevel: newLevel,
          nextReviewDate: now + (daysToAdd * 24 * 60 * 60 * 1000),
          lastPracticedAt: now,
          stage,
          isMastered: newLevel > 15
        };
        chunkToSave = updated; 
        return updated;
      });
    });

    if (chunkToSave) performSync(() => dbService.saveChunk(chunkToSave!));
  };

  const handleSpeak = async (chunk: Chunk) => {
    if (speakingChunkId) return;
    setSpeakingChunkId(chunk.id);
    try {
      const base64 = await speakText(chunk.english);
      if (base64) {
        await playPCMBase64(base64);
      }
    } catch (e) {
      console.error("Audio Synthesis Error:", e);
    } finally {
      setSpeakingChunkId(null);
    }
  };

  const dueChunks = useMemo(() => {
    const now = Date.now();
    return chunks.filter(c => !c.isMastered && (c.nextReviewDate || 0) <= now);
  }, [chunks]);

  const highFreqChunks = useMemo(() => chunks.filter(c => c.isHighFrequency), [chunks]);

  const filteredAndSortedChunks = useMemo(() => {
    let result = [...chunks];
    if (filterTag !== 'All') result = result.filter(c => c.tags.includes(filterTag));
    switch (sortOption) {
      case 'newest': result.sort((a, b) => b.createdAt - a.createdAt); break;
      case 'az': result.sort((a, b) => a.english.localeCompare(b.english)); break;
    }
    return result;
  }, [chunks, sortOption, filterTag]);

  if (isInitialLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-pulse font-black text-slate-200">WAKING GARDEN...</div></div>;
  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  const renderContent = () => {
    switch (view) {
      case 'Dashboard':
        return (
          <div className="space-y-16 animate-in fade-in duration-700">
            <header className="space-y-4">
              <h2 className="text-5xl font-extrabold text-slate-900 tracking-tighter">Linguistic Growth</h2>
              <p className="text-slate-400 font-medium tracking-tight">Managing your subconscious language patterns.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-12 rounded-[3.5rem] bg-indigo-600 text-white shadow-2xl flex flex-col justify-between min-h-[400px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-10 text-9xl">🧠</div>
                <div className="relative z-10">
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 opacity-60">Recall Queue</div>
                  <div className="text-7xl font-black mb-4 tracking-tighter">{dueChunks.length}</div>
                  <p className="opacity-80 font-bold">Chunks needing review</p>
                </div>
                <button 
                  onClick={() => { setIsReflexMode(false); setView('Quiz'); }} 
                  disabled={dueChunks.length === 0}
                  className="relative z-10 w-full bg-white text-indigo-600 h-16 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-indigo-50 transition-all disabled:opacity-50"
                >
                  {dueChunks.length > 0 ? 'Enter Training' : 'Nothing Due'}
                </button>
              </div>

              <div className="p-12 rounded-[3.5rem] bg-white border border-slate-100 shadow-xl flex flex-col justify-between min-h-[400px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-5 text-9xl">⚡️</div>
                <div className="relative z-10">
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 text-purple-400">Reflex Lab</div>
                  <div className="text-7xl font-black mb-4 tracking-tighter text-slate-900">{highFreqChunks.length}</div>
                  <p className="text-slate-400 font-bold">Priority High-Frequency Anchors</p>
                </div>
                <button onClick={() => setView('HFLab')} className="relative z-10 w-full bg-slate-900 text-white h-16 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-800 transition-all">Go to Lab</button>
              </div>
            </div>

            {/* Empty State / Welcome Guide */}
            {chunks.length < 3 && (
              <div className="p-16 rounded-[4rem] bg-slate-50 border border-slate-100 space-y-12 animate-in slide-in-from-bottom-4">
                <div className="space-y-4">
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Your Journey Starts Here</h3>
                   <p className="text-slate-400 font-medium">Fluency is built by gathering "Chunks"—meaningful combinations of words that native speakers use automatically.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">1</div>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">Capture a new expression you heard or want to use.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">2</div>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">Let AI refine the logic, IPA, and context for you.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">3</div>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">Complete daily drills to turn these Seeds into Reflexes.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setView('Add')}
                  className="inline-flex items-center gap-4 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Plant Your First Chunk
                </button>
              </div>
            )}
          </div>
        );
      case 'HFLab':
        return (
          <div className="space-y-12 animate-in fade-in pb-20">
             <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-8 border-b border-slate-100">
                <div>
                  <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Reflex Lab</h2>
                  <p className="text-[11px] font-black text-purple-400 uppercase tracking-[0.4em] mt-3">High-Frequency Drill Center</p>
                </div>
                <button 
                  onClick={() => { setIsReflexMode(true); setView('Quiz'); }}
                  disabled={highFreqChunks.length === 0}
                  className="bg-purple-600 text-white px-8 h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
                >
                  Start Reflex Drill
                </button>
             </header>
             <div className="grid grid-cols-1 gap-8">
                {highFreqChunks.map(chunk => (
                  <div key={chunk.id} className="p-10 rounded-[3rem] bg-white border border-slate-100 shadow-sm transition-all flex flex-col gap-6 relative group border-l-4 border-l-purple-500 hover:shadow-xl hover:shadow-purple-50">
                    <div className="absolute top-8 right-8 flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                       <button 
                         onClick={() => handleSpeak(chunk)} 
                         disabled={speakingChunkId === chunk.id}
                         className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${speakingChunkId === chunk.id ? 'bg-purple-100 text-purple-600 animate-pulse' : 'bg-purple-50 text-purple-500 hover:scale-105'}`}
                       >
                         🔊
                       </button>
                       <button onClick={() => { setEditingChunk(chunk); setView('Edit'); }} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">✏️</button>
                       <button onClick={() => handleDeleteChunk(chunk.id)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">🗑️</button>
                    </div>
                    <div>
                      <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">{chunk.english}</h3>
                      {chunk.pronunciation && (
                        <p className="text-[14px] font-bold text-purple-600 italic mb-3 tracking-wider bg-purple-50/50 inline-block px-3 py-1 rounded-lg">
                          {chunk.pronunciation}
                        </p>
                      )}
                      <p className="text-lg font-bold text-slate-500">{chunk.englishMeaning}</p>
                    </div>
                  </div>
                ))}
                {highFreqChunks.length === 0 && (
                  <div className="py-20 text-center space-y-4">
                    <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">No priority anchors yet</p>
                    <p className="text-slate-400 max-w-xs mx-auto text-sm font-medium leading-relaxed">Mark a chunk as "High-Frequency" when adding it to see it here for rapid training.</p>
                  </div>
                )}
             </div>
          </div>
        );
      case 'Library':
        return (
          <div className="space-y-12 animate-in fade-in pb-20">
             <header className="flex justify-between items-end">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">The Garden</h2>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                   <button onClick={() => setSortOption('newest')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg ${sortOption === 'newest' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Newest</button>
                   <button onClick={() => setSortOption('az')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg ${sortOption === 'az' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>A-Z</button>
                </div>
             </header>
             <div className="grid grid-cols-1 gap-8">
                {filteredAndSortedChunks.map(chunk => (
                  <div key={chunk.id} className={`p-10 rounded-[3rem] bg-white border border-slate-100 shadow-sm flex flex-col gap-6 relative group ${chunk.isHighFrequency ? 'ring-2 ring-purple-50 border-purple-100' : ''} hover:shadow-xl hover:shadow-slate-50`}>
                    <div className="absolute top-8 right-8 flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                       <button 
                         onClick={() => handleSpeak(chunk)} 
                         disabled={speakingChunkId === chunk.id}
                         className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${speakingChunkId === chunk.id ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-indigo-500'}`}
                       >
                         🔊
                       </button>
                       <button onClick={() => { setEditingChunk(chunk); setView('Edit'); }} className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">✏️</button>
                       <button onClick={() => handleDeleteChunk(chunk.id)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">🗑️</button>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{chunk.english}</h3>
                        {chunk.isMastered && <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">Mastered</span>}
                      </div>
                      {chunk.pronunciation && (
                        <p className="text-[13px] font-medium text-slate-400 italic mb-3 tracking-wide">{chunk.pronunciation}</p>
                      )}
                      <p className="text-slate-500 font-bold">{chunk.englishMeaning}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        );
      case 'Quiz':
        const quizList = isReflexMode ? highFreqChunks : dueChunks;
        return <QuizSession chunks={quizList} allChunks={chunks} onReviewItem={handleReviewChunk} onClose={() => { setView('Dashboard'); setIsReflexMode(false); }} />;
      case 'Add':
      case 'Edit':
        return <ChunkForm onSave={view === 'Edit' ? handleUpdateChunk : handleAddChunk} onCancel={() => { setView('Library'); setEditingChunk(null); }} availableTags={globalTags} initialData={editingChunk} onAddNewTag={(tag) => performSync(() => dbService.saveTags([...globalTags, tag]))} />;
      case 'Settings':
        return (
          <div className="max-w-2xl mx-auto space-y-12">
            <header className="space-y-2">
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">System Settings</h2>
              <p className="text-slate-400 font-medium tracking-tight">Vault management for {currentUser.email}</p>
            </header>
            <div className="p-12 bg-white rounded-[3rem] border border-slate-100 shadow-xl flex flex-col gap-8">
              <div className="flex justify-between items-center pb-8 border-b border-slate-50">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Identity</p>
                  <p className="text-lg font-bold text-slate-900">{currentUser.email}</p>
                </div>
                <button onClick={() => authService.logout().then(() => window.location.reload())} className="px-8 py-4 bg-rose-50 text-rose-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-rose-100 transition-all active:scale-95">Logout</button>
              </div>
              <div className="space-y-2 opacity-30 cursor-not-allowed">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Encrypted Cloud Storage</p>
                 <p className="text-sm font-bold text-slate-900">Synchronized via Supabase Core</p>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <ErrorBoundary>
      <Layout currentView={view} setView={setView} dueCount={dueChunks.length} onQuickCapture={() => {}} syncStatus={syncStatus}>
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
};

export default MainApp;
