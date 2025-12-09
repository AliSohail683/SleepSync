/**
 * Sleep Detection Engine
 * Real-time algorithm to estimate sleep/wake states and sleep stages
 */

import { SensorDataChunk, MovementIntensity } from '../../types/sensors';
import { classifyMovementIntensity, standardDeviation } from '../../utils/sensorMath';
import { StageClassifier } from './StageClassifier';
import { MovementAnalyzer } from './MovementAnalyzer';
import { AudioAnalyzer } from './AudioAnalyzer';

export interface SleepState {
  isAsleep: boolean;
  confidence: number; // 0-1
  stage?: 'light' | 'deep' | 'rem' | 'awake';
  timestamp: number;
}

export interface DetectionResult {
  state: SleepState;
  movementIntensity: MovementIntensity;
  disturbances: number;
  snoringDetected: boolean;
}

class SleepDetector {
  private stageClassifier: StageClassifier;
  private movementAnalyzer: MovementAnalyzer;
  private audioAnalyzer: AudioAnalyzer;
  private recentChunks: SensorDataChunk[] = [];
  private windowSize = 30; // 30 chunks = ~3 seconds at 10Hz
  private sleepThreshold = 0.3; // Movement threshold for sleep detection
  private awakeThreshold = 0.8; // Movement threshold for wake detection
  private consecutiveSleepCount = 0;
  private consecutiveAwakeCount = 0;
  private isAsleep = false;

  constructor() {
    this.stageClassifier = new StageClassifier();
    this.movementAnalyzer = new MovementAnalyzer();
    this.audioAnalyzer = new AudioAnalyzer();
  }

  /**
   * Process sensor chunk and detect sleep state
   */
  processChunk(chunk: SensorDataChunk): DetectionResult {
    // Add to recent chunks buffer
    this.recentChunks.push(chunk);
    if (this.recentChunks.length > this.windowSize) {
      this.recentChunks.shift();
    }

    // Analyze movement
    const movementIntensity = this.analyzeMovement();
    const movementData = this.movementAnalyzer.analyze(this.recentChunks);

    // Analyze audio
    const audioData = this.audioAnalyzer.analyze(this.recentChunks);
    const snoringDetected = audioData.isSnoring;

    // Detect sleep/wake state
    const state = this.detectSleepWake(movementIntensity, movementData);

    // Classify sleep stage if asleep
    if (state.isAsleep && state.confidence > 0.7) {
      state.stage = this.stageClassifier.classify(
        movementIntensity,
        audioData,
        this.recentChunks
      );
    } else {
      state.stage = 'awake';
    }

    // Count disturbances
    const disturbances = this.countDisturbances(movementData, audioData);

    return {
      state,
      movementIntensity,
      disturbances,
      snoringDetected,
    };
  }

  /**
   * Analyze movement from recent chunks
   */
  private analyzeMovement(): MovementIntensity {
    const accelerometerData = this.recentChunks
      .filter((c) => c.accelerometer)
      .map((c) => c.accelerometer!);

    if (accelerometerData.length === 0) {
      return { level: 'none', magnitude: 0, timestamp: Date.now() };
    }

    return classifyMovementIntensity(accelerometerData, {
      low: 0.1,
      medium: 0.5,
      high: 1.5,
    });
  }

  /**
   * Detect sleep/wake state
   */
  private detectSleepWake(
    movementIntensity: MovementIntensity,
    _movementData: any
  ): SleepState {
    const magnitude = movementIntensity.magnitude;
    const isLowMovement = magnitude < this.sleepThreshold;
    const isHighMovement = magnitude > this.awakeThreshold;

    // State machine for sleep/wake detection
    if (isLowMovement) {
      this.consecutiveSleepCount++;
      this.consecutiveAwakeCount = 0;
    } else if (isHighMovement) {
      this.consecutiveAwakeCount++;
      this.consecutiveSleepCount = 0;
    }

    // Require 3 consecutive low-movement windows to enter sleep
    if (this.consecutiveSleepCount >= 3 && !this.isAsleep) {
      this.isAsleep = true;
      console.log('🌙 Entered sleep state');
    }

    // Require 2 consecutive high-movement windows to wake
    if (this.consecutiveAwakeCount >= 2 && this.isAsleep) {
      this.isAsleep = false;
      console.log('☀️ Entered wake state');
    }

    // Calculate confidence based on movement variance
    const magnitudes = this.recentChunks
      .filter((c) => c.accelerometer)
      .map((c) => {
        const accel = c.accelerometer!;
        return Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);
      });

    const variance = standardDeviation(magnitudes);
    const confidence = Math.max(0, Math.min(1, 1 - variance));

    return {
      isAsleep: this.isAsleep,
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Count disturbances
   */
  private countDisturbances(movementData: any, audioData: any): number {
    let count = 0;

    // Movement disturbances
    if (movementData.hasSignificantMovement) {
      count++;
    }

    // Audio disturbances
    if (audioData.hasHighNoise) {
      count++;
    }

    // Light disturbances
    const lightData = this.recentChunks
      .filter((c) => c.light)
      .map((c) => c.light!.lux);
    if (lightData.length > 0) {
      const avgLight = lightData.reduce((sum, l) => sum + l, 0) / lightData.length;
      if (avgLight > 10) {
        count++;
      }
    }

    return count;
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.recentChunks = [];
    this.consecutiveSleepCount = 0;
    this.consecutiveAwakeCount = 0;
    this.isAsleep = false;
  }

  /**
   * Get current sleep state
   */
  getCurrentState(): SleepState {
    return {
      isAsleep: this.isAsleep,
      confidence: 0.5,
      timestamp: Date.now(),
    };
  }
}

export const sleepDetector = new SleepDetector();
export default sleepDetector;

