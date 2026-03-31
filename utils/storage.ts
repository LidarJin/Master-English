
import { Chunk, ActivityEntry } from '../types';

const STORAGE_KEY = 'chunkify_data';
const TAGS_KEY = 'chunkify_tags';
const LOGS_KEY = 'chunkify_logs';

export const saveChunks = (chunks: Chunk[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chunks));
};

export const loadChunks = (): Chunk[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveGlobalTags = (tags: string[]) => {
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
};

export const loadGlobalTags = (): string[] => {
  const data = localStorage.getItem(TAGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveLogs = (logs: ActivityEntry[]) => {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
};

export const loadLogs = (): ActivityEntry[] => {
  const data = localStorage.getItem(LOGS_KEY);
  return data ? JSON.parse(data) : [];
};
