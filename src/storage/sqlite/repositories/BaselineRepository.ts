/**
 * Baseline Metrics Repository
 * Handles baseline data storage and retrieval
 */

import { database } from '../database';
import { BaselineMetrics } from '../../../types/sleep';
import { UUID } from '../../../models';

class BaselineRepository {
  /**
   * Save baseline metrics
   */
  async saveBaseline(metrics: BaselineMetrics): Promise<void> {
    const db = database.getDatabase();
    await db.executeSql(
      `INSERT OR REPLACE INTO baseline_metrics (
        user_id, average_bedtime, average_wake_time, average_duration,
        average_latency, average_efficiency, disturbance_frequency,
        movement_threshold, sound_threshold, light_threshold,
        days_collected, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        metrics.userId,
        metrics.averageBedtime,
        metrics.averageWakeTime,
        metrics.averageDuration,
        metrics.averageLatency,
        metrics.averageEfficiency,
        metrics.disturbanceFrequency,
        metrics.sensorCalibration.movementThreshold,
        metrics.sensorCalibration.soundThreshold,
        metrics.sensorCalibration.lightThreshold,
        metrics.daysCollected,
        metrics.completedAt,
      ]
    );
  }

  /**
   * Get baseline metrics for user
   */
  async getBaseline(userId: UUID): Promise<BaselineMetrics | null> {
    const db = database.getDatabase();
    const [results] = await db.executeSql(
      'SELECT * FROM baseline_metrics WHERE user_id = ?',
      [userId]
    );

    if (results.rows.length === 0) {
      return null;
    }

    const row = results.rows.item(0);
    return {
      userId: row.user_id,
      averageBedtime: row.average_bedtime,
      averageWakeTime: row.average_wake_time,
      averageDuration: row.average_duration,
      averageLatency: row.average_latency,
      averageEfficiency: row.average_efficiency,
      disturbanceFrequency: row.disturbance_frequency,
      sensorCalibration: {
        movementThreshold: row.movement_threshold,
        soundThreshold: row.sound_threshold,
        lightThreshold: row.light_threshold,
      },
      daysCollected: row.days_collected,
      completedAt: row.completed_at,
    };
  }

  /**
   * Check if baseline is complete
   */
  async isBaselineComplete(userId: UUID): Promise<boolean> {
    const baseline = await this.getBaseline(userId);
    return baseline !== null && baseline.daysCollected >= 14;
  }
}

export const baselineRepository = new BaselineRepository();
export default baselineRepository;

