/**
 * Sleep Session Recorder
 * Handles sleep session lifecycle and sensor data recording
 */

import { v4 as uuidv4 } from 'uuid';
import { UUID } from '../../models';
import { SensorDataChunk } from '../../types/sensors';
import { SleepSessionEnhanced, SleepStageSegment } from '../../types/sleep';
import { sensorDataRepository } from '../../storage/sqlite/repositories/SensorDataRepository';
import { storageService } from '../../services/storageService';
import { sleepDetector } from '../../engines/sleepDetection/SleepDetector';
import { sensorManager } from '../sensors/SensorManager';

class SessionRecorder {
  private currentSession: SleepSessionEnhanced | null = null;
  private sensorBuffer: SensorDataChunk[] = [];
  private stageSegments: SleepStageSegment[] = [];
  private currentStage: 'awake' | 'light' | 'deep' | 'rem' = 'awake';
  private currentStageStart: number = 0;
  private disturbances: Array<{ type: string; timestamp: number; severity: string }> = [];

  /**
   * Start a new sleep session
   */
  async startSession(userId: UUID): Promise<SleepSessionEnhanced> {
    if (this.currentSession) {
      throw new Error('Session already in progress');
    }

    const sessionId = uuidv4();
    const startAt = new Date().toISOString();

    const session: SleepSessionEnhanced = {
      id: sessionId,
      userId,
      startAt,
      baselineCalibrated: false,
    };

    this.currentSession = session;
    this.stageSegments = [];
    this.currentStage = 'awake';
    this.currentStageStart = Date.now();
    this.disturbances = [];
    this.sensorBuffer = [];

    // Start sensor monitoring
    await sensorManager.start(sessionId);

    // Set up sensor data callback
    sensorManager.onData((chunk) => {
      this.handleSensorData(chunk);
    });

    // Set up disturbance callback
    sensorManager.onDisturbance((event) => {
      this.handleDisturbance(event);
    });

    // Save initial session
    await storageService.createSleepSession({
      id: sessionId,
      userId,
      startAt,
    });

    console.log('✅ Sleep session started:', sessionId);
    return session;
  }

  /**
   * End current sleep session
   */
  async endSession(): Promise<SleepSessionEnhanced> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    // Stop sensors
    await sensorManager.stop();

    // Finalize current stage segment
    this.finalizeCurrentStage();

    const endAt = new Date().toISOString();
    const durationMin = Math.round(
      (Date.now() - new Date(this.currentSession.startAt).getTime()) / 60000
    );

    // Calculate sleep stages from segments
    const stages = this.calculateStagesFromSegments();

    // Update session
    await storageService.updateSleepSession(this.currentSession.id, {
      endAt,
      durationMin,
      stages,
      disturbances: this.disturbances,
    });

    // Flush sensor buffer
    await this.flushSensorBuffer();

    const updatedSession: SleepSessionEnhanced = {
      ...this.currentSession,
      endAt,
      durationMin,
      stages,
      stageSegments: [...this.stageSegments],
      disturbances: [...this.disturbances],
    };

    this.currentSession = null;
    console.log('✅ Sleep session ended:', updatedSession.id);

    return updatedSession;
  }

  /**
   * Handle sensor data chunk
   */
  private handleSensorData(chunk: SensorDataChunk): void {
    // Add to buffer
    this.sensorBuffer.push(chunk);

    // Process with sleep detector
    const detection = sleepDetector.processChunk(chunk);

    // Update stage if changed
    if (detection.state.stage && detection.state.stage !== this.currentStage) {
      this.finalizeCurrentStage();
      this.currentStage = detection.state.stage;
      this.currentStageStart = Date.now();
    }

    // Flush buffer periodically
    if (this.sensorBuffer.length >= 50) {
      this.flushSensorBuffer();
    }
  }

  /**
   * Handle disturbance event
   */
  private handleDisturbance(event: any): void {
    this.disturbances.push({
      type: event.type,
      timestamp: event.timestamp,
      severity: event.severity,
    });
  }

  /**
   * Finalize current stage segment
   */
  private finalizeCurrentStage(): void {
    if (this.currentStageStart > 0) {
      const duration = (Date.now() - this.currentStageStart) / 60000; // minutes
      this.stageSegments.push({
        stage: this.currentStage,
        startTime: this.currentStageStart,
        endTime: Date.now(),
        duration,
      });
    }
  }

  /**
   * Calculate total stage durations from segments
   */
  private calculateStagesFromSegments(): {
    light: number;
    deep: number;
    rem: number;
  } {
    const stages = { light: 0, deep: 0, rem: 0 };

    this.stageSegments.forEach((segment) => {
      if (segment.stage === 'light') {
        stages.light += segment.duration;
      } else if (segment.stage === 'deep') {
        stages.deep += segment.duration;
      } else if (segment.stage === 'rem') {
        stages.rem += segment.duration;
      }
    });

    return stages;
  }

  /**
   * Flush sensor buffer to storage
   */
  private async flushSensorBuffer(): Promise<void> {
    if (this.sensorBuffer.length === 0 || !this.currentSession) return;

    try {
      await sensorDataRepository.saveChunks(this.sensorBuffer);
      this.sensorBuffer = [];
    } catch (error) {
      console.error('Failed to flush sensor buffer:', error);
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): SleepSessionEnhanced | null {
    return this.currentSession;
  }

  /**
   * Auto-detect session end (when user wakes up)
   */
  async autoDetectEnd(): Promise<SleepSessionEnhanced | null> {
    if (!this.currentSession) return null;

    // Check if user has been awake for 5+ minutes
    const recentDetections = sleepDetector.getCurrentState();
    if (!recentDetections.isAsleep) {
      // Wait a bit to confirm wake state
      await new Promise((resolve) => setTimeout(resolve, 60000)); // 1 minute

      const confirmedState = sleepDetector.getCurrentState();
      if (!confirmedState.isAsleep) {
        return await this.endSession();
      }
    }

    return null;
  }
}

export const sessionRecorder = new SessionRecorder();
export default sessionRecorder;

