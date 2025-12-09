/**
 * Gyroscope Sensor Module
 * Handles gyroscope data collection
 */

import { gyroscope, setUpdateIntervalForType, SensorData } from 'react-native-sensors';
import { Subscription } from 'rxjs';
import { GyroscopeData } from '../../types/sensors';

interface GyroscopeConfig {
  enabled: boolean;
  updateInterval: number;
}

class GyroscopeSensor {
  private config: GyroscopeConfig;
  private subscription?: Subscription;
  private isActive = false;

  constructor(config: GyroscopeConfig) {
    this.config = config;
    setUpdateIntervalForType('gyroscope', config.updateInterval);
  }

  /**
   * Start gyroscope monitoring
   */
  async start(callback: (data: GyroscopeData) => void): Promise<void> {
    if (this.isActive) {
      console.warn('Gyroscope already active');
      return;
    }

    if (!this.config.enabled) {
      console.log('Gyroscope disabled in config');
      return;
    }

    try {
      this.subscription = gyroscope.subscribe({
        next: (data: SensorData) => {
          const gyroData: GyroscopeData = {
            x: data.x,
            y: data.y,
            z: data.z,
            timestamp: Date.now(),
          };
          callback(gyroData);
        },
        error: (error: Error) => {
          console.error('Gyroscope error:', error);
        },
      });

      this.isActive = true;
      console.log('✅ Gyroscope started');
    } catch (error) {
      console.error('Failed to start gyroscope:', error);
      throw error;
    }
  }

  /**
   * Stop gyroscope monitoring
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
    console.log('✅ Gyroscope stopped');
  }

  /**
   * Check if gyroscope is active
   */
  isRunning(): boolean {
    return this.isActive;
  }
}

export { GyroscopeSensor };

