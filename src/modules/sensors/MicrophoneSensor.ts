/**
 * Microphone Sensor Module
 * Handles audio data collection and snoring detection
 */

import { AudioData } from '../../types/sensors';
import { calculateNoiseLevel } from '../../utils/sensorMath';

interface MicrophoneConfig {
  enabled: boolean;
  updateInterval: number;
  sensitivity: number; // 0-1
}

class MicrophoneSensor {
  private config: MicrophoneConfig;
  private isActive = false;
  private audioBuffer: AudioData[] = [];
  private subscription?: any;

  constructor(config: MicrophoneConfig) {
    this.config = config;
  }

  /**
   * Start microphone monitoring
   * Uses native module for real audio data collection
   */
  async start(callback: (data: AudioData) => void): Promise<void> {
    if (this.isActive) {
      console.warn('Microphone already active');
      return;
    }

    if (!this.config.enabled) {
      console.log('Microphone disabled in config');
      return;
    }

    try {
      // Request microphone permission
      const { sensorBridge } = require('./native/SensorBridge');
      const hasPermission = await sensorBridge.requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission denied');
      }

      // Start native microphone monitoring
      await sensorBridge.startMicrophone(this.config.updateInterval);

      // Set up native event listener for audio data
      const eventEmitter = sensorBridge.getEventEmitter();
      if (!eventEmitter) {
        throw new Error('Event emitter not available');
      }

      const subscription = eventEmitter.addListener('AudioData', (data: any) => {
        const audioData: AudioData = {
          decibel: data.decibel,
          frequency: data.frequency,
          timestamp: Date.now(),
        };

        // Detect snoring using FFT analysis from native module
        audioData.isSnoring = data.isSnoring || this.detectSnoringPattern(audioData);

        this.audioBuffer.push(audioData);
        if (this.audioBuffer.length > 10) {
          this.audioBuffer.shift();
        }

        callback(audioData);
      });

      this.subscription = subscription;
      this.isActive = true;
      console.log('✅ Microphone started with native module');
    } catch (error) {
      console.error('Failed to start microphone:', error);
      throw error;
    }
  }

  /**
   * Stop microphone monitoring
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      const { sensorBridge } = require('./native/SensorBridge');
      await sensorBridge.stopMicrophone();

      if (this.subscription) {
        this.subscription.remove();
        this.subscription = undefined;
      }

      this.audioBuffer = [];
      this.isActive = false;
      console.log('✅ Microphone stopped');
    } catch (error) {
      console.error('Failed to stop microphone:', error);
      throw error;
    }
  }

  /**
   * Detect snoring pattern
   */
  private detectSnoringPattern(audioData: AudioData): boolean {
    // Simple snoring detection based on frequency and decibel
    // In production, would use FFT analysis
    return (
      audioData.frequency >= 200 &&
      audioData.frequency <= 400 &&
      audioData.decibel > 40
    );
  }

  /**
   * Get current noise level
   */
  getNoiseLevel(): number {
    if (this.audioBuffer.length === 0) return 0;
    return calculateNoiseLevel(this.audioBuffer);
  }

  /**
   * Check if microphone is active
   */
  isRunning(): boolean {
    return this.isActive;
  }
}

export { MicrophoneSensor };

