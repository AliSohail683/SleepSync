/**
 * Baseline Analyzer
 * Analyzes first 14 days of sleep data to establish baseline metrics
 */

import { UUID } from '../../models';
import { BaselineMetrics } from '../../types/sleep';
import { baselineRepository } from '../../storage/sqlite/repositories/BaselineRepository';
import { storageService } from '../../services/storageService';
import { sensorDataRepository } from '../../storage/sqlite/repositories/SensorDataRepository';

class BaselineAnalyzer {
  /**
   * Collect baseline data from sessions
   */
  async collectBaselineData(userId: UUID): Promise<{
    daysCollected: number;
    isComplete: boolean;
    progress: number; // 0-100
  }> {
    const sessions = await storageService.getRecentSessions(userId, 14);
    const completedSessions = sessions.filter((s) => s.endAt && s.durationMin);

    const daysCollected = completedSessions.length;
    const isComplete = daysCollected >= 14;
    const progress = Math.min(100, Math.round((daysCollected / 14) * 100));

    if (isComplete) {
      await this.calculateBaseline(userId, completedSessions);
    }

    return { daysCollected, isComplete, progress };
  }

  /**
   * Calculate baseline metrics from collected sessions
   */
  async calculateBaseline(userId: UUID, sessions: any[]): Promise<BaselineMetrics> {
    if (sessions.length === 0) {
      throw new Error('No sessions available for baseline calculation');
    }

    // Calculate average bedtime
    const bedtimes = sessions.map((s) => {
      const date = new Date(s.startAt);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    });
    const avgBedtime = this.calculateAverageTime(bedtimes);

    // Calculate average wake time
    const wakeTimes = sessions
      .filter((s) => s.endAt)
      .map((s) => {
        const date = new Date(s.endAt!);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      });
    const avgWakeTime = this.calculateAverageTime(wakeTimes);

    // Calculate average duration
    const avgDuration =
      sessions.reduce((sum, s) => sum + (s.durationMin || 0), 0) /
      sessions.length /
      60; // hours

    // Calculate average latency
    const avgLatency =
      sessions
        .filter((s) => s.sleepLatency)
        .reduce((sum, s) => sum + (s.sleepLatency || 0), 0) /
      sessions.filter((s) => s.sleepLatency).length || 0;

    // Calculate average efficiency
    const efficiencies = sessions
      .filter((s) => s.durationMin)
      .map((s) => {
        const totalTime = s.durationMin!;
        const awakeTime = (s.awakeCount || 0) * 5; // Estimate 5 min per awakening
        return ((totalTime - awakeTime) / totalTime) * 100;
      });
    const avgEfficiency =
      efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length || 0;

    // Calculate disturbance frequency
    const totalDisturbances = sessions.reduce(
      (sum, s) => sum + (s.awakeCount || 0),
      0
    );
    const disturbanceFrequency = totalDisturbances / sessions.length;

    // Calibrate sensor thresholds
    const sensorCalibration = await this.calibrateSensors(userId, sessions);

    const baseline: BaselineMetrics = {
      userId,
      averageBedtime: avgBedtime,
      averageWakeTime: avgWakeTime,
      averageDuration: avgDuration,
      averageLatency: avgLatency,
      averageEfficiency: avgEfficiency,
      disturbanceFrequency,
      sensorCalibration,
      daysCollected: sessions.length,
      completedAt: new Date().toISOString(),
    };

    await baselineRepository.saveBaseline(baseline);
    return baseline;
  }

  /**
   * Calculate average time from time strings
   */
  private calculateAverageTime(times: string[]): string {
    if (times.length === 0) return '22:00';

    const minutes = times.map((t) => {
      const [hours, mins] = t.split(':').map(Number);
      return hours * 60 + mins;
    });

    const avgMinutes = minutes.reduce((sum, m) => sum + m, 0) / minutes.length;
    const hours = Math.floor(avgMinutes / 60);
    const mins = Math.round(avgMinutes % 60);

    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Calibrate sensor thresholds from baseline data
   */
  private async calibrateSensors(
    userId: UUID,
    sessions: any[]
  ): Promise<{
    movementThreshold: number;
    soundThreshold: number;
    lightThreshold: number;
  }> {
    // Get sensor data for all sessions
    const allChunks = [];
    for (const session of sessions) {
      const chunks = await sensorDataRepository.getChunksForSession(session.id);
      allChunks.push(...chunks);
    }

    // Calculate movement threshold (95th percentile of movement during sleep)
    const movements = allChunks
      .filter((c) => c.accelerometer)
      .map((c) => {
        const accel = c.accelerometer!;
        return Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);
      });
    movements.sort((a, b) => a - b);
    const movementThreshold = movements[Math.floor(movements.length * 0.95)] || 0.5;

    // Calculate sound threshold (90th percentile)
    const sounds = allChunks
      .filter((c) => c.audio)
      .map((c) => c.audio!.decibel);
    sounds.sort((a, b) => a - b);
    const soundThreshold = sounds[Math.floor(sounds.length * 0.9)] || 50;

    // Calculate light threshold (90th percentile)
    const lights = allChunks
      .filter((c) => c.light)
      .map((c) => c.light!.lux);
    lights.sort((a, b) => a - b);
    const lightThreshold = lights[Math.floor(lights.length * 0.9)] || 10;

    return {
      movementThreshold,
      soundThreshold,
      lightThreshold,
    };
  }

  /**
   * Get baseline progress
   */
  async getBaselineProgress(userId: UUID): Promise<{
    daysCollected: number;
    daysRemaining: number;
    progress: number;
    isComplete: boolean;
  }> {
    const { daysCollected, isComplete, progress } = await this.collectBaselineData(userId);
    return {
      daysCollected,
      daysRemaining: Math.max(0, 14 - daysCollected),
      progress,
      isComplete,
    };
  }
}

export const baselineAnalyzer = new BaselineAnalyzer();
export default baselineAnalyzer;

