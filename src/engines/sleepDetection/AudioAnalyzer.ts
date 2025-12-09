/**
 * Audio Analyzer
 * Analyzes audio data for snoring and disturbances
 */

import { SensorDataChunk } from '../../types/sensors';
import { detectSnoring, calculateNoiseLevel } from '../../utils/sensorMath';

export class AudioAnalyzer {
  /**
   * Analyze audio data
   */
  analyze(chunks: SensorDataChunk[]): {
    isSnoring: boolean;
    noiseLevel: number;
    hasHighNoise: boolean;
  } {
    const audioData = chunks
      .filter((c) => c.audio)
      .map((c) => c.audio!);

    if (audioData.length === 0) {
      return {
        isSnoring: false,
        noiseLevel: 0,
        hasHighNoise: false,
      };
    }

    const isSnoring = detectSnoring(audioData);
    const noiseLevel = calculateNoiseLevel(audioData);
    const hasHighNoise = noiseLevel > 50; // 50 dB threshold

    return {
      isSnoring,
      noiseLevel,
      hasHighNoise,
    };
  }
}

