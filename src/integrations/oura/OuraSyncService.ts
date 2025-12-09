/**
 * Oura Sync Service
 * Syncs Oura Ring data into SleepSync
 */

import { ouraClient } from './OuraClient';
import { UUID } from '../../models';

class OuraSyncService {
  /**
   * Sync Oura data for user
   */
  async syncUserData(userId: UUID, days: number = 7): Promise<{
    sleepRecords: number;
    hrvRecords: number;
    readinessRecords: number;
  }> {
    if (!ouraClient.isAuthenticated()) {
      throw new Error('Oura not authenticated. Please connect your Oura account first.');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    try {
      // Fetch data from Oura
      const sleepData = await ouraClient.getSleepData(startDateStr, endDateStr);
      const hrvData = await ouraClient.getHRVData(startDateStr, endDateStr);
      const readinessData = await ouraClient.getReadinessScore(startDateStr, endDateStr);

      // Process and store data
      // This would merge Oura data with existing sessions
      console.log('Syncing Oura data for user:', userId);

      return {
        sleepRecords: 0, // Will be populated when processing
        hrvRecords: 0,
        readinessRecords: 0,
      };
    } catch (error) {
      console.error('Failed to sync Oura data:', error);
      throw error;
    }
  }

  /**
   * Initialize OAuth connection
   */
  async initializeConnection(): Promise<string> {
    return await ouraClient.initializeOAuth();
  }

  /**
   * Complete OAuth flow
   */
  async completeOAuth(code: string): Promise<void> {
    await ouraClient.exchangeCodeForToken(code);
  }
}

export const ouraSyncService = new OuraSyncService();
export default ouraSyncService;

