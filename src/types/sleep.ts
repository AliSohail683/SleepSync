/**
 * Enhanced Sleep Type Definitions
 * Extended types for sleep tracking and analysis
 */

import { UUID } from '../models';

export interface SleepStageSegment {
  stage: 'awake' | 'light' | 'deep' | 'rem';
  startTime: number; // timestamp
  endTime: number;
  duration: number; // minutes
}

export interface SleepSessionEnhanced {
  id: UUID;
  userId: UUID;
  startAt: string;
  endAt?: string;
  durationMin?: number;
  stages?: {
    light: number;
    deep: number;
    rem: number;
  };
  stageSegments?: SleepStageSegment[];
  sleepScore?: number;
  awakeCount?: number;
  sleepLatency?: number;
  wakeAfterSleepOnset?: number; // WASO in minutes
  sleepEfficiency?: number; // percentage
  deviceData?: {
    movements?: number[];
    soundLevel?: number[];
    temperature?: number;
    heartRate?: number[];
    hrv?: number[];
  };
  disturbances?: Array<{
    type: string;
    timestamp: number;
    severity: string;
  }>;
  notes?: string;
  baselineCalibrated?: boolean;
}

export interface BaselineMetrics {
  userId: UUID;
  averageBedtime: string; // HH:MM
  averageWakeTime: string; // HH:MM
  averageDuration: number; // hours
  averageLatency: number; // minutes
  averageEfficiency: number; // percentage
  disturbanceFrequency: number; // per night
  sensorCalibration: {
    movementThreshold: number;
    soundThreshold: number;
    lightThreshold: number;
  };
  completedAt: string;
  daysCollected: number;
}

export interface SleepScoreBreakdown {
  duration: number; // 0-100
  efficiency: number;
  latency: number;
  stages: number;
  disturbances: number;
  circadian: number;
  total: number; // 0-100
  factors: Array<{
    name: string;
    impact: 'positive' | 'negative';
    value: number;
  }>;
}

export interface SleepInsightEnhanced {
  type: 'sleep_debt' | 'consistency' | 'quality' | 'duration' | 'temperature' | 'disturbance' | 'latency' | 'efficiency';
  severity: 'good' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  value?: number;
  comparison?: {
    baseline?: number;
    previous?: number;
    average?: number;
  };
  timestamp: string;
}

export interface Recommendation {
  id: UUID;
  userId: UUID;
  type: 'bedtime' | 'caffeine' | 'light' | 'routine' | 'snoring' | 'circadian' | 'environment';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actionItems: string[];
  generatedAt: string;
  expiresAt?: string;
  acknowledged?: boolean;
}

