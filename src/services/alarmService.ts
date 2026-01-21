/**
 * Alarm Service
 * Manages smart alarms and wake scheduling
 */

import PushNotification from 'react-native-push-notification';
import { Platform, PermissionsAndroid, DeviceEventEmitter } from 'react-native';
import { AlarmConfig, UUID } from '../models';
import { storageService } from './storageService';
import { sleepService } from './sleepService';
import {
  shouldAlarmTrigger,
  validateAlarmConfig,
  predictSleepStages,
} from '../utils/alarmUtils';
import { parseTimeString } from '../utils/dateUtils';

// Configure push notification (local notifications only, no Firebase)
PushNotification.configure({
  onRegister: function (token) {
    console.log('TOKEN:', token);
  },
  onNotification: function (notification) {
    console.log('🔔 NOTIFICATION RECEIVED:', JSON.stringify(notification, null, 2));
    console.log('📱 App state when notification received:', notification.foreground ? 'foreground' : 'background');
    console.log('📋 Notification data:', {
      id: notification.id,
      userInfo: notification.userInfo,
      data: notification.data,
    });
    
    // Handle alarm notification - launch alarm screen
    const alarmId = notification.userInfo?.alarmId || notification.data?.alarmId;
    if (alarmId) {
      console.log('🔔 Alarm notification detected, alarmId:', alarmId);
      
      // Emit event immediately - don't delay
      console.log('📡 Emitting alarmTriggered event with alarmId:', alarmId);
      DeviceEventEmitter.emit('alarmTriggered', alarmId);
      
      // Also try after a small delay as backup
      setTimeout(() => {
        DeviceEventEmitter.emit('alarmTriggered', alarmId);
      }, 1000);
    } else {
      console.warn('⚠️ Notification received but no alarmId found:', notification);
    }
    
    // Required: Call finish to properly handle notification
    if (notification.finish) {
      notification.finish('UIBackgroundFetchResultNoData');
    }
  },
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },
  popInitialNotification: true,
  requestPermissions: false, // Don't auto-request to avoid Firebase
  
  // Android-specific configuration (using type assertion for properties not in types)
  ...({
    channelId: 'sleepsync_alarms',
    channelName: 'SleepSync Alarms',
    channelDescription: 'Smart alarm notifications',
    playSound: true,
    soundName: 'default',
    importance: 'high',
    priority: 'high',
    visibility: 'public',
    // Force notification to show even in foreground
    foreground: true, // This ensures notifications show in foreground
  } as any),
});

class AlarmService {
  private scheduledNotifications: Map<string, string> = new Map();
  private firedAlarms: Set<string> = new Set();

  /**
   * Initialize notification permissions
   */
  async initializeNotifications(): Promise<boolean> {
    if (Platform.OS === 'android') {
      // Create notification channel first (required for Android 8.0+)
      (PushNotification as any).createChannel(
        {
          channelId: 'sleepsync_alarms',
          channelName: 'SleepSync Alarms',
          channelDescription: 'Smart alarm notifications',
          playSound: true,
          soundName: 'default',
          importance: 4, // High importance
          vibrate: true,
        },
        (created: boolean) => {
          console.log(`📢 Notification channel ${created ? 'created' : 'already exists'}`);
        }
      );

      // Request notification permission
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (hasPermission) {
          console.log('✅ Notification permissions already granted');
          return true;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'SleepSync needs notification permission to wake you up with smart alarms.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ Notification permissions granted');
          return true;
        } else {
          console.warn('⚠️ Notification permissions denied');
          return false;
        }
      } catch (err) {
        console.error('Error requesting notification permissions:', err);
        return false;
      }
    } else {
      // iOS - permissions are handled automatically
      return true;
    }
  }

  /**
   * Check if user is currently sleeping
   */
  private async isUserSleeping(userId: UUID): Promise<boolean> {
    try {
      const sessions = await sleepService.getRecentSessions(userId, 1);
      const activeSession = sessions.find(s => !s.endAt);
      return !!activeSession;
    } catch (error) {
      console.error('Error checking sleep status:', error);
      return false;
    }
  }

  /**
   * Get current sleep session with stage data
   */
  private async getCurrentSleepSession(userId: UUID) {
    try {
      const sessions = await sleepService.getRecentSessions(userId, 1);
      return sessions.find(s => !s.endAt);
    } catch (error) {
      console.error('Error getting sleep session:', error);
      return null;
    }
  }

  /**
   * Calculate optimal wake time based on sleep state
   * Core functionality:
   * 1. If user is sleeping: find lightest sleep phase in window
   * 2. If user is not sleeping: trigger at window start
   */
  private async calculateOptimalWakeTime(
    config: AlarmConfig,
    wakeTime: Date
  ): Promise<Date> {
    const userId = config.userId;
    const isSleeping = await this.isUserSleeping(userId);

    if (!isSleeping) {
      // User not sleeping - trigger at window start
      console.log('⏰ User not sleeping, triggering at window start:', wakeTime.toLocaleString());
      return wakeTime;
    }

    // User is sleeping - find lightest sleep phase in window
    const session = await this.getCurrentSleepSession(userId);
    if (!session) {
      console.log('⏰ No active session found, using window start');
      return wakeTime;
    }

    const sessionStart = new Date(session.startAt);
    const now = new Date();
    const elapsedHours = (now.getTime() - sessionStart.getTime()) / (1000 * 60 * 60);
    
    // Calculate expected duration based on user's sleep goal or default 8 hours
    const expectedDuration = 8;
    const predictedStages = predictSleepStages(sessionStart, expectedDuration);

    // Find lightest sleep phase within window
    const windowStart = new Date(wakeTime);
    const windowEnd = new Date(wakeTime);
    const endTime = parseTimeString(config.targetWindowEnd);
    windowEnd.setHours(endTime.hours, endTime.minutes, 0, 0);
    if (windowEnd <= windowStart) {
      windowEnd.setDate(windowEnd.getDate() + 1);
    }

    // Filter stages to only those in the future (can't wake in the past)
    const futureStages = predictedStages.filter(stage => stage.time > now);

    // Find lightest sleep phases within window
    const lightSleepMoments = futureStages.filter(
      (stage) =>
        stage.stage === 'light' &&
        stage.time >= windowStart &&
        stage.time <= windowEnd
    );

    if (lightSleepMoments.length > 0) {
      // Use earliest light sleep moment
      const optimalTime = lightSleepMoments[0].time;
      console.log('⏰ User sleeping, found light sleep phase:', {
        optimalTime: optimalTime.toLocaleString(),
        windowStart: windowStart.toLocaleString(),
        windowEnd: windowEnd.toLocaleString(),
        elapsedHours: elapsedHours.toFixed(2),
      });
      return optimalTime;
    }

    // No light sleep found in window - use window start
    console.log('⏰ No light sleep phase in window, using window start');
    return wakeTime;
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

    // Cancel existing alarms for this config
    await this.cancelAlarm(config.id);

    const now = new Date();
    const start = parseTimeString(config.targetWindowStart);
    
    // Schedule for all selected days in the next 14 days
    try {
      const scheduledIds: string[] = [];
      let scheduledCount = 0;
      
      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const wakeTime = new Date(now);
        wakeTime.setDate(wakeTime.getDate() + dayOffset);
        wakeTime.setHours(start.hours, start.minutes, 0, 0);
        wakeTime.setSeconds(0);
        wakeTime.setMilliseconds(0);
        
        // Skip if time has passed more than 1 minute ago
        const oneMinute = 60 * 1000;
        const timeUntilAlarm = wakeTime.getTime() - now.getTime();
        if (dayOffset === 0 && timeUntilAlarm < -oneMinute) {
          continue;
        }
        
        // Check if alarm should trigger on this day
        if (!shouldAlarmTrigger(config, wakeTime)) {
          continue;
        }
        
        // Calculate optimal wake time (considering sleep state)
        // For today (dayOffset === 0), check if user is sleeping and find lightest phase
        // For future days, we can't predict sleep state, so use window start
        const optimalWakeTime = dayOffset === 0 
          ? await this.calculateOptimalWakeTime(config, wakeTime)
          : wakeTime; // For future days, use window start
        
        // Schedule notification
        try {
          const notificationId = `${config.id}_${optimalWakeTime.getTime()}`;
          
          (PushNotification as any).localNotificationSchedule({
            id: notificationId,
            title: '🌅 Time to Wake Up',
            message: config.gentleWake
              ? 'Good morning! You\'re in a light sleep phase.'
              : 'Good morning! Time to start your day.',
            userInfo: { alarmId: config.id },
            date: optimalWakeTime,
            soundName: 'default',
            vibrate: config.vibrationEnabled ? [0, 500, 500, 500] : undefined,
            playSound: true,
            // Android-specific
            channelId: 'sleepsync_alarms',
            importance: 'high',
            priority: 'high',
            allowWhileIdle: true,
            repeatType: undefined,
          } as any);

          scheduledIds.push(notificationId);
          scheduledCount++;
          
          console.log('⏰ Scheduled alarm:', {
            notificationId,
            wakeTime: optimalWakeTime.toLocaleString(),
            alarmId: config.id,
            isSleeping: dayOffset === 0 ? await this.isUserSleeping(config.userId) : false,
          });
        } catch (error) {
          console.error(`❌ Failed to schedule alarm for ${wakeTime.toLocaleString()}:`, error);
        }
      }
      
      if (scheduledCount === 0) {
        console.log('⏭️ No alarms scheduled (no matching days in next 14 days)');
        return null;
      }
      
      const primaryNotificationId = scheduledIds[0];
      this.scheduledNotifications.set(config.id, primaryNotificationId);
      console.log(`✅ Scheduled ${scheduledCount} alarm(s) for alarm config ${config.id}`);
      
      return primaryNotificationId;
    } catch (error) {
      console.error('❌ Failed to schedule alarm:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled alarm
   */
  async cancelAlarm(alarmId: UUID): Promise<void> {
    try {
      // Get all scheduled notifications
      const notifications = await new Promise<any[]>((resolve) => {
        (PushNotification as any).getScheduledLocalNotifications((notifications: any[]) => {
          resolve(notifications || []);
        });
      });
      
      // Cancel all notifications for this alarm
      const toCancel = notifications.filter((n: any) => 
        n.id?.startsWith(`${alarmId}_`)
      );
      
      for (const notification of toCancel) {
        // Cancel by ID - react-native-push-notification uses cancelLocalNotifications with id
        (PushNotification as any).cancelLocalNotifications({ id: notification.id });
      }
      
      this.scheduledNotifications.delete(alarmId);
      console.log(`✅ Cancelled ${toCancel.length} notification(s) for alarm ${alarmId}`);
    } catch (error) {
      console.error('❌ Error cancelling alarm:', error);
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

    if (alarm.enabled) {
      await this.scheduleSmartAlarm(alarm);
    }

    return alarm;
  }

  /**
   * Update alarm configuration
   */
  async updateAlarm(alarmId: UUID, updates: Partial<AlarmConfig>): Promise<void> {
    if (!updates.userId) {
      throw new Error('userId is required for alarm update');
    }

    await storageService.updateAlarmConfig(alarmId, updates);
    
    const alarms = await storageService.getAlarmConfigs(updates.userId);
    const updatedAlarm = alarms.find(a => a.id === alarmId);
    
    if (updatedAlarm) {
      if (updatedAlarm.enabled) {
        await this.scheduleSmartAlarm(updatedAlarm);
      } else {
        await this.cancelAlarm(alarmId);
      }
    }
  }

  /**
   * Delete alarm configuration
   */
  async deleteAlarm(alarmId: UUID): Promise<void> {
    await this.cancelAlarm(alarmId);
    await storageService.deleteAlarmConfig(alarmId);
  }

  /**
   * Get all alarms for a user
   */
  async getUserAlarms(userId: UUID): Promise<AlarmConfig[]> {
    if (!storageService.isInitialized()) {
      await storageService.setupDB();
    }
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

  /**
   * Check for and fire missed alarms (when app comes to foreground)
   */
  async checkAndFireMissedAlarms(userId: UUID): Promise<void> {
    try {
      const alarms = await this.getUserAlarms(userId);
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      for (const alarm of alarms) {
        if (!alarm.enabled) continue;

        const start = parseTimeString(alarm.targetWindowStart);
        const alarmTime = new Date(now);
        alarmTime.setHours(start.hours, start.minutes, 0, 0);
        alarmTime.setSeconds(0);
        alarmTime.setMilliseconds(0);

        // Check if alarm should have fired in the last 10 minutes
        if (alarmTime >= tenMinutesAgo && alarmTime <= now) {
          if (shouldAlarmTrigger(alarm, alarmTime)) {
            const alarmKey = `${alarm.id}_${alarmTime.getTime()}`;
            if (!this.firedAlarms.has(alarmKey)) {
              console.log('🔔 Firing missed alarm:', alarm.id);
              this.firedAlarms.add(alarmKey);
              DeviceEventEmitter.emit('alarmTriggered', alarm.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking missed alarms:', error);
    }
  }

  /**
   * Start foreground alarm checker (runs periodically when app is active)
   */
  startForegroundChecker(userId: UUID): () => void {
    let intervalId: NodeJS.Timeout | null = null;

    const checkAlarms = async () => {
      try {
        const alarms = await this.getUserAlarms(userId);
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        for (const alarm of alarms) {
          if (!alarm.enabled) continue;

          const start = parseTimeString(alarm.targetWindowStart);
          const alarmTime = new Date(now);
          alarmTime.setHours(start.hours, start.minutes, 0, 0);
          alarmTime.setSeconds(0);
          alarmTime.setMilliseconds(0);

          // Check if alarm should have fired in the last 5 minutes
          if (alarmTime >= fiveMinutesAgo && alarmTime <= now) {
            if (shouldAlarmTrigger(alarm, alarmTime)) {
              const alarmKey = `${alarm.id}_${alarmTime.getTime()}`;
              if (!this.firedAlarms.has(alarmKey)) {
                console.log('🔔 Firing alarm from foreground checker:', alarm.id);
                this.firedAlarms.add(alarmKey);
                DeviceEventEmitter.emit('alarmTriggered', alarm.id);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in foreground alarm checker:', error);
      }
    };

    // Check every 5 seconds
    intervalId = setInterval(checkAlarms, 5000);
    console.log('✅ Started foreground alarm checker');

    // Return cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('✅ Stopped foreground alarm checker');
      }
    };
  }
}

export const alarmService = new AlarmService();
export default alarmService;
