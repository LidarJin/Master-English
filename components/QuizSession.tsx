
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chunk, ReviewScore, QuizLevel, SessionItem } from '../types';
import { generateProductionPrompt, evaluateProduction, speakText } from '../services/geminiService';
import { playPCMBase64 } from '../utils/audio';

interface QuizSessionProps {
  chunks: Chunk[];
  allChunks: Chunk[];
  onReviewItem: (chunkId: string, score: ReviewScore) => void;
  onClose: () => void;
}

const QuizSession: React.FC<QuizSessionProps> = ({ chunks, allChunks, onReviewItem, onClose }) => {
  const [sessionQueue, setSessionQueue] = useState<SessionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [productionData, setProductionData] = useState<{ scenario: string; simpleSentence: string } | null>(null);
  const [evaluation, setEvaluation] = useState<{ isCorrect: boolean; feedback: string; improvedVersion: string } | null>(null);
  const [isLoadingL3, setIsLoadingL3] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRoundComplete, setIsRoundComplete] = useState(false);
  const [roundCount, setRoundCount] = useState(1);
  
  const practicedInCurrentRound = useRef<Set<string>>(new Set());

  const buildQueue = (sourceChunks: Chunk[]) => {
    let eligible = sourceChunks.filter(c => !practicedInCurrentRound.current.has(c.id));
    
    // Priority 1: High Frequency words that are due
    const hfDue = eligible.filter(c => c.isHighFrequency);
    // Priority 2: Non-HF words that are due
    const normalDue = eligible.filter(c => !c.isHighFrequency);

    eligible = [...hfDue, ...normalDue];

    if (eligible.length < 5 && allChunks.length > 5) {
      eligible = [...allChunks].sort((a, b) => (a.lastPracticedAt || 0) - (b.lastPracticedAt || 0));
    }

    let fullList: SessionItem[] = [];
    const slice = eligible.slice(0, 30);

    slice.forEach(c => {
      if (c.isHighFrequency) {
        fullList.push({ chunkId: c.id, level: QuizLevel.Production, phase: 'SpeedDrill' });
      } else if (c.intervalLevel < 2) {
        fullList.push({ chunkId: c.id, level: QuizLevel.Recognition, phase: 'Warmup' });
      } else if (c.intervalLevel < 5) {
        fullList.push({ chunkId: c.id, level: QuizLevel.Retrieval, phase: 'Core' });
      } else {
        fullList.push({ chunkId: c.id, level: QuizLevel.Production, phase: 'Cruise' });
      }
    });
    
    return roundCount === 1 ? fullList : [...fullList].sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    const initialQueue = buildQueue(chunks.length > 0 ? chunks : allChunks);
    setSessionQueue(initialQueue);
  }, []);

  const currentItem = sessionQueue[currentIndex];
  const currentChunk = useMemo(() => {
    if (!currentItem) return null;
    return allChunks.find(c => c.id === currentItem.chunkId);
  }, [allChunks, currentItem]);

  const handlePlayAudio = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const base64 = await speakText(text);
      if (base64) {
        await playPCMBase64(base64);
      }
    } catch (e) {
      console.error("Quiz Audio Error:", e);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleReveal = async () => {
    if (currentItem?.level === QuizLevel.Production && userInput.trim()) {
      setIsEvaluating(true);
      const result = await evaluateProduction(currentChunk!.english, currentChunk!.englishMeaning, userInput);
      setEvaluation(result);
      setIsEvaluating(false);
    }
    setShowAnswer(true);
    if (currentItem?.level !== QuizLevel.Production || currentChunk?.isHighFrequency) {
      handlePlayAudio(currentChunk!.english);
    }
  };

  const handleScore = (score: ReviewScore) => {
    const chunkId = currentChunk!.id;
    onReviewItem(chunkId, score);
    practicedInCurrentRound.current.add(chunkId);

    let updatedQueue = [...sessionQueue];
    if (score === ReviewScore.Easy) {
      updatedQueue = updatedQueue.filter((item, index) => {
        return index <= currentIndex || item.chunkId !== chunkId;
      });
      setSessionQueue(updatedQueue);
    }

    if (currentIndex + 1 < updatedQueue.length) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setUserInput('');
      setEvaluation(null);
      setProductionData(null);
    } else {
      setIsRoundComplete(true);
    }
  };

  const startNextRound = () => {
    const nextQueue = buildQueue(allChunks); 
    setSessionQueue(nextQueue);
    setCurrentIndex(0);
    setShowAnswer(false);
    setUserInput('');
    setEvaluation(null);
    setProductionData(null);
    setIsRoundComplete(false);
    setRoundCount(prev => prev + 1);
  };

  useEffect(() => {
    if (currentItem?.level === QuizLevel.Production && currentChunk && !showAnswer) {
      const fetchL3 = async () => {
        setIsLoadingL3(true);
        const data = await generateProductionPrompt(currentChunk.english, currentChunk.englishMeaning, true);
        setProductionData(data);
        setIsLoadingL3(false);
      };
      fetchL3();
    }
  }, [currentItem, currentChunk, showAnswer]);

  if (isRoundComplete) {
    return (
      <div className="max-w-2xl mx-auto py-20 animate-in zoom-in-95 duration-700">
        <div className="bg-white rounded-[4rem] p-20 shadow-[0_50px_100px_-30px_rgba(45,51,107,0.1)] border border-slate-50 text-center space-y-12">
          <div className="space-y-6">
            <div className="w-24 h-24 bg-indigo-50 rounded-[3rem] flex items-center justify-center text-5xl mx-auto mb-10 floating">✨</div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Daily Growth Synced</h2>
            <p className="text-slate-400 font-medium">Your linguistic pattern set {roundCount} has been integrated into long-term memory.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
             <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2">Reflex Update</p>
                <p className="text-2xl font-extrabold text-slate-900">Complete</p>
             </div>
             <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2">Seeds Watered</p>
                <p className="text-2xl font-extrabold text-slate-900">{practicedInCurrentRound.current.size}</p>
             </div>
          </div>

          <div className="flex flex-col gap-6 pt-10">
            <button 
              onClick={startNextRound}
              className="w-full bg-indigo-600 text-white py-7 rounded-[2rem] font-bold text-[13px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
            >
              Start Next Round
            </button>
            <button 
              onClick={onClose}
              className="w-full text-slate-400 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-all"
            >
              Return to Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentItem || !currentChunk) return null;

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-in fade-in duration-700">
      <header className="mb-12 flex justify-between items-center px-4">
        <div className="flex items-center gap-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-xl ${currentChunk.isHighFrequency ? 'bg-purple-500 shadow-purple-100' : 'bg-indigo-600 shadow-indigo-100'}`}>
            {currentChunk.isHighFrequency ? '⚡️' : `L${currentItem.level}`}
          </div>
          <div>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.35em] ${currentChunk.isHighFrequency ? 'text-purple-400' : 'text-slate-400'}`}>
              {currentItem.phase} • Level {currentItem.level}
            </h3>
            <p className="text-xs font-bold text-indigo-600 mt-1">{currentIndex + 1} of {sessionQueue.length} in session</p>
          </div>
        </div>
        <button onClick={onClose} className="w-11 h-11 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all active:scale-90">✕</button>
      </header>

      <div className={`bg-white rounded-[5rem] p-12 md:p-24 min-h-[650px] shadow-[0_50px_100px_-40px_rgba(45,51,107,0.06)] border border-slate-100 flex flex-col justify-center items-center text-center relative overflow-hidden ${currentChunk.isHighFrequency && !showAnswer ? 'ring-2 ring-purple-100' : ''}`}>
        
        {currentChunk.isHighFrequency && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 px-6 py-2 bg-purple-50 rounded-full border border-purple-100 animate-pulse">
            <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">⚡️ Rapid Reflex Mode</span>
          </div>
        )}

        {!showAnswer ? (
          <div className="w-full space-y-16 animate-in slide-in-from-bottom-8 duration-700">
            {(currentItem.level === QuizLevel.Recognition || currentItem.level === QuizLevel.Retrieval) && (
              <div className="space-y-10">
                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.5em] block">
                  Goal: {currentItem.level === QuizLevel.Recognition ? 'Understanding' : 'Mental Retrieval'}
                </span>
                <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-[1.2] max-w-3xl mx-auto tracking-tight">{currentChunk.englishMeaning}</h2>
                <div className="pt-8">
                   <button 
                    onClick={() => handlePlayAudio(currentChunk.english)}
                    disabled={isSpeaking}
                    className="inline-flex items-center gap-4 px-10 py-4 rounded-full bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95"
                   >
                     {isSpeaking ? 'Synthesizing...' : '🔊 Audio Reference'}
                   </button>
                </div>
              </div>
            )}

            {currentItem.level === QuizLevel.Production && (
              <div className="space-y-12 w-full max-w-4xl mx-auto">
                <div className="flex flex-col items-center gap-4">
                  <span className={`text-[11px] font-black uppercase tracking-[0.5em] ${currentChunk.isHighFrequency ? 'text-purple-500' : 'text-amber-500'}`}>
                    {currentChunk.isHighFrequency ? 'Instant Recall' : 'Goal: Active Production'}
                  </span>
                  {isLoadingL3 && <div className="text-[10px] font-black text-slate-200 uppercase animate-pulse tracking-widest">Generating Real-World Context...</div>}
                </div>
                {productionData && (
                  <div className={`p-12 rounded-[4rem] border text-left space-y-10 animate-in fade-in duration-1000 ${currentChunk.isHighFrequency ? 'bg-purple-50/30 border-purple-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Scenario: {productionData.scenario}</p>
                      <p className="text-3xl font-bold text-slate-800 italic leading-relaxed tracking-tight">"{productionData.simpleSentence}"</p>
                    </div>
                    <div className="pt-10 border-t border-slate-200/50 flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-3">Integrate this Anchor:</p>
                        <span className={`${currentChunk.isHighFrequency ? 'bg-purple-600' : 'bg-indigo-600'} text-white px-6 py-2 rounded-2xl font-bold text-[15px] shadow-lg shadow-indigo-100`}>{currentChunk.english}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="w-full max-w-xl mx-auto pt-16">
              <input
                autoFocus
                type="text"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isEvaluating && handleReveal()}
                placeholder={currentItem.level === QuizLevel.Production ? "Rewrite using the anchor..." : "Recall the English chunk..."}
                className="w-full bg-transparent border-b-2 border-slate-100 text-4xl font-extrabold text-slate-900 text-center py-8 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-100"
              />
              <p className="mt-12 text-[10px] font-black uppercase text-slate-300 tracking-[0.4em]">Tap Enter to Reveal Answer</p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-16 animate-in zoom-in-95 duration-500">
            <div className="space-y-10">
              <div className="flex flex-col items-center gap-10">
                <div className="flex items-center justify-center gap-10">
                  <h2 className={`text-5xl md:text-8xl font-black tracking-tighter ${currentChunk.isHighFrequency ? 'text-purple-600' : 'text-indigo-600'}`}>{currentChunk.english}</h2>
                  <button 
                    onClick={() => handlePlayAudio(currentChunk.english)}
                    disabled={isSpeaking}
                    className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center hover:scale-110 transition-all disabled:opacity-30 shadow-2xl active:scale-90 ${currentChunk.isHighFrequency ? 'bg-purple-50 text-purple-600 shadow-purple-100' : 'bg-indigo-50 text-indigo-600 shadow-indigo-100'}`}
                  >
                    <span className={`text-4xl ${isSpeaking ? 'animate-pulse' : ''}`}>{isSpeaking ? '...' : '🔊'}</span>
                  </button>
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-400 max-w-3xl mx-auto leading-snug tracking-tight">{currentChunk.englishMeaning}</p>
            </div>

            {evaluation && (
              <div className={`max-w-3xl mx-auto p-12 rounded-[4rem] border-2 ${evaluation.isCorrect ? 'bg-emerald-50/30 border-emerald-100 text-emerald-900' : 'bg-amber-50/30 border-amber-100 text-amber-900'} text-left space-y-10 shadow-sm animate-in slide-in-from-top-4`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Proficiency Audit</span>
                  <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${evaluation.isCorrect ? 'bg-emerald-200/50 text-emerald-700' : 'bg-amber-200/50 text-amber-700'}`}>
                    {evaluation.isCorrect ? 'Native Flow' : 'Polish Recommended'}
                  </span>
                </div>
                <p className="text-xl font-bold leading-relaxed tracking-tight">"{evaluation.feedback}"</p>
                
                <div className="pt-10 border-t border-black/5 space-y-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Better Way to Say This:</p>
                  <p className="text-2xl font-extrabold italic leading-relaxed text-slate-800 tracking-tight">"{evaluation.improvedVersion}"</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-16">
              {[
                { s: ReviewScore.Hard, l: 'Review Again', c: 'text-rose-500', bg: 'hover:bg-rose-50/50' },
                { s: ReviewScore.Ok, l: 'Passable', c: 'text-amber-500', bg: 'hover:bg-amber-50/50' },
                { s: ReviewScore.Easy, l: 'Natural', c: currentChunk.isHighFrequency ? 'text-purple-600' : 'text-indigo-600', bg: currentChunk.isHighFrequency ? 'hover:bg-purple-50/50' : 'hover:bg-indigo-50/50' }
              ].map(b => (
                <button 
                  key={b.l} 
                  onClick={() => handleScore(b.s)} 
                  className={`h-28 bg-white border border-slate-100 rounded-[2.5rem] transition-all flex flex-col items-center justify-center group ${b.bg} active:scale-95 shadow-xl shadow-slate-200/20`}
                >
                  <span className={`text-[13px] font-black uppercase tracking-[0.3em] ${b.c}`}>{b.l}</span>
                  {b.l === 'Natural' && <span className="text-[9px] font-black text-slate-300 mt-2 uppercase tracking-widest">Mastered</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizSession;
