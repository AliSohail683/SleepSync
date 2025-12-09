/**
 * Movement Analyzer
 * Analyzes movement patterns for sleep detection
 */

import { SensorDataChunk } from '../../types/sensors';
import { calculateAccelerometerMagnitude, movingAverage, detectPeaks } from '../../utils/sensorMath';

export class MovementAnalyzer {
  /**
   * Analyze movement patterns
   */
  analyze(chunks: SensorDataChunk[]): {
    hasSignificantMovement: boolean;
    averageMagnitude: number;
    peakCount: number;
    movementVariance: number;
  } {
    const accelerometerData = chunks
      .filter((c) => c.accelerometer)
      .map((c) => c.accelerometer!);

    if (accelerometerData.length === 0) {
      return {
        hasSignificantMovement: false,
        averageMagnitude: 0,
        peakCount: 0,
        movementVariance: 0,
      };
    }

    const magnitudes = accelerometerData.map(calculateAccelerometerMagnitude);
    const smoothed = movingAverage(magnitudes, 5);
    const avgMagnitude = magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length;

    // Detect peaks (movements)
    const peaks = detectPeaks(smoothed, avgMagnitude * 1.5, 5);

    // Calculate variance
    const variance = this.calculateVariance(magnitudes);

    return {
      hasSignificantMovement: avgMagnitude > 0.5 || peaks.length > 3,
      averageMagnitude: avgMagnitude,
      peakCount: peaks.length,
      movementVariance: variance,
    };
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

