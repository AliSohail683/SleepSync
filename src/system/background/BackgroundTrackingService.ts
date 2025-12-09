/**
 * Background Tracking Service
 * Coordinates background sleep tracking across platforms
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { backgroundManager } from './BackgroundManager';
import { healthSyncService } from '../../integrations/health/HealthSyncService';
import { SleepSession } from '../../models';
import { storageService } from '../../services/storageService';

const { SleepTrackingModule } = NativeModules as {
  SleepTrackingModule?: {
    startTracking(): Promise<boolean>;
    stopTracking(): Promise<boolean>;
    isTracking(): Promise<boolean>;
  };
};

class BackgroundTrackingService {
  private isTracking = false;
  private eventEmitter: NativeEventEmitter | null = null;
  private sensorDataBuffer: Array<{ magnitude: number; timestamp: number }> = [];

  /**
   * Initialize background tracking
   */
  async initialize(): Promise<void> {
    if (Platform.OS === 'android' && SleepTrackingModule) {
      this.eventEmitter = new NativeEventEmitter(SleepTrackingModule);
      this.eventEmitter.addListener('BackgroundSensorData', this.handleSensorData.bind(this));
    }

    // Initialize background manager
    await backgroundManager.initialize();
  }

  /**
   * Start background tracking for a sleep session
   */
  async startTracking(sessionId: string, userId: string): Promise<void> {
    if (this.isTracking) {
      console.warn('Background tracking already active');
      return;
    }

    try {
      if (Platform.OS === 'android' && SleepTrackingModule) {
        await SleepTrackingModule.startTracking();
      } else if (Platform.OS === 'ios') {
        // iOS background tasks are handled separately
        await this.scheduleIOSBackgroundTask(sessionId, userId);
      }

      this.isTracking = true;
      console.log('✅ Background tracking started');
    } catch (error) {
      console.error('Failed to start background tracking:', error);
      throw error;
    }
  }

  /**
   * Stop background tracking
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    try {
      if (Platform.OS === 'android' && SleepTrackingModule) {
        await SleepTrackingModule.stopTracking();
      }

      // Flush any buffered sensor data
      await this.flushSensorData();

      this.isTracking = false;
      this.sensorDataBuffer = [];
      console.log('✅ Background tracking stopped');
    } catch (error) {
      console.error('Failed to stop background tracking:', error);
      throw error;
    }
  }

  /**
   * Check if tracking is active
   */
  async isTrackingActive(): Promise<boolean> {
    if (Platform.OS === 'android' && SleepTrackingModule) {
      try {
        return await SleepTrackingModule.isTracking();
      } catch {
        return this.isTracking;
      }
    }
    return this.isTracking;
  }

  /**
   * Recover tracking for an active session
   */
  async recoverTracking(session: SleepSession): Promise<void> {
    if (!session || session.endAt) {
      return; // Session already ended
    }

    console.log('🔄 Recovering background tracking for session:', session.id);

    // Start tracking again
    await this.startTracking(session.id, session.userId);

    // Try to fill gap with Health data
    await this.fillGapWithHealthData(session);
  }

  /**
   * Fill data gap using HealthKit/Google Fit
   */
  private async fillGapWithHealthData(session: SleepSession): Promise<void> {
    try {
      const hasPermission = await healthSyncService.requestPermissions();
      if (!hasPermission) {
        console.warn('Health permissions not granted, skipping gap fill');
        return;
      }

      // Get health data for the session period
      const startDate = new Date(session.startAt);
      const now = new Date();

      if (Platform.OS === 'ios') {
        // Read HealthKit data for the gap period
        await this.readHealthKitGapData(session, startDate, now);
      } else if (Platform.OS === 'android') {
        // Read Google Fit data for the gap period
        await this.readGoogleFitGapData(session, startDate, now);
      }
    } catch (error) {
      console.error('Failed to fill gap with health data:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  /**
   * Read HealthKit data for gap period
   */
  private async readHealthKitGapData(
    session: SleepSession,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    try {
      const { healthKitManager } = require('../../integrations/health/HealthKitManager');
      const gapData = await healthKitManager.readGapData(startDate, endDate);
      
      if (gapData.movementData.length > 0 || gapData.heartRateData.length > 0) {
        console.log(`📊 Filled gap with ${gapData.movementData.length} movement points and ${gapData.heartRateData.length} heart rate points`);
        
        // Store gap data for session analysis
        // This would be merged with session data during evaluation
        await storageService.updateSleepSession(session.id, {
          deviceData: {
            gapData: {
              movement: gapData.movementData,
              heartRate: gapData.heartRateData,
              source: 'healthkit',
            },
          },
        });
      }
    } catch (error) {
      console.error('Failed to read HealthKit gap data:', error);
    }
  }

  /**
   * Read Google Fit data for gap period
   */
  private async readGoogleFitGapData(
    session: SleepSession,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    try {
      const { googleFitManager } = require('../../integrations/health/GoogleFitManager');
      const gapData = await googleFitManager.readGapData(startDate, endDate);
      
      if (gapData.movementData.length > 0 || gapData.heartRateData.length > 0) {
        console.log(`📊 Filled gap with ${gapData.movementData.length} movement points and ${gapData.heartRateData.length} heart rate points`);
        
        // Store gap data for session analysis
        await storageService.updateSleepSession(session.id, {
          deviceData: {
            gapData: {
              movement: gapData.movementData,
              heartRate: gapData.heartRateData,
              source: 'googlefit',
            },
          },
        });
      }
    } catch (error) {
      console.error('Failed to read Google Fit gap data:', error);
    }
  }

  /**
   * Schedule iOS background task
   */
  private async scheduleIOSBackgroundTask(sessionId: string, userId: string): Promise<void> {
    try {
      const { iosBackgroundTasks } = require('./ios/BackgroundTasks');
      await iosBackgroundTasks.scheduleTask();
      await iosBackgroundTasks.scheduleFetch();
      console.log('✅ iOS background tasks scheduled for session:', sessionId);
    } catch (error) {
      console.error('Failed to schedule iOS background task:', error);
    }
  }

  /**
   * Handle sensor data from background service
   */
  private handleSensorData(data: { magnitude: number; timestamp: number }): void {
    // Buffer sensor data
    this.sensorDataBuffer.push(data);

    // If buffer gets too large, flush it
    if (this.sensorDataBuffer.length > 100) {
      this.flushSensorData();
    }
  }

  /**
   * Flush buffered sensor data to storage
   */
  private async flushSensorData(): Promise<void> {
    if (this.sensorDataBuffer.length === 0) {
      return;
    }

    try {
      // Store sensor data for current session
      // This would be stored in SQLite or sent to backend
      const data = [...this.sensorDataBuffer];
      this.sensorDataBuffer = [];

      console.log(`Flushed ${data.length} sensor data points`);
      // Implementation to save data would go here
    } catch (error) {
      console.error('Failed to flush sensor data:', error);
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('BackgroundSensorData');
    }
  }
}

export const backgroundTrackingService = new BackgroundTrackingService();
export default backgroundTrackingService;

