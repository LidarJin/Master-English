
import { Tag, ReviewScore, MemoryStage } from './types';

export const DEFAULT_TAGS: Tag[] = [
  'Project Updates', 
  'Negotiation', 
  'Argue & Discuss', 
  'Goals', 
  '1:1 Meeting', 
  'Decision Making'
];

export const getNextInterval = (currentLevel: number, score: ReviewScore): number => {
  if (score === ReviewScore.Hard) return Math.max(0, currentLevel - 2); // Heavy drop
  if (score === ReviewScore.Ok) return currentLevel; // Plateau
  return currentLevel + 1; // Progress
};

export const getDaysFromLevel = (level: number, stage: MemoryStage): number => {
  if (stage === 'Acquisition') {
    const acquisitionIntervals = [0, 1, 2, 3, 5, 7];
    return acquisitionIntervals[level] ?? 7;
  } else {
    const maintenanceIntervals = [14, 21, 30, 60, 90, 180];
    const maintLevel = level - 6;
    return maintenanceIntervals[maintLevel] ?? 180;
  }
};
