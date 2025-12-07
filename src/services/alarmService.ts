/**
 * Alarm Service
 * Manages smart alarms and wake scheduling
 */

import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import { AlarmConfig, UUID } from '@/models';
import { storageService } from './storageService';
import {
  computeWakeMoment,
  predictSleepStages,
  shouldAlarmTrigger,
  validateAlarmConfig,
} from '@/utils/alarmUtils';

// Configure push notification
PushNotification.configure({
  onRegister: function (token) {
    console.log('TOKEN:', token);
  },
  onNotification: function (notification) {
    console.log('NOTIFICATION:', notification);
  },
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },
  popInitialNotification: true,
  requestPermissions: Platform.OS === 'ios',
});

class AlarmService {
  private scheduledNotifications: Map<string, string> = new Map();

  /**
   * Initialize notification permissions
   */
  async initializeNotifications(): Promise<boolean> {
    return new Promise((resolve) => {
      PushNotification.checkPermissions((permissions) => {
        if (permissions.alert && permissions.sound) {
          console.log('✅ Notification permissions granted');
          resolve(true);
        } else {
          PushNotification.requestPermissions((newPermissions) => {
            if (newPermissions.alert && newPermissions.sound) {
              console.log('✅ Notification permissions granted');
              resolve(true);
            } else {
              console.warn('⚠️ Notification permissions not granted');
              resolve(false);
            }
          });
        }
      });
    });
  }

  /**
   * Schedule a smart alarm
   */
  async scheduleSmartAlarm(
    config: AlarmConfig,
    upcomingSleepDuration?: number
  ): Promise<string | null> {
    if (!config.enabled) {
      console.log('⏭️ Alarm is disabled, not scheduling');
      return null;
    }

    if (!validateAlarmConfig(config)) {
      throw new Error('Invalid alarm configuration');
    }

    const hasPermission = await this.initializeNotifications();
    if (!hasPermission) {
      throw new Error('Notification permissions not granted');
    }

    // Cancel existing alarm if any
    if (this.scheduledNotifications.has(config.id)) {
      await this.cancelAlarm(config.id);
    }

    // Predict sleep stages for upcoming session
    const now = new Date();
    const expectedDuration = upcomingSleepDuration || 8; // hours
    const predictedStages = predictSleepStages(now, expectedDuration);

    // Compute optimal wake moment
    const wakeTime = computeWakeMoment(
      config.targetWindowStart,
      config.targetWindowEnd,
      predictedStages
    );

    // Check if alarm should trigger today
    if (!shouldAlarmTrigger(config, wakeTime)) {
      console.log('⏭️ Alarm not scheduled for today');
      return null;
    }

    // Schedule the notification
    try {
      const notificationId = `${config.id}_${Date.now()}`;
      
      PushNotification.localNotificationSchedule({
        id: notificationId,
        title: '🌅 Time to Wake Up',
        message: config.gentleWake
          ? 'Good morning! You\'re in a light sleep phase.'
          : 'Good morning! Time to start your day.',
        date: wakeTime,
        soundName: config.gentleWake ? 'gentle-wake.mp3' : 'default',
        vibrate: config.vibrationEnabled,
        vibration: config.vibrationEnabled ? 300 : 0,
        playSound: true,
        userInfo: { alarmId: config.id },
      });

      this.scheduledNotifications.set(config.id, notificationId);
      console.log('✅ Smart alarm scheduled for:', wakeTime.toLocaleTimeString());
      
      return notificationId;
    } catch (error) {
      console.error('❌ Failed to schedule alarm:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled alarm
   */
  async cancelAlarm(alarmId: UUID): Promise<void> {
    const notificationId = this.scheduledNotifications.get(alarmId);
    
    if (notificationId) {
      try {
        PushNotification.cancelLocalNotifications({ id: notificationId });
        this.scheduledNotifications.delete(alarmId);
        console.log('✅ Alarm cancelled:', alarmId);
      } catch (error) {
        console.error('❌ Failed to cancel alarm:', error);
      }
    }
  }

  /**
   * Cancel all scheduled alarms
   */
  async cancelAllAlarms(): Promise<void> {
    try {
      PushNotification.cancelAllLocalNotifications();
      this.scheduledNotifications.clear();
      console.log('✅ All alarms cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel all alarms:', error);
    }
  }

  /**
   * Create a new alarm configuration
   */
  async createAlarm(alarm: AlarmConfig): Promise<AlarmConfig> {
    if (!validateAlarmConfig(alarm)) {
      throw new Error('Invalid alarm configuration');
    }

    await storageService.createAlarmConfig(alarm);
    
    // Schedule if enabled
    if (alarm.enabled) {
      await this.scheduleSmartAlarm(alarm);
    }

    console.log('✅ Alarm created:', alarm.id);
    return alarm;
  }

  /**
   * Update alarm configuration
   */
  async updateAlarm(alarmId: UUID, updates: Partial<AlarmConfig>): Promise<void> {
    await storageService.updateAlarmConfig(alarmId, updates);
    
    // Reschedule alarm
    const alarms = await storageService.getAlarmConfigs(updates.userId!);
    const updatedAlarm = alarms.find(a => a.id === alarmId);
    
    if (updatedAlarm) {
      if (updatedAlarm.enabled) {
        await this.scheduleSmartAlarm(updatedAlarm);
      } else {
        await this.cancelAlarm(alarmId);
      }
    }

    console.log('✅ Alarm updated:', alarmId);
  }

  /**
   * Delete alarm configuration
   */
  async deleteAlarm(alarmId: UUID): Promise<void> {
    await this.cancelAlarm(alarmId);
    await storageService.deleteAlarmConfig(alarmId);
    console.log('✅ Alarm deleted:', alarmId);
  }

  /**
   * Get all alarms for a user
   */
  async getUserAlarms(userId: UUID): Promise<AlarmConfig[]> {
    return await storageService.getAlarmConfigs(userId);
  }

  /**
   * Reschedule all enabled alarms
   */
  async rescheduleAllAlarms(userId: UUID): Promise<void> {
    const alarms = await this.getUserAlarms(userId);
    
    for (const alarm of alarms) {
      if (alarm.enabled) {
        await this.scheduleSmartAlarm(alarm);
      }
    }

    console.log('✅ Rescheduled all alarms for user:', userId);
  }
}

export const alarmService = new AlarmService();
export default alarmService;

