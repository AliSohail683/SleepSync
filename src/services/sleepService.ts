/**
 * Sleep Service
 * Manages sleep sessions and sleep tracking logic
 */

import { v4 as uuidv4 } from 'uuid';
import { SleepSession, UUID } from '@/models';
import { storageService } from './storageService';
import {
  calculateSleepScore,
  estimateSleepStages,
  generateInsights,
} from '@/utils/sleepUtils';
import { getDurationInMinutes } from '@/utils/dateUtils';

class SleepService {
  /**
   * Start a new sleep session
   */
  async startSession(userId: UUID): Promise<SleepSession> {
    const session: SleepSession = {
      id: uuidv4(),
      userId,
      startAt: new Date().toISOString(),
    };

    await storageService.createSleepSession(session);
    console.log('✅ Sleep session started:', session.id);
    
    return session;
  }

  /**
   * End an active sleep session
   */
  async endSession(sessionId: UUID): Promise<SleepSession> {
    const session = await storageService.getSleepSession(sessionId);
    
    if (!session) {
      throw new Error('Sleep session not found');
    }

    if (session.endAt) {
      throw new Error('Sleep session already ended');
    }

    const endAt = new Date().toISOString();
    const durationMin = getDurationInMinutes(session.startAt, endAt);

    await storageService.updateSleepSession(sessionId, {
      endAt,
      durationMin,
    });

    const updatedSession = await storageService.getSleepSession(sessionId);
    if (!updatedSession) {
      throw new Error('Failed to retrieve updated session');
    }

    // Evaluate the session to fill in stages and score
    const evaluatedSession = await this.evaluateSession(updatedSession);
    
    console.log('✅ Sleep session ended:', sessionId);
    return evaluatedSession;
  }

  /**
   * Evaluate a completed sleep session
   * Fills in sleep stages and calculates sleep score
   */
  async evaluateSession(session: SleepSession): Promise<SleepSession> {
    if (!session.durationMin) {
      throw new Error('Cannot evaluate session without duration');
    }

    // Estimate sleep stages using our simulation algorithm
    const stages = estimateSleepStages(session.durationMin);

    // Get user profile for sleep score calculation
    const userProfile = await storageService.getUserProfile(session.userId);
    const sleepGoalHours = userProfile?.sleepGoalHours || 8;
    const caffeineHabits = userProfile?.caffeineHabits || 'moderate';

    // Calculate sleep score
    const sleepScore = calculateSleepScore(session, sleepGoalHours, caffeineHabits);

    // Simulate awake count and sleep latency based on sleep quality
    const awakeCount = sleepScore > 80 ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 5) + 2;
    const sleepLatency = sleepScore > 80 ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 30) + 20;

    // Update session with evaluation results
    await storageService.updateSleepSession(session.id, {
      stages,
      sleepScore,
      awakeCount,
      sleepLatency,
    });

    const evaluatedSession = await storageService.getSleepSession(session.id);
    if (!evaluatedSession) {
      throw new Error('Failed to retrieve evaluated session');
    }

    // Calculate and save sleep debt for this session
    await this.updateSleepDebt(session.userId, session.startAt.split('T')[0], session.durationMin);

    console.log('✅ Session evaluated - Score:', sleepScore);
    return evaluatedSession;
  }

  /**
   * Get recent sleep sessions for a user
   */
  async getRecentSessions(userId: UUID, count: number = 30): Promise<SleepSession[]> {
    return await storageService.getRecentSessions(userId, count);
  }

  /**
   * Get sessions within a date range
   */
  async getSessionsInRange(
    userId: UUID,
    startDate: string,
    endDate: string
  ): Promise<SleepSession[]> {
    return await storageService.getSessionsInRange(userId, startDate, endDate);
  }

  /**
   * Get active (ongoing) session for a user
   */
  async getActiveSession(userId: UUID): Promise<SleepSession | null> {
    const recentSessions = await storageService.getRecentSessions(userId, 5);
    const activeSession = recentSessions.find((session) => !session.endAt);
    return activeSession || null;
  }

  /**
   * Update sleep debt record
   */
  private async updateSleepDebt(userId: UUID, date: string, actualMinutes: number): Promise<void> {
    const userProfile = await storageService.getUserProfile(userId);
    const idealHours = userProfile?.sleepGoalHours || 8;
    const actualHours = actualMinutes / 60;
    const debtHours = Math.max(0, idealHours - actualHours);

    await storageService.saveSleepDebtRecord({
      date,
      idealHours,
      actualHours,
      debtHours,
    });
  }

  /**
   * Get sleep insights for a user
   */
  async getSleepInsights(userId: UUID, days: number = 7) {
    const sessions = await this.getRecentSessions(userId, days);
    const debtRecords = await storageService.getSleepDebtRecords(days);
    const userProfile = await storageService.getUserProfile(userId);
    const sleepGoal = userProfile?.sleepGoalHours || 8;

    return generateInsights(sessions, debtRecords, sleepGoal);
  }

  /**
   * Get sleep statistics
   */
  async getSleepStats(userId: UUID, days: number = 7) {
    const sessions = await this.getRecentSessions(userId, days);
    const completedSessions = sessions.filter(s => s.endAt && s.durationMin);

    if (completedSessions.length === 0) {
      return {
        averageDuration: 0,
        averageScore: 0,
        totalSessions: 0,
        consistency: 0,
      };
    }

    const avgDuration = completedSessions.reduce((sum, s) => sum + (s.durationMin || 0), 0) / completedSessions.length;
    const avgScore = completedSessions.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / completedSessions.length;

    // Calculate consistency (variance in bedtimes)
    const bedtimes = completedSessions.map(s => {
      const date = new Date(s.startAt);
      return date.getHours() + date.getMinutes() / 60;
    });
    const avgBedtime = bedtimes.reduce((sum, t) => sum + t, 0) / bedtimes.length;
    const variance = bedtimes.reduce((sum, t) => sum + Math.pow(t - avgBedtime, 2), 0) / bedtimes.length;
    const consistency = Math.max(0, 100 - variance * 10); // Lower variance = higher consistency

    return {
      averageDuration: Math.round(avgDuration),
      averageScore: Math.round(avgScore),
      totalSessions: completedSessions.length,
      consistency: Math.round(consistency),
    };
  }
}

export const sleepService = new SleepService();
export default sleepService;

