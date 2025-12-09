/**
 * Accelerometer Sensor Module
 * Handles accelerometer data collection
 */

import { accelerometer, setUpdateIntervalForType, SensorData } from 'react-native-sensors';
import { Subscription } from 'rxjs';
import { AccelerometerData } from '../../types/sensors';

interface AccelerometerConfig {
  enabled: boolean;
  updateInterval: number;
}

class AccelerometerSensor {
  private config: AccelerometerConfig;
  private subscription?: Subscription;
  private isActive = false;

  constructor(config: AccelerometerConfig) {
    this.config = config;
    setUpdateIntervalForType('accelerometer', config.updateInterval);
  }

  /**
   * Start accelerometer monitoring
   */
  async start(callback: (data: AccelerometerData) => void): Promise<void> {
    if (this.isActive) {
      console.warn('Accelerometer already active');
      return;
    }

    if (!this.config.enabled) {
      console.log('Accelerometer disabled in config');
      return;
    }

    try {
      this.subscription = accelerometer.subscribe({
        next: (data: SensorData) => {
          const accelData: AccelerometerData = {
            x: data.x,
            y: data.y,
            z: data.z,
            timestamp: Date.now(),
          };
          callback(accelData);
        },
        error: (error: Error) => {
          console.error('Accelerometer error:', error);
        },
      });

      this.isActive = true;
      console.log('✅ Accelerometer started');
    } catch (error) {
      console.error('Failed to start accelerometer:', error);
      throw error;
    }
  }

  /**
   * Stop accelerometer monitoring
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }

    this.isActive = false;
    console.log('✅ Accelerometer stopped');
  }

  /**
   * Check if accelerometer is active
   */
  isRunning(): boolean {
    return this.isActive;
  }
}

export { AccelerometerSensor };

