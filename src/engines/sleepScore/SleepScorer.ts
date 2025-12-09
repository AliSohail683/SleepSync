/**
 * Sleep Scoring Engine
 * Multi-factor sleep score calculation
 */

import { SleepSessionEnhanced, SleepScoreBreakdown } from '../../types/sleep';
import { baselineRepository } from '../../storage/sqlite/repositories/BaselineRepository';
import { sleepScoreRepository } from '../../storage/sqlite/repositories/SleepScoreRepository';
import { calculateCircadianAlignment } from '../../utils/circadian';

class SleepScorer {
  /**
   * Calculate comprehensive sleep score
   */
  async calculateScore(
    session: SleepSessionEnhanced,
    userId: string
  ): Promise<SleepScoreBreakdown> {
    if (!session.durationMin) {
      throw new Error('Cannot calculate score without duration');
    }

    // Get baseline for comparison
    const baseline = await baselineRepository.getBaseline(userId);

    // Calculate component scores
    const durationScore = this.calculateDurationScore(session, baseline);
    const efficiencyScore = this.calculateEfficiencyScore(session);
    const latencyScore = this.calculateLatencyScore(session, baseline);
    const stagesScore = this.calculateStagesScore(session);
    const disturbancesScore = this.calculateDisturbancesScore(session);
    const circadianScore = this.calculateCircadianScore(session, baseline);

    // Weighted total score
    const total =
      durationScore * 0.25 +
      efficiencyScore * 0.25 +
      latencyScore * 0.15 +
      stagesScore * 0.15 +
      disturbancesScore * 0.1 +
      circadianScore * 0.1;

    const breakdown: SleepScoreBreakdown = {
      duration: Math.round(durationScore),
      efficiency: Math.round(efficiencyScore),
      latency: Math.round(latencyScore),
      stages: Math.round(stagesScore),
      disturbances: Math.round(disturbancesScore),
      circadian: Math.round(circadianScore),
      total: Math.round(total),
      factors: this.generateFactors(
        durationScore,
        efficiencyScore,
        latencyScore,
        stagesScore,
        disturbancesScore,
        circadianScore
      ),
    };

    // Save score history
    const date = session.startAt.split('T')[0];
    await sleepScoreRepository.saveScore(session.id, userId, date, breakdown);

    return breakdown;
  }

  /**
   * Calculate duration score (0-100)
   */
  private calculateDurationScore(
    session: SleepSessionEnhanced,
    baseline: any
  ): number {
    const hours = (session.durationMin || 0) / 60;
    const targetHours = baseline?.averageDuration || 8;

    // Optimal range: target ± 0.5 hours
    const deviation = Math.abs(hours - targetHours);
    if (deviation <= 0.5) return 100;
    if (deviation <= 1) return 90;
    if (deviation <= 1.5) return 75;
    if (deviation <= 2) return 60;
    return Math.max(0, 100 - deviation * 20);
  }

  /**
   * Calculate efficiency score (0-100)
   */
  private calculateEfficiencyScore(session: SleepSessionEnhanced): number {
    if (!session.durationMin) return 0;

    const totalTime = session.durationMin;
    const awakeTime = (session.awakeCount || 0) * 5; // Estimate 5 min per awakening
    const efficiency = ((totalTime - awakeTime) / totalTime) * 100;

    // Efficiency > 90% = 100, > 85% = 90, > 80% = 75, etc.
    if (efficiency >= 90) return 100;
    if (efficiency >= 85) return 90;
    if (efficiency >= 80) return 75;
    if (efficiency >= 75) return 60;
    return Math.max(0, efficiency * 0.8);
  }

  /**
   * Calculate latency score (0-100)
   */
  private calculateLatencyScore(session: SleepSessionEnhanced, _baseline: any): number {
    const latency = session.sleepLatency || 0;

    // Optimal: < 20 minutes
    if (latency < 15) return 100;
    if (latency < 20) return 95;
    if (latency < 30) return 85;
    if (latency < 45) return 70;
    if (latency < 60) return 50;
    return Math.max(0, 100 - latency * 2);
  }

  /**
   * Calculate stages score (0-100)
   */
  private calculateStagesScore(session: SleepSessionEnhanced): number {
    if (!session.stages || !session.durationMin) return 50;

    const hours = session.durationMin / 60;
    const deepPercent = session.stages.deep / hours;
    const remPercent = session.stages.rem / hours;

    let score = 50; // Base score

    // Deep sleep: ideal 15-20%
    if (deepPercent >= 0.15 && deepPercent <= 0.25) {
      score += 25;
    } else if (deepPercent >= 0.10 && deepPercent <= 0.30) {
      score += 15;
    } else {
      score -= 10;
    }

    // REM sleep: ideal 20-25%
    if (remPercent >= 0.20 && remPercent <= 0.30) {
      score += 25;
    } else if (remPercent >= 0.15 && remPercent <= 0.35) {
      score += 15;
    } else {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate disturbances score (0-100)
   */
  private calculateDisturbancesScore(session: SleepSessionEnhanced): number {
    const disturbances = session.disturbances?.length || session.awakeCount || 0;

    // 0-1 disturbances = 100, 2 = 90, 3 = 75, 4 = 60, 5+ = 40
    if (disturbances === 0) return 100;
    if (disturbances === 1) return 95;
    if (disturbances === 2) return 85;
    if (disturbances === 3) return 70;
    if (disturbances === 4) return 55;
    return Math.max(0, 100 - disturbances * 12);
  }

  /**
   * Calculate circadian alignment score (0-100)
   */
  private calculateCircadianScore(
    session: SleepSessionEnhanced,
    baseline: any
  ): number {
    if (!baseline) return 50;

    const sessionStart = new Date(session.startAt);
    const sessionEnd = session.endAt ? new Date(session.endAt) : null;

    if (!sessionEnd) return 50;

    const bedtime = `${String(sessionStart.getHours()).padStart(2, '0')}:${String(sessionStart.getMinutes()).padStart(2, '0')}`;
    const wakeTime = `${String(sessionEnd.getHours()).padStart(2, '0')}:${String(sessionEnd.getMinutes()).padStart(2, '0')}`;

    return calculateCircadianAlignment(
      bedtime,
      baseline.averageBedtime,
      wakeTime,
      baseline.averageWakeTime
    );
  }

  /**
   * Generate score factors
   */
  private generateFactors(
    duration: number,
    efficiency: number,
    latency: number,
    stages: number,
    disturbances: number,
    circadian: number
  ): Array<{ name: string; impact: 'positive' | 'negative'; value: number }> {
    const factors = [];

    if (duration >= 80) {
      factors.push({ name: 'Duration', impact: 'positive' as const, value: duration });
    } else if (duration < 60) {
      factors.push({ name: 'Duration', impact: 'negative' as const, value: duration });
    }

    if (efficiency >= 85) {
      factors.push({ name: 'Efficiency', impact: 'positive' as const, value: efficiency });
    } else if (efficiency < 75) {
      factors.push({ name: 'Efficiency', impact: 'negative' as const, value: efficiency });
    }

    if (latency < 20) {
      factors.push({ name: 'Quick Sleep Onset', impact: 'positive' as const, value: latency });
    } else if (latency > 45) {
      factors.push({ name: 'Long Sleep Onset', impact: 'negative' as const, value: latency });
    }

    if (stages >= 80) {
      factors.push({ name: 'Sleep Stages', impact: 'positive' as const, value: stages });
    } else if (stages < 60) {
      factors.push({ name: 'Sleep Stages', impact: 'negative' as const, value: stages });
    }

    if (disturbances < 2) {
      factors.push({ name: 'Few Disturbances', impact: 'positive' as const, value: disturbances });
    } else if (disturbances > 4) {
      factors.push({ name: 'Many Disturbances', impact: 'negative' as const, value: disturbances });
    }

    if (circadian >= 80) {
      factors.push({ name: 'Circadian Alignment', impact: 'positive' as const, value: circadian });
    } else if (circadian < 60) {
      factors.push({ name: 'Circadian Misalignment', impact: 'negative' as const, value: circadian });
    }

    return factors;
  }
}

export const sleepScorer = new SleepScorer();
export default sleepScorer;

