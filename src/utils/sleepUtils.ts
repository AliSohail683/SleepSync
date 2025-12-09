/**
 * Sleep-specific utility functions and calculations
 */

import { SleepSession, SleepDebtRecord, SleepInsight } from '@/models';
import { APP_CONFIG } from '../config/constants';

/**
 * Calculate sleep score based on session data
 * Returns a score from 0-100
 */
export const calculateSleepScore = (
  session: SleepSession,
  sleepGoalHours: number,
  caffeineHabits: string
): number => {
  if (!session.durationMin) return 0;

  const actualHours = session.durationMin / 60;
  
  // Base score: how close to goal
  let score = Math.min(100, (actualHours / sleepGoalHours) * 100);

  // Penalty for wake events
  if (session.awakeCount && session.awakeCount > 2) {
    score -= 5 * (session.awakeCount - 2);
  }

  // Bonus for quick sleep onset
  if (session.sleepLatency && session.sleepLatency < 20) {
    score += 3;
  }

  // Penalty for long sleep onset
  if (session.sleepLatency && session.sleepLatency > 45) {
    score -= 5;
  }

  // Penalty for high caffeine and late sleep
  if (caffeineHabits === 'high') {
    score -= 10;
  }

  // Quality bonus based on sleep stages
  if (session.stages) {
    const deepPercent = session.stages.deep / actualHours;
    const remPercent = session.stages.rem / actualHours;
    
    // Ideal deep sleep: 15-20%, REM: 20-25%
    if (deepPercent >= 0.15 && deepPercent <= 0.25) score += 5;
    if (remPercent >= 0.20 && remPercent <= 0.30) score += 5;
  }

  // Normalize to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Estimate sleep stages based on duration
 * FALLBACK ONLY: Used when real sensor data is unavailable
 * Real stages come from Sleep Detection Engine using actual sensor data
 */
export const estimateSleepStages = (durationMin: number): {
  light: number;
  deep: number;
  rem: number;
} => {
  const hours = durationMin / 60;
  
  // Statistical averages based on typical sleep patterns
  // Deep sleep: ~20% of total
  const deep = hours * 0.20;
  
  // REM: ~25% of total
  const rem = hours * 0.25;
  
  // Light: remainder (~55%)
  const light = hours - deep - rem;
  
  return {
    light: Math.max(0, light),
    deep: Math.max(0, deep),
    rem: Math.max(0, rem),
  };
};

/**
 * Calculate sleep debt for a given day
 */
export const calculateSleepDebt = (
  idealHours: number,
  actualHours: number
): number => {
  return Math.max(0, idealHours - actualHours);
};

/**
 * Calculate cumulative sleep debt over multiple days
 */
export const calculateCumulativeDebt = (records: SleepDebtRecord[]): number => {
  return records.reduce((sum, record) => sum + record.debtHours, 0);
};

/**
 * Get sleep quality category based on score
 */
export const getSleepQuality = (score: number): {
  label: string;
  color: string;
  emoji: string;
} => {
  if (score >= APP_CONFIG.sleepScore.excellent) {
    return { label: 'Excellent', color: '#5FD19A', emoji: '🌟' };
  }
  if (score >= APP_CONFIG.sleepScore.good) {
    return { label: 'Good', color: '#4ECDC4', emoji: '😊' };
  }
  if (score >= APP_CONFIG.sleepScore.fair) {
    return { label: 'Fair', color: '#F9C74F', emoji: '😐' };
  }
  return { label: 'Poor', color: '#F87171', emoji: '😴' };
};

/**
 * Generate sleep insights based on recent sessions
 */
export const generateInsights = (
  sessions: SleepSession[],
  debtRecords: SleepDebtRecord[],
  sleepGoal: number
): SleepInsight[] => {
  const insights: SleepInsight[] = [];

  if (sessions.length === 0) return insights;

  // Calculate average sleep duration
  const avgDuration = sessions.reduce((sum, s) => sum + (s.durationMin || 0), 0) / sessions.length / 60;

  // Sleep duration insight
  if (avgDuration < sleepGoal - 1) {
    insights.push({
      type: 'duration',
      severity: 'warning',
      title: 'Sleep Duration Below Goal',
      description: `You're averaging ${avgDuration.toFixed(1)} hours, ${(sleepGoal - avgDuration).toFixed(1)} hours below your goal.`,
      recommendation: 'Try going to bed 30 minutes earlier tonight.',
      value: avgDuration,
    });
  }

  // Sleep debt insight
  const totalDebt = calculateCumulativeDebt(debtRecords);
  if (totalDebt > APP_CONFIG.sleepDebt.severe) {
    insights.push({
      type: 'sleep_debt',
      severity: 'critical',
      title: 'High Sleep Debt',
      description: `You owe yourself ${totalDebt.toFixed(1)} hours of sleep.`,
      recommendation: 'Consider taking a nap or sleeping in this weekend.',
      value: totalDebt,
    });
  } else if (totalDebt > APP_CONFIG.sleepDebt.moderate) {
    insights.push({
      type: 'sleep_debt',
      severity: 'warning',
      title: 'Building Sleep Debt',
      description: `You're ${totalDebt.toFixed(1)} hours behind on sleep.`,
      recommendation: 'Try to get extra sleep in the next few days.',
      value: totalDebt,
    });
  }

  // Consistency insight
  const startTimes = sessions.map(s => new Date(s.startAt).getHours() + new Date(s.startAt).getMinutes() / 60);
  const avgStart = startTimes.reduce((sum, t) => sum + t, 0) / startTimes.length;
  const variance = startTimes.reduce((sum, t) => sum + Math.pow(t - avgStart, 2), 0) / startTimes.length;
  
  if (variance > 4) { // More than 2 hours standard deviation
    insights.push({
      type: 'consistency',
      severity: 'warning',
      title: 'Inconsistent Sleep Schedule',
      description: 'Your bedtime varies significantly each night.',
      recommendation: 'Try to maintain a consistent sleep schedule, even on weekends.',
    });
  }

  // Quality insight
  const avgScore = sessions.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / sessions.length;
  if (avgScore >= APP_CONFIG.sleepScore.excellent) {
    insights.push({
      type: 'quality',
      severity: 'good',
      title: 'Excellent Sleep Quality',
      description: `Your average sleep score is ${avgScore.toFixed(0)}/100.`,
      recommendation: 'Keep up the great work!',
      value: avgScore,
    });
  }

  return insights;
};

/**
 * Calculate average sleep score over sessions
 */
export const calculateAverageSleepScore = (sessions: SleepSession[]): number => {
  if (sessions.length === 0) return 0;
  
  const total = sessions.reduce((sum, session) => sum + (session.sleepScore || 0), 0);
  return Math.round(total / sessions.length);
};

