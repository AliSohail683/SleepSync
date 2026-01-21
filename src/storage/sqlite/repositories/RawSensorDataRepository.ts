/**
 * Raw Sensor Data Repository
 * Handles raw sensor data storage and retrieval (written by native service)
 */

import { database } from '../database';
import { UUID } from '../../../models';

export interface RawSensorData {
  id: number;
  sessionId: string;
  timestamp: number;
  x: number;
  y: number;
  z: number;
  sensorType: string;
  processed: boolean;
  createdAt: string;
}

class RawSensorDataRepository {
  /**
   * Get unprocessed raw data for a session
   * @param sessionId - Session ID to get data for
   * @param limit - Maximum number of records to return (default: 1000)
   * @returns Array of unprocessed raw sensor data
   */
  async getUnprocessedData(sessionId: UUID, limit: number = 1000): Promise<RawSensorData[]> {
    try {
      const db = database.getDatabase();
      const [results] = await db.executeSql(
        `SELECT * FROM sensor_data_raw 
         WHERE session_id = ? AND processed = 0 
         ORDER BY timestamp ASC 
         LIMIT ?`,
        [sessionId, limit]
      );

      const data: RawSensorData[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        data.push({
          id: row.id,
          sessionId: row.session_id,
          timestamp: row.timestamp,
          x: row.x,
          y: row.y,
          z: row.z,
          sensorType: row.sensor_type,
          processed: row.processed === 1,
          createdAt: row.created_at,
        });
      }
      return data;
    } catch (error) {
      console.error('Failed to get unprocessed raw sensor data:', error);
      throw error;
    }
  }

  /**
   * Mark raw data as processed
   * @param ids - Array of record IDs to mark as processed
   */
  async markAsProcessed(ids: number[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    try {
      const db = database.getDatabase();
      const placeholders = ids.map(() => '?').join(',');
      await db.executeSql(
        `UPDATE sensor_data_raw SET processed = 1 WHERE id IN (${placeholders})`,
        ids
      );
    } catch (error) {
      console.error('Failed to mark raw sensor data as processed:', error);
      throw error;
    }
  }

  /**
   * Get count of unprocessed data for a session
   * @param sessionId - Session ID to check
   * @returns Number of unprocessed records
   */
  async getUnprocessedCount(sessionId: UUID): Promise<number> {
    try {
      const db = database.getDatabase();
      const [results] = await db.executeSql(
        'SELECT COUNT(*) as count FROM sensor_data_raw WHERE session_id = ? AND processed = 0',
        [sessionId]
      );

      return results.rows.item(0)?.count || 0;
    } catch (error) {
      console.error('Failed to get unprocessed count:', error);
      return 0;
    }
  }

  /**
   * Delete processed data older than specified days
   * @param daysOld - Number of days old (default: 7)
   */
  async deleteOldProcessedData(daysOld: number = 7): Promise<void> {
    try {
      const db = database.getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffTimestamp = cutoffDate.getTime();

      await db.executeSql(
        'DELETE FROM sensor_data_raw WHERE processed = 1 AND timestamp < ?',
        [cutoffTimestamp]
      );
    } catch (error) {
      console.error('Failed to delete old processed data:', error);
      throw error;
    }
  }

  /**
   * Get total count of raw data for a session (processed + unprocessed)
   * @param sessionId - Session ID to check
   * @returns Total number of records
   */
  async getTotalCount(sessionId: UUID): Promise<number> {
    try {
      const db = database.getDatabase();
      const [results] = await db.executeSql(
        'SELECT COUNT(*) as count FROM sensor_data_raw WHERE session_id = ?',
        [sessionId]
      );

      return results.rows.item(0)?.count || 0;
    } catch (error) {
      console.error('Failed to get total count:', error);
      return 0;
    }
  }
}

export const rawSensorDataRepository = new RawSensorDataRepository();
export default rawSensorDataRepository;

