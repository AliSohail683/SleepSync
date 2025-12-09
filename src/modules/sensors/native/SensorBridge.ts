/**
 * Native Sensor Bridge
 * Interface for native sensor modules
 * 
 * Uses native modules for microphone and light sensors
 * Accelerometer and Gyroscope use react-native-sensors library
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

interface SensorBridgeInterface {
  startMicrophone(interval: number): Promise<void>;
  stopMicrophone(): Promise<void>;
  startLightSensor(interval: number): Promise<void>;
  stopLightSensor(): Promise<void>;
  requestPermissions(): Promise<boolean>;
  getEventEmitter(): NativeEventEmitter | null;
}

// Get native module
const { SensorModule } = NativeModules;

class SensorBridge implements SensorBridgeInterface {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (SensorModule) {
      this.eventEmitter = new NativeEventEmitter(SensorModule);
    }
  }

  async startMicrophone(interval: number): Promise<void> {
    if (!SensorModule) {
      throw new Error('SensorModule native module not found. Make sure native modules are properly linked.');
    }
    return SensorModule.startMicrophone(interval);
  }

  async stopMicrophone(): Promise<void> {
    if (!SensorModule) {
      throw new Error('SensorModule native module not found');
    }
    return SensorModule.stopMicrophone();
  }

  async startLightSensor(interval: number): Promise<void> {
    if (!SensorModule) {
      throw new Error('SensorModule native module not found. Make sure native modules are properly linked.');
    }
    return SensorModule.startLightSensor(interval);
  }

  async stopLightSensor(): Promise<void> {
    if (!SensorModule) {
      throw new Error('SensorModule native module not found');
    }
    return SensorModule.stopLightSensor();
  }

  async requestPermissions(): Promise<boolean> {
    if (!SensorModule) {
      throw new Error('SensorModule native module not found');
    }
    return SensorModule.requestPermissions();
  }

  getEventEmitter(): NativeEventEmitter | null {
    return this.eventEmitter;
  }
}

export const sensorBridge = new SensorBridge();
export default sensorBridge;

