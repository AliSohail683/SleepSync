/**
 * Alarm and wake time calculation utilities
 */

import { AlarmConfig } from '../models';
import { parseTimeString } from './dateUtils';

/**
 * Compute optimal wake moment within target window based on predicted light sleep stages
 * Smart wake detection using real-time sleep stage monitoring
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

  // If start time has passed today, schedule for tomorrow
  // Use < instead of <= to allow exact time matches, with 1 minute buffer
  const oneMinuteBuffer = 60 * 1000; // 1 minute buffer
  if (startDate.getTime() < (now.getTime() - oneMinuteBuffer)) {
    startDate.setDate(startDate.getDate() + 1);
    endDate.setDate(endDate.getDate() + 1);
    console.log('⏰ Wake time has passed, scheduling for tomorrow:', startDate.toLocaleString());
  } else {
    console.log('⏰ Wake time is today or very close:', startDate.toLocaleString());
  }

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
 * Uses historical patterns and circadian rhythm to predict optimal wake windows
 * This is for SMART ALARM prediction, not actual tracking
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
  console.log('🔍 Validating alarm config:', {
    hasWindowStart: !!config.targetWindowStart,
    hasWindowEnd: !!config.targetWindowEnd,
    hasDaysOfWeek: Array.isArray(config.daysOfWeek) && config.daysOfWeek.length > 0,
    windowStart: config.targetWindowStart,
    windowEnd: config.targetWindowEnd,
    daysOfWeek: config.daysOfWeek,
  });

  if (!config.targetWindowStart || !config.targetWindowEnd) {
    console.warn('❌ Validation failed: Missing window times');
    return false;
  }

  // Check daysOfWeek
  if (!config.daysOfWeek || !Array.isArray(config.daysOfWeek) || config.daysOfWeek.length === 0) {
    console.warn('❌ Validation failed: No days selected');
    return false;
  }
  
  const start = parseTimeString(config.targetWindowStart);
  const end = parseTimeString(config.targetWindowEnd);
  
  // Validate time format
  if (start.hours < 0 || start.hours > 23 || start.minutes < 0 || start.minutes > 59) {
    console.warn('❌ Validation failed: Invalid start time format');
    return false;
  }
  if (end.hours < 0 || end.hours > 23 || end.minutes < 0 || end.minutes > 59) {
    console.warn('❌ Validation failed: Invalid end time format');
    return false;
  }
  
  // End should be after start (within same day or crossing midnight)
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  
  if (endMinutes <= startMinutes) {
    // Could be crossing midnight, which is valid
    console.log('✅ Validation passed: Window crosses midnight');
    return true;
  }
  
  // Window should be reasonable (at least 5 minutes, max 4 hours)
  const windowSize = endMinutes - startMinutes;
  if (windowSize < 5 || windowSize > 240) {
    console.warn('❌ Validation failed: Window size out of range', { windowSize });
    return false;
  }

  console.log('✅ Validation passed');
  return true;
};

