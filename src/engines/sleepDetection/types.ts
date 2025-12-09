/**
 * Sleep Detection Types
 */

export interface DetectionThresholds {
  movement: {
    sleep: number; // Below this = likely asleep
    awake: number; // Above this = likely awake
  };
  sound: {
    snoring: number; // Decibel threshold for snoring
    disturbance: number; // Decibel threshold for disturbance
  };
  light: {
    disturbance: number; // Lux threshold for light disturbance
  };
}

export interface SleepCycle {
  stage: 'light' | 'deep' | 'rem';
  startTime: number;
  endTime: number;
  duration: number; // minutes
}

export interface MicroAwakening {
  timestamp: number;
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high';
}

