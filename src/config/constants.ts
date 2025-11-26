/**
 * App-wide constants and configuration
 */

export const APP_CONFIG = {
  name: 'SleepSync',
  version: '1.0.0',
  
  // Sleep tracking defaults
  defaultSleepGoal: 8, // hours
  minSleepGoal: 4,
  maxSleepGoal: 12,
  
  // Sleep scoring thresholds
  sleepScore: {
    excellent: 90,
    good: 75,
    fair: 60,
    poor: 0,
  },
  
  // Sleep debt thresholds (hours)
  sleepDebt: {
    optimal: 0,
    moderate: 3,
    severe: 7,
  },
  
  // Smart alarm settings
  alarm: {
    defaultWindowMinutes: 30,
    minWindowMinutes: 15,
    maxWindowMinutes: 60,
  },
  
  // Audio settings
  audio: {
    defaultVolume: 0.5,
    fadeInDuration: 3000, // ms
    fadeOutDuration: 5000, // ms
  },
  
  // Onboarding steps
  onboarding: {
    totalSteps: 6,
  },
  
  // Data retention (days)
  dataRetention: {
    sessions: 365, // Keep 1 year of sleep sessions
    deletedUserData: 30, // Keep deleted data for 30 days
  },
  
  // Privacy & Legal
  privacyPolicyUrl: 'https://sleepsync.app/privacy',
  termsOfServiceUrl: 'https://sleepsync.app/terms',
  supportEmail: 'support@sleepsync.app',
};

export const SOUNDSCAPE_TYPES = [
  { id: 'rain', name: 'Rain', icon: '🌧️', description: 'Gentle rainfall' },
  { id: 'ocean', name: 'Ocean Waves', icon: '🌊', description: 'Calming waves' },
  { id: 'forest', name: 'Forest', icon: '🌲', description: 'Nature sounds' },
  { id: 'white', name: 'White Noise', icon: '📻', description: 'Pure white noise' },
  { id: 'brown', name: 'Brown Noise', icon: '🎚️', description: 'Deep ambient' },
  { id: 'pink', name: 'Pink Noise', icon: '🎵', description: 'Balanced noise' },
  { id: 'fan', name: 'Fan', icon: '💨', description: 'Box fan sound' },
] as const;

export const AGE_RANGES = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
] as const;

export const DAYS_OF_WEEK = [
  { id: 0, short: 'Sun', full: 'Sunday' },
  { id: 1, short: 'Mon', full: 'Monday' },
  { id: 2, short: 'Tue', full: 'Tuesday' },
  { id: 3, short: 'Wed', full: 'Wednesday' },
  { id: 4, short: 'Thu', full: 'Thursday' },
  { id: 5, short: 'Fri', full: 'Friday' },
  { id: 6, short: 'Sat', full: 'Saturday' },
] as const;

