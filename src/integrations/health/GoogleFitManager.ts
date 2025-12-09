/**
 * Google Fit Integration
 * Syncs sleep data with Google Fit using react-native-google-fit
 */

import { Platform } from 'react-native';
import { SleepSessionEnhanced } from '../../types/sleep';
import { UUID } from '../../models';

// Import react-native-google-fit
let GoogleFit: any = null;
if (Platform.OS === 'android') {
  try {
    GoogleFit = require('react-native-google-fit').default;
  } catch (error) {
    console.warn('react-native-google-fit not available:', error);
  }
}

class GoogleFitManager {
  private isAuthorized = false;

  /**
   * Request Google Fit authorization
   */
  async requestAuthorization(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('Google Fit is only available on Android');
      return false;
    }

    if (!GoogleFit) {
      console.error('react-native-google-fit library not available');
      return false;
    }

    try {
      const scopes = [
        'https://www.googleapis.com/auth/fitness.sleep.read',
        'https://www.googleapis.com/auth/fitness.sleep.write',
        'https://www.googleapis.com/auth/fitness.heart_rate.read',
      ];

      const result = await GoogleFit.authorize({
        scopes: scopes,
      });

      this.isAuthorized = result.success;
      if (result.success) {
        console.log('✅ Google Fit authorization granted');
      } else {
        console.warn('⚠️ Google Fit authorization denied');
      }
      return result.success;
    } catch (error) {
      console.error('Google Fit authorization failed:', error);
      return false;
    }
  }

  /**
   * Sync sleep session to Google Fit
   */
  async syncSleepSession(session: SleepSessionEnhanced): Promise<void> {
    if (Platform.OS !== 'android' || !GoogleFit) {
      throw new Error('Google Fit is only available on Android');
    }

    if (!this.isAuthorized) {
      const granted = await this.requestAuthorization();
      if (!granted) {
        throw new Error('Google Fit authorization required');
      }
    }

    try {
      const startDate = new Date(session.startAt);
      const endDate = session.endAt ? new Date(session.endAt) : new Date();

      // Google Fit sleep data format
      const sleepData = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataTypeName: 'com.google.sleep.segment',
        // Google Fit uses different values for sleep stages
        // 1 = asleep, 2 = awake
        value: {
          intVal: 1, // ASLEEP
        },
      };

      await GoogleFit.saveSleep(sleepData);

      // If stages available, save them as separate segments
      if (session.stageSegments && session.stageSegments.length > 0) {
        for (const segment of session.stageSegments) {
          const stageValue = this.mapStageToGoogleFit(segment.stage);
          const segmentData = {
            startDate: new Date(segment.startTime).toISOString(),
            endDate: new Date(segment.endTime).toISOString(),
            dataTypeName: 'com.google.sleep.segment',
            value: {
              intVal: stageValue,
            },
          };

          await GoogleFit.saveSleep(segmentData);
        }
      }

      console.log('✅ Sleep session synced to Google Fit:', session.id);
    } catch (error) {
      console.error('Failed to sync to Google Fit:', error);
      throw error;
    }
  }

  /**
   * Map sleep stage to Google Fit value
   */
  private mapStageToGoogleFit(stage: string): number {
    // Google Fit sleep segment values
    // 1 = asleep, 2 = awake
    const mapping: Record<string, number> = {
      awake: 2,
      asleep: 1,
      light: 1, // Light sleep maps to asleep
      deep: 1, // Deep sleep maps to asleep
      rem: 1, // REM maps to asleep
    };
    return mapping[stage] || 1;
  }

  /**
   * Read sleep data from Google Fit
   */
  async readSleepData(startDate: Date, endDate: Date): Promise<any[]> {
    if (Platform.OS !== 'android' || !GoogleFit) {
      return [];
    }

    if (!this.isAuthorized) {
      const granted = await this.requestAuthorization();
      if (!granted) {
        throw new Error('Google Fit authorization required');
      }
    }

    try {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucketUnit: 'DAY',
        bucketSize: 1,
      };

      const result = await GoogleFit.getSleepSamples(options);
      return result || [];
    } catch (error) {
      console.error('Failed to read from Google Fit:', error);
      throw error;
    }
  }

  /**
   * Read movement and heart rate data from Google Fit for a time period
   * Used to fill gaps when app was killed
   */
  async readGapData(startDate: Date, endDate: Date): Promise<{
    movementData: Array<{ timestamp: number; magnitude: number }>;
    heartRateData: Array<{ timestamp: number; bpm: number }>;
  }> {
    if (Platform.OS !== 'android' || !GoogleFit) {
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
        bucketUnit: 'MINUTE',
        bucketSize: 1,
      };

      const heartRateResult = await GoogleFit.getHeartRateSamples(heartRateOptions);
      const heartRateData = (heartRateResult || []).map((sample: any) => ({
        timestamp: new Date(sample.startDate || sample.endDate).getTime(),
        bpm: sample.value || 0,
      }));

      // Read step count as proxy for movement
      const stepOptions = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucketUnit: 'MINUTE',
        bucketSize: 1,
      };

      const stepResult = await GoogleFit.getDailyStepCountSamples(stepOptions);
      const movementData = (stepResult || []).map((sample: any) => ({
        timestamp: new Date(sample.startDate || sample.endDate).getTime(),
        magnitude: (sample.steps || 0) * 0.1, // Convert steps to movement magnitude
      }));

      return {
        movementData,
        heartRateData,
      };
    } catch (error) {
      console.error('Failed to read Google Fit gap data:', error);
      return { movementData: [], heartRateData: [] };
    }
  }

  /**
   * Check authorization status
   */
  isGoogleFitAuthorized(): boolean {
    return this.isAuthorized;
  }
}

export const googleFitManager = new GoogleFitManager();
export default googleFitManager;

