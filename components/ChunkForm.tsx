
import React, { useState, useEffect, useRef } from 'react';
import { Chunk, Tag } from '../types';
import { generateChunkDetails } from '../services/geminiService';

interface ChunkFormProps {
  availableTags: Tag[];
  initialEnglish?: string;
  initialData?: Chunk | null;
  onSave: (chunk: Omit<Chunk, 'id' | 'userId' | 'createdAt' | 'nextReviewDate' | 'intervalLevel' | 'isMastered' | 'stage'> & { isHighFrequency?: boolean }) => void;
  onCancel: () => void;
  onAddNewTag: (tag: Tag) => void;
}

const ChunkForm: React.FC<ChunkFormProps> = ({ onSave, onCancel, availableTags, onAddNewTag, initialEnglish = '', initialData }) => {
  const [english, setEnglish] = useState(initialData?.english || initialEnglish);
  const [englishMeaning, setEnglishMeaning] = useState(initialData?.englishMeaning || '');
  const [pronunciation, setPronunciation] = useState(initialData?.pronunciation || '');
  const [examples, setExamples] = useState<string[]>(initialData?.examples || ['', '']);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialData?.tags || []);
  const [isHighFrequency, setIsHighFrequency] = useState(initialData?.isHighFrequency || false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialEnglish && !initialData) handleAISuggest();
  }, [initialEnglish]);

  useEffect(() => {
    if (isAddingTag) tagInputRef.current?.focus();
  }, [isAddingTag]);

  const handleAISuggest = async () => {
    const term = english.trim() || initialEnglish.trim();
    if (!term) return;

    setIsLoadingAI(true);
    const data = await generateChunkDetails(term);
    if (data) {
      setEnglishMeaning(data.englishMeaning);
      setPronunciation(data.pronunciation);
      setExamples(data.examples.slice(0, 2));
    }
    setIsLoadingAI(false);
  };

  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const submitNewTag = () => {
    const cleanTag = newTagName.trim();
    if (cleanTag) {
      onAddNewTag(cleanTag);
      if (!selectedTags.includes(cleanTag)) setSelectedTags(prev => [...prev, cleanTag]);
      setNewTagName('');
      setIsAddingTag(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!english) return;
    onSave({ 
      english, 
      englishMeaning, 
      pronunciation,
      examples: examples.filter(ex => ex.trim() !== ''), 
      tags: selectedTags,
      isHighFrequency
    });
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-16 md:p-24 rounded-[5rem] shadow-[0_60px_120px_-40px_rgba(45,51,107,0.1)] border border-slate-50 animate-in zoom-in-95 duration-500">
      <div className="flex justify-between items-start mb-20">
        <div className="space-y-4">
          <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight">{initialData ? 'Refine Chunk' : 'New Chunk'}</h2>
          <p className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.5em]">Linguistic Studio Configuration</p>
        </div>
        <button onClick={onCancel} className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all active:scale-90">✕</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-16">
        <div className="flex flex-col md:flex-row gap-8 items-stretch md:items-end">
          <div className="flex-1 space-y-4">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] ml-2">Target Chunk</label>
            <input
              type="text"
              autoFocus
              value={english}
              onChange={e => setEnglish(e.target.value)}
              placeholder="e.g. at the forefront of"
              className="w-full bg-slate-50 px-10 h-20 rounded-[2.5rem] text-2xl font-bold text-slate-900 border-none focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
              required
            />
          </div>
          {!initialData && (
            <button
              type="button"
              onClick={handleAISuggest}
              disabled={isLoadingAI}
              className="px-12 bg-indigo-600 text-white font-bold rounded-[2.5rem] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 disabled:opacity-50 text-[11px] uppercase tracking-[0.3em] h-20 min-w-[220px] flex items-center justify-center active:scale-95"
            >
              {isLoadingAI ? 'Analyzing...' : 'AI Refine ✨'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] ml-2">Core Logic</label>
              <input
                value={englishMeaning}
                onChange={e => setEnglishMeaning(e.target.value)}
                placeholder="English explanation..."
                className="w-full bg-slate-50 px-10 h-20 rounded-[2.5rem] text-xl font-bold text-slate-700 border-none focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                required
              />
           </div>
           <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] ml-2">British Phonetic [IPA]</label>
              <input
                value={pronunciation}
                onChange={e => setPronunciation(e.target.value)}
                placeholder="e.g. [æt ðə ˈfɔːfrʌnt ɒv]"
                className="w-full bg-slate-50 px-10 h-20 rounded-[2.5rem] text-xl font-medium text-slate-500 border-none focus:ring-4 focus:ring-indigo-100 transition-all outline-none italic"
              />
           </div>
        </div>

        <div className="flex items-center gap-6 px-4">
          <button 
            type="button"
            onClick={() => setIsHighFrequency(!isHighFrequency)}
            className={`flex items-center gap-4 px-8 py-4 rounded-2xl transition-all border-2 ${
              isHighFrequency 
              ? 'bg-purple-50 border-purple-200 text-purple-600 shadow-lg shadow-purple-50' 
              : 'bg-white border-slate-100 text-slate-300'
            }`}
          >
            <span className="text-xl">{isHighFrequency ? '⚡️' : '⚪️'}</span>
            <span className="text-[10px] font-black uppercase tracking-widest">High-Frequency Word (Priority)</span>
          </button>
        </div>

        <div className="space-y-6">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] ml-2">Native Usage Examples</label>
          <div className="space-y-6">
            {examples.map((ex, idx) => (
              <textarea
                key={idx}
                value={ex}
                onChange={e => {
                  const next = [...examples];
                  next[idx] = e.target.value;
                  setExamples(next);
                }}
                placeholder={`Context scenario ${idx + 1}...`}
                rows={2}
                className="w-full bg-white border border-slate-100 px-10 py-8 rounded-[3rem] text-[18px] italic font-medium text-slate-600 focus:outline-none focus:border-indigo-200 transition-all shadow-sm"
              />
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex justify-between items-center px-4">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Contextual Tags</label>
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{selectedTags.length} Active</span>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            {availableTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedTags.includes(tag) 
                  ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-100' 
                  : 'bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tag}
              </button>
            ))}

            {isAddingTag ? (
              <div className="flex items-center gap-4 bg-slate-50 pl-6 pr-3 h-14 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-left-4">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); submitNewTag(); }
                    if (e.key === 'Escape') setIsAddingTag(false);
                  }}
                  placeholder="New label..."
                  className="bg-transparent text-[10px] font-black uppercase outline-none text-slate-900 placeholder:text-slate-200 w-36"
                />
                <button type="button" onClick={submitNewTag} className="w-10 h-10 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-100">✓</button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-slate-100 text-slate-200 hover:text-indigo-400 hover:border-indigo-100 transition-all h-14 flex items-center justify-center active:scale-95"
              >
                + Create
              </button>
            )}
          </div>
        </div>

        <div className="pt-16 flex flex-col md:flex-row gap-8">
          <button type="submit" className="flex-[2] bg-indigo-600 text-white h-20 rounded-[2.5rem] text-xl font-bold shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.01] transition-all active:scale-[0.98] flex items-center justify-center tracking-tight">
            Commit to Garden
          </button>
          <button type="button" onClick={onCancel} className="flex-1 h-20 text-slate-400 font-black hover:text-slate-900 transition-colors text-[11px] uppercase tracking-[0.4em] flex items-center justify-center active:scale-95">Discard</button>
        </div>
      </form>
    </div>
  );
};

export default ChunkForm;
