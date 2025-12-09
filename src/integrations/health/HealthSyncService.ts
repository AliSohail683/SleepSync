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
}

export const healthSyncService = new HealthSyncService();
export default healthSyncService;

