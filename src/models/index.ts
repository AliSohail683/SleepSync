/**
 * SleepSync Core Data Models
 * Complete TypeScript interfaces for all app entities
 */

export type UUID = string;

export interface UserProfile {
  id: UUID;
  ageRange: string | null; // e.g. "25-34"
  gender?: string | null;
  sleepGoalHours: number; // default 8
  averageBedtime: string | null; // HH:MM
  averageWakeTime: string | null; // HH:MM
  // Optional richer pattern data (not all persisted to DB yet)
  weekdayBedtime?: string | null;
  weekdayWakeTime?: string | null;
  weekendBedtime?: string | null;
  weekendWakeTime?: string | null;
  performanceGoals?: string[]; // e.g. ['work_study', 'sport']
  caffeineHabits: 'none' | 'low' | 'moderate' | 'high';
  screenBeforeBed: boolean;
  roomTemperaturePrefC?: number | null;
  noiseSensitivity: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt?: string;
}

export interface SleepSession {
  id: UUID;
  userId: UUID;
  startAt: string; // ISO
  endAt?: string; // ISO
  durationMin?: number;
  stages?: {
    light: number;
    deep: number;
    rem: number;
  };
  sleepScore?: number; // 0-100
  awakeCount?: number;
  sleepLatency?: number; // minutes to fall asleep
  deviceData?: {
    movements?: number[];
    soundLevel?: number[];
    temperature?: number;
  };
  notes?: string;
}

export interface SoundProfile {
  id: UUID;
  userId: UUID;
  name: string;
  baseType: 'rain' | 'ocean' | 'forest' | 'white' | 'brown' | 'fan' | 'pink';
  blend: Array<{ type: string; level: number }>; // mixing
  volume: number; // 0-1
  createdAt: string;
  isActive?: boolean;
}

export interface AlarmConfig {
  id: UUID;
  userId: UUID;
  enabled: boolean;
  targetWindowStart: string; // e.g. 06:30
  targetWindowEnd: string; // e.g. 07:00
  gentleWake: boolean;
  soundProfileId?: UUID;
  vibrationEnabled: boolean;
  daysOfWeek: number[]; // 0-6, Sunday = 0
}

export interface SubscriptionStatus {
  active: boolean;
  platform: 'ios' | 'android' | null;
  expiryDate?: string | null; // ISO
  productId?: string | null;
  originalPurchaseDate?: string | null;
  autoRenewing?: boolean;
}

export interface SleepDebtRecord {
  date: string; // ISO date (YYYY-MM-DD)
  idealHours: number;
  actualHours: number;
  debtHours: number; // positive means owed hours
}

export interface OnboardingData {
  step: number;
  completed: boolean;
  data: Partial<UserProfile>;
}

export interface AppSettings {
  notificationsEnabled: boolean;
  darkMode: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  temperatureUnit: 'celsius' | 'fahrenheit';
  analyticsEnabled: boolean;
}

// Helper types for UI state
export interface SleepInsight {
  type: 'sleep_debt' | 'consistency' | 'quality' | 'duration' | 'temperature';
  severity: 'good' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  value?: number;
}

export interface SleepTrend {
  date: string;
  score: number;
  duration: number;
  quality: number;
}

// Product IDs for in-app purchases
export const IAP_PRODUCTS = {
  IOS_MONTHLY: 'com.sleepsync.premium.monthly.ios',
  ANDROID_MONTHLY: 'com.sleepsync.premium.monthly.android',
} as const;

