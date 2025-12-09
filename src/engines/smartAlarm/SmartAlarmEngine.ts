/**
 * Smart Alarm Engine
 * Predicts optimal wake window and monitors for light sleep
 */

import { AlarmConfig } from '../../models';
import { sleepDetector } from '../sleepDetection/SleepDetector';
import { sensorManager } from '../../modules/sensors/SensorManager';
import { calculateOptimalWakeWindow } from '../../utils/circadian';
import { baselineRepository } from '../../storage/sqlite/repositories/BaselineRepository';

class SmartAlarmEngine {
  private activeAlarm: AlarmConfig | null = null;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private onAlarmTrigger?: () => void;

  /**
   * Set smart alarm
   */
  async setAlarm(alarm: AlarmConfig, onTrigger: () => void): Promise<void> {
    this.activeAlarm = alarm;
    this.onAlarmTrigger = onTrigger;

    if (!alarm.enabled) {
      await this.cancelAlarm();
      return;
    }

    // Calculate optimal wake window
    const baseline = await baselineRepository.getBaseline(alarm.userId);
    const bedtime = baseline?.averageBedtime || '22:00';
    const sleepDuration = baseline?.averageDuration || 8;

    // Calculate optimal wake window (used for prediction)
    calculateOptimalWakeWindow(bedtime, sleepDuration);

    // Parse target window
    const [targetStartHours, targetStartMins] = alarm.targetWindowStart
      .split(':')
      .map(Number);
    const targetStartMinutes = targetStartHours * 60 + targetStartMins;

    // Start monitoring 30-45 minutes before target window
    const monitoringStart = targetStartMinutes - 45;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentMinutes >= monitoringStart) {
      // Start monitoring immediately
      await this.startMonitoring();
    } else {
      // Schedule monitoring
      const delay = (monitoringStart - currentMinutes) * 60 * 1000;
      setTimeout(() => {
        this.startMonitoring();
      }, delay);
    }
  }

  /**
   * Start monitoring for light sleep window
   */
  private async startMonitoring(): Promise<void> {
    if (this.isMonitoring || !this.activeAlarm) return;

    this.isMonitoring = true;
    console.log('🔔 Smart alarm monitoring started');

    // Start sensors if not already running
    if (!sensorManager.isActive() && this.activeAlarm) {
      // Note: In production, would need session ID
      // For now, monitor without full session
    }

    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkWakeWindow();
    }, 30000); // 30 seconds
  }

  /**
   * Check if we're in optimal wake window
   */
  private checkWakeWindow(): void {
    if (!this.activeAlarm) return;

    const state = sleepDetector.getCurrentState();

    // Check if in target window
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [targetStartHours, targetStartMins] = this.activeAlarm.targetWindowStart
      .split(':')
      .map(Number);
    const [targetEndHours, targetEndMins] = this.activeAlarm.targetWindowEnd
      .split(':')
      .map(Number);

    const targetStart = targetStartHours * 60 + targetStartMins;
    const targetEnd = targetEndHours * 60 + targetEndMins;

    const inWindow = currentMinutes >= targetStart && currentMinutes <= targetEnd;

    // Trigger if in window and in light sleep
    if (inWindow && !state.isAsleep && state.confidence > 0.7) {
      this.triggerAlarm();
    }

    // Fallback: trigger at end of window if not triggered yet
    if (currentMinutes >= targetEnd && this.isMonitoring) {
      this.triggerAlarm();
    }
  }

  /**
   * Trigger alarm
   */
  private triggerAlarm(): void {
    if (!this.activeAlarm) return;

    console.log('🔔 Smart alarm triggered');
    this.stopMonitoring();

    if (this.onAlarmTrigger) {
      this.onAlarmTrigger();
    }
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
  }

  /**
   * Cancel alarm
   */
  async cancelAlarm(): Promise<void> {
    this.stopMonitoring();
    this.activeAlarm = null;
    this.onAlarmTrigger = undefined;
    console.log('🔔 Smart alarm cancelled');
  }

  /**
   * Check if alarm is active
   */
  isActive(): boolean {
    return this.isMonitoring && this.activeAlarm !== null;
  }
}

export const smartAlarmEngine = new SmartAlarmEngine();
export default smartAlarmEngine;

