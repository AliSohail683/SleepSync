/**
 * Sleep Score Repository
 * Handles sleep score history storage
 */

import { database } from '../database';
import { SleepScoreBreakdown } from '../../../types/sleep';
import { UUID } from '../../../models';
import { v4 as uuidv4 } from 'uuid';

class SleepScoreRepository {
  /**
   * Save sleep score breakdown
   */
  async saveScore(
    sessionId: UUID,
    userId: UUID,
    date: string,
    breakdown: SleepScoreBreakdown
  ): Promise<void> {
    const db = database.getDatabase();
    await db.executeSql(
      `INSERT INTO sleep_score_history (
        id, session_id, user_id, date, total_score,
        duration_score, efficiency_score, latency_score,
        stages_score, disturbances_score, circadian_score,
        factors, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        sessionId,
        userId,
        date,
        breakdown.total,
        breakdown.duration,
        breakdown.efficiency,
        breakdown.latency,
        breakdown.stages,
        breakdown.disturbances,
        breakdown.circadian,
        JSON.stringify(breakdown.factors),
        new Date().toISOString(),
      ]
    );
  }

  /**
   * Get score history for user
   */
  async getScoreHistory(userId: UUID, days: number = 30): Promise<SleepScoreBreakdown[]> {
    const db = database.getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    const [results] = await db.executeSql(
      'SELECT * FROM sleep_score_history WHERE user_id = ? AND date >= ? ORDER BY date DESC',
      [userId, cutoff]
    );

    const scores: SleepScoreBreakdown[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      scores.push({
        duration: row.duration_score,
        efficiency: row.efficiency_score,
        latency: row.latency_score,
        stages: row.stages_score,
        disturbances: row.disturbances_score,
        circadian: row.circadian_score,
        total: row.total_score,
        factors: row.factors ? JSON.parse(row.factors) : [],
      });
    }
    return scores;
  }

  /**
   * Get average score for period
   */
  async getAverageScore(userId: UUID, days: number = 7): Promise<number> {
    const scores = await this.getScoreHistory(userId, days);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, s) => acc + s.total, 0);
    return Math.round(sum / scores.length);
  }
}

export const sleepScoreRepository = new SleepScoreRepository();
export default sleepScoreRepository;

