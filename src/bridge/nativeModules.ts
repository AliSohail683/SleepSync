/**
 * Modern Native Module Bridge
 * Supports both Old Architecture (NativeModules) and New Architecture (TurboModules)
 * Automatically detects and uses the appropriate API
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// Try to use TurboModules if available (New Architecture)
let SensorModule: any = null;
let SleepTrackingModule: any = null;

try {
  // Try TurboModules first (New Architecture)
  const TurboModuleRegistry = require('react-native').TurboModuleRegistry;
  if (TurboModuleRegistry) {
    SensorModule = TurboModuleRegistry.get('SensorModule');
    SleepTrackingModule = TurboModuleRegistry.get('SleepTrackingModule');
  }
} catch (e) {
  // TurboModules not available, fall back to NativeModules
}

// Fall back to NativeModules (Old Architecture)
if (!SensorModule) {
  SensorModule = NativeModules.SensorModule;
}

if (!SleepTrackingModule) {
  SleepTrackingModule = NativeModules.SleepTrackingModule;
}

// Event emitters for sensor data
export const sensorEventEmitter = SensorModule
  ? new NativeEventEmitter(SensorModule)
  : null;

/**
 * Sensor Module API
 */
export const sensorBridge = {
  /**
   * Request necessary permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (!SensorModule) {
      throw new Error('SensorModule not available');
    }
    return SensorModule.requestPermissions();
  },

  /**
   * Start microphone monitoring
   */
  async startMicrophone(interval: number): Promise<void> {
    if (!SensorModule) {
      throw new Error('SensorModule not available');
    }
    return SensorModule.startMicrophone(interval);
  },

  /**
   * Stop microphone monitoring
   */
  async stopMicrophone(): Promise<void> {
    if (!SensorModule) {
      throw new Error('SensorModule not available');
    }
    return SensorModule.stopMicrophone();
  },

  /**
   * Start light sensor monitoring
   */
  async startLightSensor(interval: number): Promise<void> {
    if (!SensorModule) {
      throw new Error('SensorModule not available');
    }
    return SensorModule.startLightSensor(interval);
  },

  /**
   * Stop light sensor monitoring
   */
  async stopLightSensor(): Promise<void> {
    if (!SensorModule) {
      throw new Error('SensorModule not available');
    }
    return SensorModule.stopLightSensor();
  },

  /**
   * Add event listener for sensor data
   */
  addListener(eventName: 'AudioData' | 'LightData', callback: (data: any) => void) {
    if (!sensorEventEmitter) {
      console.warn('Sensor event emitter not available');
      return { remove: () => {} };
    }
    return sensorEventEmitter.addListener(eventName, callback);
  },
};

/**
 * Sleep Tracking Module API
 */
export const sleepTrackingBridge = {
  /**
   * Start background sleep tracking
   */
  async startTracking(): Promise<boolean> {
    if (!SleepTrackingModule) {
      throw new Error('SleepTrackingModule not available');
    }
    return SleepTrackingModule.startTracking();
  },

  /**
   * Stop background sleep tracking
   */
  async stopTracking(): Promise<boolean> {
    if (!SleepTrackingModule) {
      throw new Error('SleepTrackingModule not available');
    }
    return SleepTrackingModule.stopTracking();
  },

  /**
   * Check if tracking is currently active
   */
  async isTracking(): Promise<boolean> {
    if (!SleepTrackingModule) {
      return false;
    }
    return SleepTrackingModule.isTracking();
  },
};

// Export for direct access if needed
export { SensorModule, SleepTrackingModule };

