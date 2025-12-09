/**
 * Sensor Manager
 * Main coordinator for all sensor modules
 */

import { AccelerometerSensor } from './AccelerometerSensor';
import { GyroscopeSensor } from './GyroscopeSensor';
import { MicrophoneSensor } from './MicrophoneSensor';
import { LightSensor } from './LightSensor';
import { SensorConfig, SensorDataChunk, MovementIntensity, DisturbanceEvent } from '../../types/sensors';
import { v4 as uuidv4 } from 'uuid';

class SensorManager {
  private accelerometer: AccelerometerSensor;
  private gyroscope: GyroscopeSensor;
  private microphone: MicrophoneSensor;
  private light: LightSensor;
  private config: SensorConfig;
  private isRunning = false;
  private dataBuffer: SensorDataChunk[] = [];
  private bufferSize = 100; // Buffer 100 chunks before flushing
  private onDataCallback?: (chunk: SensorDataChunk) => void;
  private onDisturbanceCallback?: (event: DisturbanceEvent) => void;

  constructor(config?: Partial<SensorConfig>) {
    this.config = {
      accelerometer: {
        enabled: true,
        updateInterval: 100, // 100ms = 10Hz
        ...config?.accelerometer,
      },
      gyroscope: {
        enabled: true,
        updateInterval: 100,
        ...config?.gyroscope,
      },
      microphone: {
        enabled: true,
        updateInterval: 500, // 500ms = 2Hz
        sensitivity: 0.5,
        ...config?.microphone,
      },
      light: {
        enabled: true,
        updateInterval: 1000, // 1 second
        ...config?.light,
      },
    };

    this.accelerometer = new AccelerometerSensor(this.config.accelerometer);
    this.gyroscope = new GyroscopeSensor(this.config.gyroscope);
    this.microphone = new MicrophoneSensor(this.config.microphone);
    this.light = new LightSensor(this.config.light);
  }

  /**
   * Start sensor monitoring
   */
  async start(sessionId: string): Promise<void> {
    if (this.isRunning) {
      console.warn('Sensor manager already running');
      return;
    }

    try {
      if (this.config.accelerometer.enabled) {
        await this.accelerometer.start((data) => {
          this.handleAccelerometerData(sessionId, data);
        });
      }

      if (this.config.gyroscope.enabled) {
        await this.gyroscope.start((data) => {
          this.handleGyroscopeData(sessionId, data);
        });
      }

      if (this.config.microphone.enabled) {
        await this.microphone.start((data) => {
          this.handleMicrophoneData(sessionId, data);
        });
      }

      if (this.config.light.enabled) {
        await this.light.start((data) => {
          this.handleLightData(sessionId, data);
        });
      }

      this.isRunning = true;
      console.log('✅ Sensor manager started');
    } catch (error) {
      console.error('Failed to start sensor manager:', error);
      throw error;
    }
  }

  /**
   * Stop sensor monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.accelerometer.stop();
      await this.gyroscope.stop();
      await this.microphone.stop();
      await this.light.stop();

      // Flush remaining buffer
      await this.flushBuffer();

      this.isRunning = false;
      console.log('✅ Sensor manager stopped');
    } catch (error) {
      console.error('Failed to stop sensor manager:', error);
      throw error;
    }
  }

  /**
   * Handle accelerometer data
   */
  private handleAccelerometerData(sessionId: string, data: any): void {
    const chunk: SensorDataChunk = {
      id: uuidv4(),
      sessionId,
      timestamp: Date.now(),
      accelerometer: {
        x: data.x,
        y: data.y,
        z: data.z,
        timestamp: Date.now(),
      },
    };

    this.processChunk(chunk);
  }

  /**
   * Handle gyroscope data
   */
  private handleGyroscopeData(sessionId: string, data: any): void {
    // Merge with existing chunk or create new
    const existingChunk = this.dataBuffer[this.dataBuffer.length - 1];
    if (existingChunk && Date.now() - existingChunk.timestamp < 50) {
      existingChunk.gyroscope = {
        x: data.x,
        y: data.y,
        z: data.z,
        timestamp: Date.now(),
      };
    } else {
      const chunk: SensorDataChunk = {
        id: uuidv4(),
        sessionId,
        timestamp: Date.now(),
        gyroscope: {
          x: data.x,
          y: data.y,
          z: data.z,
          timestamp: Date.now(),
        },
      };
      this.processChunk(chunk);
    }
  }

  /**
   * Handle microphone data
   */
  private handleMicrophoneData(sessionId: string, data: any): void {
    const chunk: SensorDataChunk = {
      id: uuidv4(),
      sessionId,
      timestamp: Date.now(),
      audio: {
        decibel: data.decibel || 0,
        frequency: data.frequency || 0,
        timestamp: Date.now(),
        isSnoring: data.isSnoring || false,
      },
    };

    this.processChunk(chunk);

    // Check for disturbances
    if (data.decibel > 60) {
      this.detectDisturbance('sound', data.decibel);
    }
  }

  /**
   * Handle light sensor data
   */
  private handleLightData(sessionId: string, data: any): void {
    const chunk: SensorDataChunk = {
      id: uuidv4(),
      sessionId,
      timestamp: Date.now(),
      light: {
        lux: data.lux || 0,
        timestamp: Date.now(),
      },
    };

    this.processChunk(chunk);

    // Check for light disturbances
    if (data.lux > 10) {
      this.detectDisturbance('light', data.lux);
    }
  }

  /**
   * Process sensor chunk
   */
  private processChunk(chunk: SensorDataChunk): void {
    this.dataBuffer.push(chunk);

    // Notify callback
    if (this.onDataCallback) {
      this.onDataCallback(chunk);
    }

    // Flush buffer if full
    if (this.dataBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Flush data buffer to storage
   */
  private async flushBuffer(): Promise<void> {
    if (this.dataBuffer.length === 0) return;

    const chunks = [...this.dataBuffer];
    this.dataBuffer = [];

    // Save to storage (will be implemented with repository)
    // await sensorDataRepository.saveChunks(chunks);
    console.log(`Flushed ${chunks.length} sensor chunks`);
  }

  /**
   * Detect disturbance event
   */
  private detectDisturbance(type: 'movement' | 'sound' | 'light' | 'unknown', value: number): void {
    const severity: 'low' | 'medium' | 'high' =
      type === 'sound'
        ? value > 70
          ? 'high'
          : value > 50
          ? 'medium'
          : 'low'
        : type === 'light'
        ? value > 50
          ? 'high'
          : value > 20
          ? 'medium'
          : 'low'
        : 'medium';

    const event: DisturbanceEvent = {
      type,
      severity,
      timestamp: Date.now(),
      data: { value },
    };

    if (this.onDisturbanceCallback) {
      this.onDisturbanceCallback(event);
    }
  }

  /**
   * Set data callback
   */
  onData(callback: (chunk: SensorDataChunk) => void): void {
    this.onDataCallback = callback;
  }

  /**
   * Set disturbance callback
   */
  onDisturbance(callback: (event: DisturbanceEvent) => void): void {
    this.onDisturbanceCallback = callback;
  }

  /**
   * Get current movement intensity
   */
  async getMovementIntensity(): Promise<MovementIntensity> {
    // Get recent accelerometer data and classify
    const recentData = this.dataBuffer
      .filter((c) => c.accelerometer && Date.now() - c.timestamp < 5000)
      .map((c) => c.accelerometer!);

    if (recentData.length === 0) {
      return { level: 'none', magnitude: 0, timestamp: Date.now() };
    }

    // Calculate average magnitude
    const { classifyMovementIntensity } = require('../../utils/sensorMath');
    return classifyMovementIntensity(recentData);
  }

  /**
   * Check if sensors are running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

export const sensorManager = new SensorManager();
export default sensorManager;

