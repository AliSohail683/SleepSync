/**
 * Background Tracking Service
 * Coordinates background sleep tracking across platforms
 */

import { Platform, NativeModules } from 'react-native';
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

  /**
   * Initialize background tracking
   * Note: Native service now writes directly to database, no event emitter needed
   */
  async initialize(): Promise<void> {
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
        try {
          const result = await Promise.race([
            SleepTrackingModule.startTracking(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout starting background service')), 5000)
            )
          ]);
          console.log('Background service started:', result);
        } catch (nativeError: any) {
          console.error('Native module error:', nativeError);
          console.error('Error details:', {
            code: nativeError?.code,
            message: nativeError?.message,
            userInfo: nativeError?.userInfo,
          });
          // If native module fails, we can still track the session
          // but without background service
          console.warn('Continuing without background service...');
          // Don't set isTracking to true if service failed
          return;
        }
      } else if (Platform.OS === 'ios') {
        // iOS background tasks are handled separately
        try {
          await this.scheduleIOSBackgroundTask(sessionId, userId);
        } catch (iosError) {
          console.error('iOS background task error:', iosError);
          return;
        }
      }

      this.isTracking = true;
      console.log('✅ Background tracking started');
    } catch (error: any) {
      console.error('Failed to start background tracking:', error);
      console.error('Error stack:', error?.stack);
      // Don't throw - allow session to start even if background tracking fails
      // The session can still be tracked manually
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

      this.isTracking = false;
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
   * Non-blocking with timeout to prevent hanging
   * For Android: Checks if Google Fit is installed and prompts user to connect
   */
  private async fillGapWithHealthData(session: SleepSession): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Check if Google Fit is installed first
        const { googleFitManager } = require('../../integrations/health/GoogleFitManager');
        const isInstalled = await googleFitManager.isGoogleFitInstalled();
        
        if (!isInstalled) {
          console.warn('⚠️ Google Fit is not installed. Cannot fill gap with health data.');
          console.log('💡 User should install Google Fit from Play Store to enable health data sync');
          return;
        }
        
        console.log('✅ Google Fit is installed, proceeding with authorization...');
      }

      // Add longer timeout for permission request (30 seconds for Google Fit OAuth)
      const timeoutDuration = Platform.OS === 'android' ? 35000 : 10000; // 35s for Android, 10s for iOS
      
      const hasPermission = await Promise.race([
        healthSyncService.requestPermissions(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Health permission request timeout')), timeoutDuration)
        )
      ]).catch((error) => {
        console.warn('Health permission request timeout or error:', error);
        return false;
      });

      if (!hasPermission) {
        console.warn('Health permissions not granted, skipping gap fill');
        if (Platform.OS === 'android') {
          console.log('💡 User should grant Google Fit permissions to enable health data sync');
        }
        return;
      }

      // Get health data for the session period
      const startDate = new Date(session.startAt);
      const now = new Date();

      console.log(`📊 Attempting to read health data from ${startDate.toISOString()} to ${now.toISOString()}`);

      // Add longer timeout for health data read (20 seconds)
      await Promise.race([
        (async () => {
          if (Platform.OS === 'ios') {
            // Read HealthKit data for the gap period
            await this.readHealthKitGapData(session, startDate, now);
          } else if (Platform.OS === 'android') {
            // Read Google Fit data for the gap period
            await this.readGoogleFitGapData(session, startDate, now);
          }
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health data read timeout')), 20000)
        )
      ]).catch((error) => {
        console.warn('Health data read timeout or error:', error);
      });
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
   * Cleanup
   */
  cleanup(): void {
    // No event listeners to clean up - native service writes directly to database
  }
}

export const backgroundTrackingService = new BackgroundTrackingService();
export default backgroundTrackingService;

