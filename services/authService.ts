
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { User } from '../types';

const SUPABASE_URL = 'https://veoesmvdphlicxyjsaab.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlb2VzbXZkcGhsaWN4eWpzYWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTk0MzMsImV4cCI6MjA4MjczNTQzM30.lA5lvKQyKQ4zbzD-NVxK0aAIgCIUZbhqeMV4_I-5tvI';

// Ultra-safe storage fallback for publication sandboxes
const getSafeStorage = () => {
  const memoryStore: Record<string, string> = {};
  
  try {
    // Check if localStorage is truly operational
    const test = "__storage_test__";
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return window.localStorage;
  } catch (e) {
    console.warn("Storage restricted. Activating memory-only mode for safety.");
    return {
      getItem: (key: string) => memoryStore[key] || null,
      setItem: (key: string, value: string) => { memoryStore[key] = value; },
      removeItem: (key: string) => { delete memoryStore[key]; },
      clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
      key: (i: number) => Object.keys(memoryStore)[i] || null,
      length: Object.keys(memoryStore).length
    };
  }
};

// Ensure client creation doesn't throw even in the weirdest environments
let supabaseInstance: any;
try {
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: getSafeStorage() as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false // Disable to prevent URL processing errors in sandboxes
    }
  });
} catch (e) {
  console.error("Supabase client creation failed:", e);
  // Last resort mock
  supabaseInstance = {
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) })
  };
}

export const supabase = supabaseInstance;

export const authService = {
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) return null;
      
      return {
        id: session.user.id,
        email: session.user.email || '',
        lastLogin: Date.now()
      };
    } catch (e) {
      console.warn("Auth check bypassed:", e);
      return null;
    }
  },

  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password
    });
    if (error) throw error;
    return data;
  },

  signIn: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Login failed");

    return {
      id: data.user.id,
      email: data.user.email || '',
      lastLogin: Date.now()
    };
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  }
};
