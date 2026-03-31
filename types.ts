
export type Tag = string;

export type MemoryStage = 'Acquisition' | 'Maintenance';

export interface User {
  id: string;
  email: string;
  lastLogin: number;
}

export interface Chunk {
  id: string;
  userId: string;
  english: string;
  englishMeaning: string;
  pronunciation?: string; // New field for British IPA
  examples: string[];
  tags: Tag[];
  register?: string; 
  createdAt: number;
  nextReviewDate: number;
  lastPracticedAt?: number;
  intervalLevel: number;
  isMastered: boolean;
  stage: MemoryStage;
  isHighFrequency?: boolean;
}

export enum ReviewScore {
  Hard = 0,
  Ok = 1,
  Easy = 2
}

export enum QuizLevel {
  Recognition = 1,
  Retrieval = 2,
  Production = 3
}

export interface ActivityEntry {
  id: string;
  userId: string;
  timestamp: number;
  type: 'added' | 'reviewed';
  details: string;
  metadata?: any;
}

export type View = 'Dashboard' | 'Library' | 'Quiz' | 'Add' | 'Edit' | 'Settings' | 'HFLab' | 'Login';

export interface SessionItem {
  chunkId: string;
  level: QuizLevel;
  phase: 'Warmup' | 'Core' | 'Cruise' | 'Finisher' | 'SpeedDrill';
}
