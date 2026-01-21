/**
 * Sleep Service
 * Manages sleep sessions and sleep tracking logic
 */

import { v4 as uuidv4 } from 'uuid';
import { SleepSession, UUID } from '../models';
import { storageService } from './storageService';
import {
  calculateSleepScore,
  estimateSleepStages,
  generateInsights,
} from '../utils/sleepUtils';
import { sleepScorer } from '../engines/sleepScore/SleepScorer';
import { insightsGenerator } from '../engines/insights/InsightsGenerator';
import { SleepSessionEnhanced } from '../types/sleep';
import { getDurationInMinutes } from '../utils/dateUtils';
import { backgroundTrackingService } from '../system/background/BackgroundTrackingService';
import { sensorDataProcessor } from './SensorDataProcessor';
import { sensorDataRepository } from '../storage/sqlite/repositories/SensorDataRepository';
import { sleepDetector } from '../engines/sleepDetection/SleepDetector';

class SleepService {
  /**
   * Start a new sleep session
   */
  async startSession(userId: UUID): Promise<SleepSession> {
    try {
      // Ensure database is initialized
      if (!storageService.isInitialized()) {
        await storageService.setupDB();
      }

      const session: SleepSession = {
        id: uuidv4(),
        userId,
        startAt: new Date().toISOString(),
      };

      // Create session in database first
      await storageService.createSleepSession(session);
      
      // Start background tracking (non-blocking)
      // Don't wait for it - if it fails, session is still created
      backgroundTrackingService.startTracking(session.id, userId).catch((error) => {
        console.warn('Background tracking failed (non-critical):', error);
        // Session is still valid without background tracking
      });
      
      console.log('✅ Sleep session started:', session.id);
      
      return session;
    } catch (error: any) {
      console.error('❌ Failed to start sleep session:', error);
      throw new Error(`Failed to start sleep session: ${error?.message || 'Unknown error'}`);
    }
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

    // Ensure duration is calculated and valid
    if (!durationMin || durationMin <= 0) {
      throw new Error('Invalid session duration. Session must be at least 1 minute long.');
    }

    await storageService.updateSleepSession(sessionId, {
      endAt,
      durationMin,
    });

    const updatedSession = await storageService.getSleepSession(sessionId);
    if (!updatedSession) {
      throw new Error('Failed to retrieve updated session');
    }

    // Ensure updatedSession has durationMin before evaluation
    if (!updatedSession.durationMin) {
      // If durationMin wasn't saved, set it directly on the session object
      updatedSession.durationMin = durationMin;
    }

    // Process any unprocessed raw sensor data before evaluation
    // This ensures all background-collected data is converted to chunks for analysis
    try {
      const needsProcessing = await sensorDataProcessor.needsProcessing(sessionId);
      if (needsProcessing) {
        console.log('📊 Processing raw sensor data before session evaluation...');
        const processed = await sensorDataProcessor.processSessionData(sessionId);
        if (processed > 0) {
          console.log(`✅ Processed ${processed} raw sensor data points before evaluation`);
        }
      }
    } catch (error) {
      console.warn('Failed to process raw sensor data before evaluation:', error);
      // Continue with evaluation even if processing fails - we can use fallback data
    }

    // Evaluate the session to fill in stages and score
    const evaluatedSession = await this.evaluateSession(updatedSession);
    
    // Calculate enhanced sleep score using new engine
    try {
      const scoreBreakdown = await sleepScorer.calculateScore(
        evaluatedSession as SleepSessionEnhanced,
        evaluatedSession.userId
      );
      
      // Update session with enhanced score
      await storageService.updateSleepSession(sessionId, {
        sleepScore: scoreBreakdown.total,
      });
    } catch (error) {
      console.error('Failed to calculate enhanced sleep score:', error);
    }
    
    // Stop background tracking
    try {
      await backgroundTrackingService.stopTracking();
    } catch (error) {
      console.warn('Failed to stop background tracking:', error);
    }
    
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

    // Get sleep stages from sleep detection engine (real sensor data)
    // Process sensor chunks through sleep detection engine
    let stages;
    try {
      // Load sensor data chunks for this session
      const chunks = await sensorDataRepository.getChunksForSession(session.id);
      
      if (chunks.length > 0) {
        console.log(`📊 Processing ${chunks.length} sensor chunks through sleep detection engine`);
        
        // Reset detector for new session
        sleepDetector.reset();
        
        // Process all chunks through sleep detector
        const stageCounts = {
          light: 0,
          deep: 0,
          rem: 0,
          awake: 0,
        };
        
        let totalProcessed = 0;
        let awakeEvents = 0;
        let previousState: 'asleep' | 'awake' = 'awake';
        let sleepOnsetTime: number | null = null;
        const sessionStartTime = new Date(session.startAt).getTime();
        
        for (const chunk of chunks) {
          try {
            const detection = sleepDetector.processChunk(chunk);
            if (detection.state.stage) {
              stageCounts[detection.state.stage]++;
              totalProcessed++;
            }
            
            // Track sleep onset (first time we enter sleep state)
            if (detection.state.isAsleep && previousState === 'awake' && sleepOnsetTime === null) {
              sleepOnsetTime = chunk.timestamp;
            }
            
            // Count awake events (transitions from asleep to awake)
            if (!detection.state.isAsleep && previousState === 'asleep') {
              awakeEvents++;
            }
            
            previousState = detection.state.isAsleep ? 'asleep' : 'awake';
          } catch (error) {
            console.warn('Failed to process chunk:', error);
            // Continue with next chunk
          }
        }
        
        if (totalProcessed > 0) {
          // Calculate percentages
          const lightPercent = stageCounts.light / totalProcessed;
          const deepPercent = stageCounts.deep / totalProcessed;
          const remPercent = stageCounts.rem / totalProcessed;
          
          // Convert to hours based on actual session duration
          const sessionHours = session.durationMin / 60;
          
          stages = {
            light: sessionHours * lightPercent,
            deep: sessionHours * deepPercent,
            rem: sessionHours * remPercent,
          };
          
          // Calculate sleep latency (time to fall asleep in minutes)
          let sleepLatency = 0;
          if (sleepOnsetTime) {
            const latencyMs = sleepOnsetTime - sessionStartTime;
            sleepLatency = Math.max(0, latencyMs / (1000 * 60)); // Convert to minutes
          }
          
          // Update session with calculated metrics
          await storageService.updateSleepSession(session.id, {
            awakeCount: awakeEvents,
            sleepLatency: sleepLatency > 0 ? sleepLatency : undefined,
          });
          
          console.log(`✅ Calculated stages from ${totalProcessed} processed chunks:`, stages);
          console.log(`✅ Awake events: ${awakeEvents}, Sleep latency: ${sleepLatency.toFixed(1)} min`);
        } else {
          throw new Error('No chunks processed successfully');
        }
      } else {
        throw new Error('No sensor chunks found');
      }
    } catch (error) {
      console.warn('⚠️ Failed to calculate stages from sensor data:', error);
      console.warn('⚠️ Using fallback estimation');
      // Fallback to estimation if sensor data processing fails
      stages = estimateSleepStages(session.durationMin);
    }

    // Get user profile for sleep score calculation
    const userProfile = await storageService.getUserProfile(session.userId);
    const sleepGoalHours = userProfile?.sleepGoalHours || 8;
    const caffeineHabits = userProfile?.caffeineHabits || 'moderate';

    // Calculate sleep score
    const sleepScore = calculateSleepScore(session, sleepGoalHours, caffeineHabits);

    // Awake count and sleep latency are now calculated during stage processing above
    // Get the updated values from the session
    const updatedSessionForMetrics = await storageService.getSleepSession(session.id);
    const awakeCount = updatedSessionForMetrics?.awakeCount || 0;
    const sleepLatency = updatedSessionForMetrics?.sleepLatency || 0;

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
    
    // If active session found, recover background tracking (non-blocking with timeout)
    if (activeSession) {
      // Don't await - let recovery happen in background to prevent blocking
      Promise.race([
        backgroundTrackingService.recoverTracking(activeSession),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Recovery timeout')), 8000)
        )
      ]).catch((error) => {
        console.warn('Failed to recover background tracking:', error);
      });
    }
    
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

