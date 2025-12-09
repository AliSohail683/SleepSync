/**
 * Date and time utility functions
 */

import { format, parseISO, startOfDay, endOfDay, subDays, differenceInMinutes } from 'date-fns';

export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm');
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy');
};

export const formatDateShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd');
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const getDurationInMinutes = (start: string, end: string): number => {
  return differenceInMinutes(parseISO(end), parseISO(start));
};

export const getToday = (): string => {
  return format(startOfDay(new Date()), 'yyyy-MM-dd');
};

export const getDateRange = (days: number): { start: string; end: string } => {
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, days - 1));
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

export const parseTimeString = (time: string): { hours: number; minutes: number } => {
  const [hours, minutes] = time.split(':').map(Number);
  return { hours, minutes };
};

export const createTimeString = (hours: number, minutes: number): string => {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const isToday = (date: string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  return format(dateObj, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
};

export const getDayOfWeek = (date: Date | string): number => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return d.getDay();
};

/**
 * Get timezone-safe date string (ISO format)
 */
export const getTimezoneSafeDate = (date?: Date): string => {
  const d = date || new Date();
  return d.toISOString();
};

/**
 * Get local timezone offset in minutes
 */
export const getTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset();
};

/**
 * Convert UTC time to local time string
 */
export const utcToLocal = (utcString: string): string => {
  const date = parseISO(utcString);
  return format(date, 'yyyy-MM-dd HH:mm:ss');
};

/**
 * Get start of day in local timezone
 */
export const getStartOfDayLocal = (date?: Date): Date => {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  return new Date(year, month, day, 0, 0, 0, 0);
};

/**
 * Get end of day in local timezone
 */
export const getEndOfDayLocal = (date?: Date): Date => {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  return new Date(year, month, day, 23, 59, 59, 999);
};

