/**
 * Sensor Data Type Definitions
 * Types for all sensor-related data structures
 */

export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface GyroscopeData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface AudioData {
  decibel: number;
  frequency: number;
  timestamp: number;
  isSnoring?: boolean;
}

export interface LightData {
  lux: number;
  timestamp: number;
}

export interface SensorDataChunk {
  id: string;
  sessionId: string;
  timestamp: number;
  accelerometer?: AccelerometerData;
  gyroscope?: GyroscopeData;
  audio?: AudioData;
  light?: LightData;
}

export interface MovementIntensity {
  level: 'none' | 'low' | 'medium' | 'high';
  magnitude: number;
  timestamp: number;
}

export interface DisturbanceEvent {
  type: 'movement' | 'sound' | 'light' | 'unknown';
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  duration?: number;
  data?: any;
}

export interface SensorConfig {
  accelerometer: {
    enabled: boolean;
    updateInterval: number; // ms
  };
  gyroscope: {
    enabled: boolean;
    updateInterval: number;
  };
  microphone: {
    enabled: boolean;
    updateInterval: number;
    sensitivity: number; // 0-1
  };
  light: {
    enabled: boolean;
    updateInterval: number;
  };
}

