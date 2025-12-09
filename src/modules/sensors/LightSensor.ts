/**
 * Light Sensor Module
 * Handles ambient light data collection
 */

import { LightData } from '../../types/sensors';

interface LightConfig {
  enabled: boolean;
  updateInterval: number;
}

class LightSensor {
  private config: LightConfig;
  private isActive = false;
  private subscription?: any;

  constructor(config: LightConfig) {
    this.config = config;
  }

  /**
   * Start light sensor monitoring
   * Uses native module for real ambient light sensor data
   */
  async start(callback: (data: LightData) => void): Promise<void> {
    if (this.isActive) {
      console.warn('Light sensor already active');
      return;
    }

    if (!this.config.enabled) {
      console.log('Light sensor disabled in config');
      return;
    }

    try {
      // Request sensor permission
      const { sensorBridge } = require('./native/SensorBridge');
      const hasPermission = await sensorBridge.requestPermissions();
      if (!hasPermission) {
        throw new Error('Light sensor permission denied');
      }

      // Start native light sensor monitoring
      await sensorBridge.startLightSensor(this.config.updateInterval);

      // Set up native event listener for light data
      const eventEmitter = sensorBridge.getEventEmitter();
      if (!eventEmitter) {
        throw new Error('Event emitter not available');
      }

      const subscription = eventEmitter.addListener('LightData', (data: any) => {
        const lightData: LightData = {
          lux: data.lux,
          timestamp: Date.now(),
        };

        callback(lightData);
      });

      this.subscription = subscription;
      this.isActive = true;
      console.log('✅ Light sensor started with native module');
    } catch (error) {
      console.error('Failed to start light sensor:', error);
      throw error;
    }
  }

  /**
   * Stop light sensor monitoring
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      const { sensorBridge } = require('./native/SensorBridge');
      await sensorBridge.stopLightSensor();

      if (this.subscription) {
        this.subscription.remove();
        this.subscription = undefined;
      }

      this.isActive = false;
      console.log('✅ Light sensor stopped');
    } catch (error) {
      console.error('Failed to stop light sensor:', error);
      throw error;
    }
  }

  /**
   * Check if light sensor is active
   */
  isRunning(): boolean {
    return this.isActive;
  }
}

export { LightSensor };

