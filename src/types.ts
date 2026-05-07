/**
 * LifeLink Shared Types
 */

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO format
  startTime?: string;
  endTime?: string;
  isCompleted: boolean;
  isImportant: boolean;
  category: 'work' | 'personal' | 'health' | 'finance' | 'other';
  priority: 'low' | 'medium' | 'high';
}

export interface FinanceEntry {
  id: string;
  date: string;
  amount: number;
  type: 'expense' | 'savings' | 'income';
  category: string;
  description: string;
}

export interface HealthEntry {
  id: string;
  date: string;
  waterIntake: number; // in glasses or ml
  sleepDuration: number; // in hours
  steps: number;
  exerciseDuration: number; // in minutes
  energyLevel: number; // 1-10
  stressLevel: number; // 1-10
  journal: string;
  moodSentiment?: string;
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  lastCompleted?: string;
}

export interface DailyInsight {
  date: string;
  recap: string;
  suggestions: string[];
  sentimentScore: number;
}
