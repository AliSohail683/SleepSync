/**
 * Health Sync Service
 * Unified service for syncing with Apple Health and Google Fit
 */

import { Platform } from 'react-native';
import { SleepSessionEnhanced } from '../../types/sleep';
import { healthKitManager } from './HealthKitManager';
import { googleFitManager } from './GoogleFitManager';

class HealthSyncService {
  /**
   * Sync sleep session to health platform
   */
  async syncSession(session: SleepSessionEnhanced): Promise<void> {
    if (Platform.OS === 'ios') {
      await healthKitManager.syncSleepSession(session);
    } else if (Platform.OS === 'android') {
      await googleFitManager.syncSleepSession(session);
    }
  }

  /**
   * Request all necessary permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return await healthKitManager.requestAuthorization();
    } else if (Platform.OS === 'android') {
      return await googleFitManager.requestAuthorization();
    }
    return false;
  }

  /**
   * Check if health sync is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Check if Google Fit is installed (Android only)
   */
  async isGoogleFitInstalled(): Promise<boolean> {
    if (Platform.OS === 'android') {
      return await googleFitManager.isGoogleFitInstalled();
    }
    return false;
  }

  /**
   * Request permissions with installation check
   * For Android, checks if Google Fit is installed first
   */
  async requestPermissionsWithCheck(): Promise<{ granted: boolean; needsInstallation: boolean; message?: string }> {
    if (Platform.OS === 'android') {
      const isInstalled = await googleFitManager.isGoogleFitInstalled();
      if (!isInstalled) {
        return {
          granted: false,
          needsInstallation: true,
          message: 'Google Fit app is not installed. Please install it from Play Store to enable health data sync.',
        };
      }
      
      const granted = await googleFitManager.requestAuthorization();
      return {
        granted,
        needsInstallation: false,
        message: granted ? 'Google Fit connected successfully' : 'Google Fit authorization denied',
      };
    } else if (Platform.OS === 'ios') {
      const granted = await healthKitManager.requestAuthorization();
      return {
        granted,
        needsInstallation: false,
        message: granted ? 'HealthKit connected successfully' : 'HealthKit authorization denied',
      };
    }
    
    return { granted: false, needsInstallation: false };
  }
}

export const healthSyncService = new HealthSyncService();
export default healthSyncService;

