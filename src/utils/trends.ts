/**
 * Trend Calculation Utilities
 * Functions for calculating statistical trends over time periods
 */

import { SleepSession } from '../models';

/**
 * Calculate average sleep duration over period
 */
export function calculateAverageDuration(
  sessions: SleepSession[],
  days: number = 7
): number {
  const completed = sessions
    .filter((s) => s.endAt && s.durationMin)
    .slice(0, days);
  if (completed.length === 0) return 0;

  const total = completed.reduce((sum, s) => sum + (s.durationMin || 0), 0);
  return Math.round(total / completed.length);
}

/**
 * Calculate average sleep score over period
 */
export function calculateAverageScore(
  sessions: SleepSession[],
  days: number = 7
): number {
  const completed = sessions
    .filter((s) => s.endAt && s.sleepScore)
    .slice(0, days);
  if (completed.length === 0) return 0;

  const total = completed.reduce((sum, s) => sum + (s.sleepScore || 0), 0);
  return Math.round(total / completed.length);
}

/**
 * Calculate consistency score (0-100)
 * Based on variance in bedtimes
 */
export function calculateConsistency(sessions: SleepSession[]): number {
  if (sessions.length < 2) return 100;

  const bedtimes = sessions.map((s) => {
    const date = new Date(s.startAt);
    return date.getHours() + date.getMinutes() / 60;
  });

  const avg = bedtimes.reduce((sum, t) => sum + t, 0) / bedtimes.length;
  const variance =
    bedtimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / bedtimes.length;
  const stdDev = Math.sqrt(variance);

  // Lower std dev = higher consistency
  // 2 hours std dev = 0 score, 0 hours = 100 score
  const score = Math.max(0, 100 - stdDev * 50);
  return Math.round(score);
}

/**
 * Calculate trend direction
 */
export function calculateTrend(
  values: number[],
  period: number = 7
): 'improving' | 'declining' | 'stable' {
  if (values.length < period * 2) return 'stable';

  const recent = values.slice(0, period);
  const previous = values.slice(period, period * 2);

  const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
  const previousAvg = previous.reduce((sum, v) => sum + v, 0) / previous.length;

  const diff = recentAvg - previousAvg;
  const threshold = previousAvg * 0.05; // 5% change threshold

  if (diff > threshold) return 'improving';
  if (diff < -threshold) return 'declining';
  return 'stable';
}

/**
 * Calculate 7/30/90 day averages
 */
export function calculatePeriodAverages(sessions: SleepSession[]): {
  week: { duration: number; score: number };
  month: { duration: number; score: number };
  quarter: { duration: number; score: number };
} {
  return {
    week: {
      duration: calculateAverageDuration(sessions, 7),
      score: calculateAverageScore(sessions, 7),
    },
    month: {
      duration: calculateAverageDuration(sessions, 30),
      score: calculateAverageScore(sessions, 30),
    },
    quarter: {
      duration: calculateAverageDuration(sessions, 90),
      score: calculateAverageScore(sessions, 90),
    },
  };
}

/**
 * Calculate sleep debt trend
 */
export function calculateSleepDebtTrend(
  debtRecords: Array<{ date: string; debtHours: number }>
): 'increasing' | 'decreasing' | 'stable' {
  if (debtRecords.length < 7) return 'stable';

  const recent = debtRecords.slice(0, 7);
  const previous = debtRecords.slice(7, 14);

  if (previous.length === 0) return 'stable';

  const recentAvg = recent.reduce((sum, r) => sum + r.debtHours, 0) / recent.length;
  const previousAvg = previous.reduce((sum, r) => sum + r.debtHours, 0) / previous.length;

  const diff = recentAvg - previousAvg;
  if (Math.abs(diff) < 0.5) return 'stable';
  return diff > 0 ? 'increasing' : 'decreasing';
}

