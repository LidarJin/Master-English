
import { supabase } from './authService';
import { Chunk, Tag } from '../types';

export const dbService = {
  async getChunks(): Promise<Chunk[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('chunks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("[DB] Error fetching chunks:", error);
      throw error; 
    }

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      english: item.english,
      englishMeaning: item.meaning, 
      pronunciation: item.pronunciation, // Map from DB
      examples: item.examples || [],
      tags: item.tags || [],
      createdAt: new Date(item.created_at).getTime(),
      nextReviewDate: new Date(item.next_review).getTime(),
      lastPracticedAt: item.last_practiced ? new Date(item.last_practiced).getTime() : undefined,
      intervalLevel: item.level || 0,
      isMastered: item.is_mastered || false,
      stage: item.stage || 'Acquisition',
      isHighFrequency: item.is_high_frequency || false
    }));
  },

  async saveChunk(chunk: Chunk): Promise<void> {
    const payload = {
      id: chunk.id,
      user_id: chunk.userId,
      english: chunk.english,
      meaning: chunk.englishMeaning,
      pronunciation: chunk.pronunciation, // Save to DB
      examples: chunk.examples,
      tags: chunk.tags,
      level: chunk.intervalLevel,
      next_review: new Date(chunk.nextReviewDate).toISOString(),
      last_practiced: chunk.lastPracticedAt ? new Date(chunk.lastPracticedAt).toISOString() : null,
      is_mastered: chunk.isMastered,
      stage: chunk.stage,
      is_high_frequency: chunk.isHighFrequency || false
    };

    const { error } = await supabase
      .from('chunks')
      .upsert(payload, { onConflict: 'id' });
      
    if (error) {
      console.error("[DB] Save Failed for Chunk:", chunk.english, error);
      throw error; 
    }
  },

  async deleteChunk(id: string): Promise<void> {
    const { error } = await supabase.from('chunks').delete().eq('id', id);
    if (error) {
      console.error("[DB] Delete Failed:", error);
      throw error;
    }
  },

  async getTags(): Promise<Tag[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('global_tags')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; 
    return data?.global_tags || [];
  },

  async saveTags(tags: Tag[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        global_tags: tags, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'id' });

    if (error) {
      console.error("[DB] Tag Sync Failed:", error);
      throw error;
    }
  }
};
