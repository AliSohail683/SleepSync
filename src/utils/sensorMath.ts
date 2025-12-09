/**
 * Sensor Math Utilities
 * Functions for processing and analyzing sensor data
 */

import { AccelerometerData, GyroscopeData, AudioData, MovementIntensity } from '../types/sensors';

/**
 * Calculate magnitude of accelerometer vector
 */
export function calculateAccelerometerMagnitude(data: AccelerometerData): number {
  return Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
}

/**
 * Calculate magnitude of gyroscope vector
 */
export function calculateGyroscopeMagnitude(data: GyroscopeData): number {
  return Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
}

/**
 * Classify movement intensity
 */
export function classifyMovementIntensity(
  accelerometerData: AccelerometerData[],
  threshold: { low: number; medium: number; high: number } = {
    low: 0.1,
    medium: 0.5,
    high: 1.5,
  }
): MovementIntensity {
  if (accelerometerData.length === 0) {
    return { level: 'none', magnitude: 0, timestamp: Date.now() };
  }

  // Calculate average magnitude
  const magnitudes = accelerometerData.map(calculateAccelerometerMagnitude);
  const avgMagnitude = magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length;

  let level: 'none' | 'low' | 'medium' | 'high';
  if (avgMagnitude < threshold.low) {
    level = 'none';
  } else if (avgMagnitude < threshold.medium) {
    level = 'low';
  } else if (avgMagnitude < threshold.high) {
    level = 'medium';
  } else {
    level = 'high';
  }

  return {
    level,
    magnitude: avgMagnitude,
    timestamp: accelerometerData[accelerometerData.length - 1].timestamp,
  };
}

/**
 * Apply moving average filter to sensor data
 */
export function movingAverage(values: number[], windowSize: number = 5): number[] {
  if (values.length === 0) return [];
  if (values.length < windowSize) return values;

  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
    const window = values.slice(start, end);
    const avg = window.reduce((sum, v) => sum + v, 0) / window.length;
    result.push(avg);
  }
  return result;
}

/**
 * Detect peaks in sensor data
 */
export function detectPeaks(
  values: number[],
  threshold: number,
  minDistance: number = 10
): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (
      values[i] > threshold &&
      values[i] > values[i - 1] &&
      values[i] > values[i + 1]
    ) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
        peaks.push(i);
      }
    }
  }
  return peaks;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Normalize sensor values to 0-1 range
 */
export function normalize(values: number[], min?: number, max?: number): number[] {
  const actualMin = min ?? Math.min(...values);
  const actualMax = max ?? Math.max(...values);
  const range = actualMax - actualMin;
  if (range === 0) return values.map(() => 0.5);

  return values.map((v) => (v - actualMin) / range);
}

/**
 * Detect snoring in audio data
 */
export function detectSnoring(
  audioData: AudioData[],
  frequencyThreshold: number = 200, // Hz
  decibelThreshold: number = 40 // dB
): boolean {
  if (audioData.length === 0) return false;

  const snoringSamples = audioData.filter(
    (sample) => sample.frequency >= frequencyThreshold && sample.decibel >= decibelThreshold
  );
  return snoringSamples.length > audioData.length * 0.1; // 10% of samples indicate snoring
}

/**
 * Calculate noise level from audio data
 */
export function calculateNoiseLevel(audioData: AudioData[]): number {
  if (audioData.length === 0) return 0;
  const avgDecibel = audioData.reduce((sum, a) => sum + a.decibel, 0) / audioData.length;
  return avgDecibel;
}

