/**
 * Insights Generator
 * Generates nightly insights based on sleep data
 */

import { UUID } from '../../models';
import { SleepSessionEnhanced, SleepInsightEnhanced } from '../../types/sleep';
import { storageService } from '../../services/storageService';
import { baselineRepository } from '../../storage/sqlite/repositories/BaselineRepository';
import { calculateAverageScore } from '../../utils/trends';

class InsightsGenerator {
  /**
   * Generate insights for a sleep session
   */
  async generateInsights(
    session: SleepSessionEnhanced,
    userId: UUID
  ): Promise<SleepInsightEnhanced[]> {
    const insights: SleepInsightEnhanced[] = [];

    // Get baseline and recent sessions for comparison
    const baseline = await baselineRepository.getBaseline(userId);
    const recentSessions = await storageService.getRecentSessions(userId, 7);

    // Duration insight
    if (session.durationMin) {
      const hours = session.durationMin / 60;
      const baselineHours = baseline?.averageDuration || 8;
      const diff = hours - baselineHours;

      if (diff > 0.5) {
        insights.push({
          type: 'duration',
          severity: 'good',
          title: 'Longer Sleep Than Usual',
          description: `You slept ${diff.toFixed(1)} hours longer than your baseline.`,
          value: hours,
          comparison: { baseline: baselineHours },
          timestamp: session.endAt || session.startAt,
        });
      } else if (diff < -1) {
        insights.push({
          type: 'duration',
          severity: 'warning',
          title: 'Shorter Sleep Than Usual',
          description: `You slept ${Math.abs(diff).toFixed(1)} hours less than your baseline.`,
          value: hours,
          comparison: { baseline: baselineHours },
          timestamp: session.endAt || session.startAt,
        });
      }
    }

    // Latency insight
    if (session.sleepLatency && baseline) {
      const latencyDiff = session.sleepLatency - baseline.averageLatency;
      if (latencyDiff < -5) {
        insights.push({
          type: 'latency',
          severity: 'good',
          title: 'Fell Asleep Faster',
          description: `You fell asleep ${Math.abs(latencyDiff).toFixed(0)} minutes faster than usual.`,
          value: session.sleepLatency,
          comparison: { baseline: baseline.averageLatency },
          timestamp: session.endAt || session.startAt,
        });
      } else if (latencyDiff > 10) {
        insights.push({
          type: 'latency',
          severity: 'warning',
          title: 'Took Longer to Fall Asleep',
          description: `You took ${latencyDiff.toFixed(0)} minutes longer to fall asleep than usual.`,
          value: session.sleepLatency,
          comparison: { baseline: baseline.averageLatency },
          timestamp: session.endAt || session.startAt,
        });
      }
    }

    // Efficiency insight
    if (session.sleepEfficiency) {
      const baselineEfficiency = baseline?.averageEfficiency || 85;
      const efficiencyDiff = session.sleepEfficiency - baselineEfficiency;

      if (efficiencyDiff > 5) {
        insights.push({
          type: 'efficiency',
          severity: 'good',
          title: 'Improved Sleep Efficiency',
          description: `Your sleep efficiency was ${efficiencyDiff.toFixed(0)}% higher than your baseline.`,
          value: session.sleepEfficiency,
          comparison: { baseline: baselineEfficiency },
          timestamp: session.endAt || session.startAt,
        });
      } else if (efficiencyDiff < -10) {
        insights.push({
          type: 'efficiency',
          severity: 'warning',
          title: 'Lower Sleep Efficiency',
          description: `Your sleep efficiency was ${Math.abs(efficiencyDiff).toFixed(0)}% lower than your baseline.`,
          value: session.sleepEfficiency,
          comparison: { baseline: baselineEfficiency },
          timestamp: session.endAt || session.startAt,
        });
      }
    }

    // Disturbance insight
    const disturbanceCount = session.disturbances?.length || session.awakeCount || 0;
    if (disturbanceCount > 3) {
      insights.push({
        type: 'disturbance',
        severity: 'warning',
        title: 'More Disturbances Than Usual',
        description: `You had ${disturbanceCount} disturbances during sleep last night.`,
        value: disturbanceCount,
        timestamp: session.endAt || session.startAt,
      });
    } else if (disturbanceCount === 0) {
      insights.push({
        type: 'disturbance',
        severity: 'good',
        title: 'Undisturbed Sleep',
        description: 'You had no disturbances during sleep last night.',
        value: 0,
        timestamp: session.endAt || session.startAt,
      });
    }

    // Score insight
    if (session.sleepScore) {
      const avgScore = calculateAverageScore(recentSessions, 7);
      if (session.sleepScore > avgScore + 10) {
        insights.push({
          type: 'quality',
          severity: 'good',
          title: 'Excellent Sleep Quality',
          description: `Your sleep score of ${session.sleepScore} was significantly higher than your 7-day average.`,
          value: session.sleepScore,
          comparison: { average: avgScore },
          timestamp: session.endAt || session.startAt,
        });
      }
    }

    return insights;
  }
}

export const insightsGenerator = new InsightsGenerator();
export default insightsGenerator;

