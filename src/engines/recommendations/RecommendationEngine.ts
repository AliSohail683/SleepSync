/**
 * Recommendation Engine
 * Generates personalized sleep recommendations
 */

import { UUID } from '../../models';
import { Recommendation } from '../../types/sleep';
import { storageService } from '../../services/storageService';
import { baselineRepository } from '../../storage/sqlite/repositories/BaselineRepository';
import { v4 as uuidv4 } from 'uuid';

class RecommendationEngine {
  /**
   * Generate daily recommendations
   */
  async generateRecommendations(userId: UUID): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Get user profile and recent sessions
    const profile = await storageService.getUserProfile(userId);
    const sessions = await storageService.getRecentSessions(userId, 7);
    const baseline = await baselineRepository.getBaseline(userId);

    if (!profile || sessions.length === 0) {
      return recommendations;
    }

    // Bedtime adjustment recommendation
    const bedtimeRec = this.generateBedtimeRecommendation(profile, sessions, baseline);
    if (bedtimeRec) recommendations.push(bedtimeRec);

    // Caffeine recommendation
    const caffeineRec = this.generateCaffeineRecommendation(profile, sessions);
    if (caffeineRec) recommendations.push(caffeineRec);

    // Consistency recommendation
    const consistencyRec = this.generateConsistencyRecommendation(sessions);
    if (consistencyRec) recommendations.push(consistencyRec);

    // Limit to 3 recommendations per day
    return recommendations.slice(0, 3);
  }

  /**
   * Generate bedtime adjustment recommendation
   */
  private generateBedtimeRecommendation(
    profile: any,
    sessions: any[],
    baseline: any
  ): Recommendation | null {
    if (!baseline || sessions.length < 3) return null;

    const recentBedtimes = sessions
      .slice(0, 3)
      .map((s) => {
        const date = new Date(s.startAt);
        return date.getHours() + date.getMinutes() / 60;
      });

    const avgBedtime = recentBedtimes.reduce((sum, t) => sum + t, 0) / recentBedtimes.length;
    const baselineBedtime = this.parseTimeToHours(baseline.averageBedtime);

    const diff = avgBedtime - baselineBedtime;

    if (Math.abs(diff) > 1) {
      const adjustment = diff > 0 ? -30 : 30; // Adjust 30 minutes
      return {
        id: uuidv4(),
        userId: profile.id,
        type: 'bedtime',
        priority: 'medium',
        title: 'Adjust Bedtime',
        description: `Your bedtime has shifted ${Math.abs(diff).toFixed(1)} hours from your baseline.`,
        actionItems: [
          `Try going to bed ${Math.abs(adjustment)} minutes ${diff > 0 ? 'earlier' : 'later'} tonight.`,
          'Maintain this schedule for better sleep consistency.',
        ],
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };
    }

    return null;
  }

  /**
   * Generate caffeine recommendation
   */
  private generateCaffeineRecommendation(
    profile: any,
    sessions: any[]
  ): Recommendation | null {
    if (profile.caffeineHabits === 'none') return null;

    // Check if high caffeine correlates with poor sleep
    const recentScores = sessions
      .filter((s) => s.sleepScore)
      .map((s) => s.sleepScore!);
    const avgScore = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;

    if (profile.caffeineHabits === 'high' && avgScore < 70) {
      return {
        id: uuidv4(),
        userId: profile.id,
        type: 'caffeine',
        priority: 'high',
        title: 'Reduce Caffeine Intake',
        description: 'High caffeine intake may be affecting your sleep quality.',
        actionItems: [
          'Avoid caffeine after 2 PM.',
          'Gradually reduce daily caffeine intake.',
          'Try switching to decaf in the afternoon.',
        ],
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      };
    }

    return null;
  }

  /**
   * Generate consistency recommendation
   */
  private generateConsistencyRecommendation(sessions: any[]): Recommendation | null {
    if (sessions.length < 5) return null;

    const bedtimes = sessions.map((s) => {
      const date = new Date(s.startAt);
      return date.getHours() + date.getMinutes() / 60;
    });

    const variance = this.calculateVariance(bedtimes);

    if (variance > 4) {
      return {
        id: uuidv4(),
        userId: sessions[0].userId,
        type: 'routine',
        priority: 'medium',
        title: 'Improve Sleep Schedule Consistency',
        description: 'Your bedtime varies significantly each night, which can disrupt your sleep.',
        actionItems: [
          'Try to go to bed at the same time every night, even on weekends.',
          'Set a bedtime reminder 30 minutes before your target time.',
          'Create a relaxing pre-sleep routine.',
        ],
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };
    }

    return null;
  }

  /**
   * Parse time string to hours
   */
  private parseTimeToHours(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return variance;
  }
}

export const recommendationEngine = new RecommendationEngine();
export default recommendationEngine;

