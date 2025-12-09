/**
 * Sleep Stage Classifier
 * Classifies sleep into light, deep, REM stages
 */

import { MovementIntensity } from '../../types/sensors';
import { SensorDataChunk } from '../../types/sensors';

interface AudioAnalysis {
  isSnoring: boolean;
  noiseLevel: number;
  hasHighNoise: boolean;
}

export class StageClassifier {
  /**
   * Classify sleep stage based on sensor data
   */
  classify(
    movementIntensity: MovementIntensity,
    audioData: AudioAnalysis,
    chunks: SensorDataChunk[]
  ): 'light' | 'deep' | 'rem' | 'awake' {
    // Deep sleep: very low movement, no eye movement (gyroscope), regular breathing
    if (
      movementIntensity.level === 'none' &&
      !this.hasEyeMovement(chunks) &&
      !audioData.isSnoring
    ) {
      return 'deep';
    }

    // REM sleep: low movement but eye movement detected, irregular breathing
    if (
      movementIntensity.level === 'low' &&
      this.hasEyeMovement(chunks) &&
      audioData.isSnoring
    ) {
      return 'rem';
    }

    // Light sleep: moderate movement, some disturbances
    if (movementIntensity.level === 'low' || movementIntensity.level === 'medium') {
      return 'light';
    }

    // Default to light sleep
    return 'light';
  }

  /**
   * Detect eye movement from gyroscope data
   */
  private hasEyeMovement(chunks: SensorDataChunk[]): boolean {
    const gyroData = chunks
      .filter((c) => c.gyroscope)
      .map((c) => c.gyroscope!);

    if (gyroData.length < 5) return false;

    // Check for rapid small movements (characteristic of REM)
    const movements = gyroData.map((g) => Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z));
    const variance = this.calculateVariance(movements);

    // REM has higher variance in eye movements
    return variance > 0.01;
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

