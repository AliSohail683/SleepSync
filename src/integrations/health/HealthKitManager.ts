/**
 * Apple Health Integration
 * Syncs sleep data with Apple HealthKit using react-native-health
 */

import { Platform } from 'react-native';
import { SleepSessionEnhanced } from '../../types/sleep';
import { UUID } from '../../models';

// Import react-native-health
let AppleHealthKit: any = null;
if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch (error) {
    console.warn('react-native-health not available:', error);
  }
}

class HealthKitManager {
  private isAuthorized = false;

  /**
   * Request HealthKit authorization
   */
  async requestAuthorization(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('HealthKit is only available on iOS');
      return false;
    }

    if (!AppleHealthKit) {
      console.error('react-native-health library not available');
      return false;
    }

    try {
      const permissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.SleepAnalysis,
            AppleHealthKit.Constants.Permissions.HeartRate,
            AppleHealthKit.Constants.Permissions.RespiratoryRate,
          ],
          write: [
            AppleHealthKit.Constants.Permissions.SleepAnalysis,
          ],
        },
      };

      const result = await new Promise<boolean>((resolve) => {
        AppleHealthKit.initHealthKit(permissions, (error: any) => {
          if (error) {
            console.error('HealthKit authorization error:', error);
            resolve(false);
          } else {
            console.log('✅ HealthKit authorization granted');
            resolve(true);
          }
        });
      });

      this.isAuthorized = result;
      return result;
    } catch (error) {
      console.error('HealthKit authorization failed:', error);
      return false;
    }
  }

  /**
   * Sync sleep session to HealthKit
   */
  async syncSleepSession(session: SleepSessionEnhanced): Promise<void> {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      throw new Error('HealthKit is only available on iOS');
    }

    if (!this.isAuthorized) {
      const granted = await this.requestAuthorization();
      if (!granted) {
        throw new Error('HealthKit authorization required');
      }
    }

    try {
      const startDate = new Date(session.startAt);
      const endDate = session.endAt ? new Date(session.endAt) : new Date();

      // Save main sleep session
      const sleepData = {
        value: AppleHealthKit.Constants.SleepAnalysis.ASLEEP,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      await new Promise<void>((resolve, reject) => {
        AppleHealthKit.saveSleepAnalysis(sleepData, (error: any) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // If stages available, save them as separate segments
      if (session.stageSegments && session.stageSegments.length > 0) {
        for (const segment of session.stageSegments) {
          const stageValue = this.mapStageToHealthKit(segment.stage);
          const segmentData = {
            value: stageValue,
            startDate: new Date(segment.startTime).toISOString(),
            endDate: new Date(segment.endTime).toISOString(),
          };

          await new Promise<void>((resolve, reject) => {
            AppleHealthKit.saveSleepAnalysis(segmentData, (error: any) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          });
        }
      }

      console.log('✅ Sleep session synced to HealthKit:', session.id);
    } catch (error) {
      console.error('Failed to sync to HealthKit:', error);
      throw error;
    }
  }

  /**
   * Read sleep and movement data from HealthKit for a time period
   * Used to fill gaps when app was killed
   */
  async readGapData(startDate: Date, endDate: Date): Promise<{
    movementData: Array<{ timestamp: number; magnitude: number }>;
    heartRateData: Array<{ timestamp: number; bpm: number }>;
  }> {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      return { movementData: [], heartRateData: [] };
    }

    if (!this.isAuthorized) {
      const granted = await this.requestAuthorization();
      if (!granted) {
        return { movementData: [], heartRateData: [] };
      }
    }

    try {
      // Read heart rate data
      const heartRateOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const heartRateData = await new Promise<any[]>((resolve, reject) => {
        AppleHealthKit.getHeartRateSamples(heartRateOptions, (error: any, results: any[]) => {
          if (error) {
            reject(error);
          } else {
            resolve(results || []);
          }
        });
      });

      // Convert to our format
      const formattedHeartRate = heartRateData.map((sample: any) => ({
        timestamp: new Date(sample.startDate).getTime(),
        bpm: sample.value,
      }));

      // Note: Movement data would require reading accelerometer data from HealthKit
      // which may not be directly available. We'll use heart rate as a proxy for activity.
      const movementData: Array<{ timestamp: number; magnitude: number }> = [];

      return {
        movementData,
        heartRateData: formattedHeartRate,
      };
    } catch (error) {
      console.error('Failed to read HealthKit gap data:', error);
      return { movementData: [], heartRateData: [] };
    }
  }

  /**
   * Map sleep stage to HealthKit category value
   */
  private mapStageToHealthKit(stage: string): number {
    if (!AppleHealthKit) return 1;

    // HealthKit sleep analysis values from react-native-health
    const mapping: Record<string, number> = {
      awake: AppleHealthKit.Constants.SleepAnalysis.AWAKE,
      asleep: AppleHealthKit.Constants.SleepAnalysis.ASLEEP,
      inBed: AppleHealthKit.Constants.SleepAnalysis.IN_BED,
      light: AppleHealthKit.Constants.SleepAnalysis.ASLEEP, // Light sleep maps to ASLEEP
      deep: AppleHealthKit.Constants.SleepAnalysis.ASLEEP, // Deep sleep maps to ASLEEP
      rem: AppleHealthKit.Constants.SleepAnalysis.ASLEEP, // REM maps to ASLEEP
    };
    return mapping[stage] || AppleHealthKit.Constants.SleepAnalysis.ASLEEP;
  }

  /**
   * Read sleep data from HealthKit
   */
  async readSleepData(startDate: Date, endDate: Date): Promise<any[]> {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      return [];
    }

    if (!this.isAuthorized) {
      const granted = await this.requestAuthorization();
      if (!granted) {
        throw new Error('HealthKit authorization required');
      }
    }

    try {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      return new Promise<any[]>((resolve, reject) => {
        AppleHealthKit.getSleepSamples(options, (error: any, results: any[]) => {
          if (error) {
            reject(error);
          } else {
            resolve(results || []);
          }
        });
      });
    } catch (error) {
      console.error('Failed to read from HealthKit:', error);
      throw error;
    }
  }

  /**
   * Check authorization status
   */
  isHealthKitAuthorized(): boolean {
    return this.isAuthorized;
  }
}

export const healthKitManager = new HealthKitManager();
export default healthKitManager;

