/**
 * Alarm and wake time calculation utilities
 */

import { AlarmConfig } from '@/models';
import { parseTimeString } from './dateUtils';

/**
 * Compute optimal wake moment within target window based on predicted light sleep stages
 * This simulates smart wake detection
 */
export const computeWakeMoment = (
  windowStart: string, // HH:MM
  windowEnd: string, // HH:MM
  predictedStages?: Array<{ time: Date; stage: 'light' | 'deep' | 'rem' }>
): Date => {
  const start = parseTimeString(windowStart);
  const end = parseTimeString(windowEnd);

  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(start.hours, start.minutes, 0, 0);
  
  const endDate = new Date(now);
  endDate.setHours(end.hours, end.minutes, 0, 0);

  // If we have predicted stages, find the earliest light sleep moment
  if (predictedStages && predictedStages.length > 0) {
    const lightSleepMoments = predictedStages.filter(
      (stage) =>
        stage.stage === 'light' &&
        stage.time >= startDate &&
        stage.time <= endDate
    );

    if (lightSleepMoments.length > 0) {
      // Return the earliest light sleep moment
      return lightSleepMoments[0].time;
    }
  }

  // No light sleep detected or no data - return window start
  return startDate;
};

/**
 * Predict sleep stages for upcoming sleep session
 * This is a simplified simulation for demo purposes
 */
export const predictSleepStages = (
  sleepStart: Date,
  expectedDuration: number // hours
): Array<{ time: Date; stage: 'light' | 'deep' | 'rem' }> => {
  const stages: Array<{ time: Date; stage: 'light' | 'deep' | 'rem' }> = [];

  let currentTime = new Date(sleepStart);
  const endTime = new Date(sleepStart.getTime() + expectedDuration * 60 * 60 * 1000);

  while (currentTime < endTime) {
    // Each 90-minute cycle: light -> deep -> light -> REM
    stages.push({ time: new Date(currentTime), stage: 'light' });
    currentTime = new Date(currentTime.getTime() + 20 * 60 * 1000); // 20 min

    stages.push({ time: new Date(currentTime), stage: 'deep' });
    currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000); // 30 min

    stages.push({ time: new Date(currentTime), stage: 'light' });
    currentTime = new Date(currentTime.getTime() + 20 * 60 * 1000); // 20 min

    stages.push({ time: new Date(currentTime), stage: 'rem' });
    currentTime = new Date(currentTime.getTime() + 20 * 60 * 1000); // 20 min
  }

  return stages;
};

/**
 * Check if alarm should trigger on given day
 */
export const shouldAlarmTrigger = (alarm: AlarmConfig, date: Date): boolean => {
  if (!alarm.enabled) return false;
  
  const dayOfWeek = date.getDay();
  return alarm.daysOfWeek.includes(dayOfWeek);
};

/**
 * Calculate time until next alarm
 */
export const getTimeUntilAlarm = (alarmTime: string): number => {
  const { hours, minutes } = parseTimeString(alarmTime);
  const now = new Date();
  const alarm = new Date();
  alarm.setHours(hours, minutes, 0, 0);

  // If alarm time has passed today, set for tomorrow
  if (alarm <= now) {
    alarm.setDate(alarm.getDate() + 1);
  }

  return alarm.getTime() - now.getTime();
};

/**
 * Format alarm window for display
 */
export const formatAlarmWindow = (start: string, end: string): string => {
  return `${start} - ${end}`;
};

/**
 * Validate alarm configuration
 */
export const validateAlarmConfig = (config: Partial<AlarmConfig>): boolean => {
  if (!config.targetWindowStart || !config.targetWindowEnd) return false;
  
  const start = parseTimeString(config.targetWindowStart);
  const end = parseTimeString(config.targetWindowEnd);
  
  // Validate time format
  if (start.hours < 0 || start.hours > 23 || start.minutes < 0 || start.minutes > 59) return false;
  if (end.hours < 0 || end.hours > 23 || end.minutes < 0 || end.minutes > 59) return false;
  
  // End should be after start (within same day or crossing midnight)
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  
  if (endMinutes <= startMinutes) {
    // Could be crossing midnight, which is valid
    return true;
  }
  
  // Window should be reasonable (15-60 minutes)
  const windowSize = endMinutes - startMinutes;
  if (windowSize < 15 || windowSize > 120) return false;

  return true;
};

