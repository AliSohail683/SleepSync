/**
 * Notification Manager
 * Handles all app notifications
 */

import PushNotification from 'react-native-push-notification';
import { AlarmConfig } from '../../models';

class NotificationManager {
  private initialized = false;

  /**
   * Initialize notification system
   */
  initialize(): void {
    if (this.initialized) return;

    PushNotification.configure({
      onRegister: function (token) {
        console.log('Notification token:', token);
      },
      onNotification: function (notification) {
        console.log('Notification:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true,
    });

    this.initialized = true;
    console.log('✅ Notification manager initialized');
  }

  /**
   * Schedule bedtime reminder
   */
  scheduleBedtimeReminder(bedtime: string, message: string): void {
    const [hours, minutes] = bedtime.split(':').map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(hours - 1, minutes, 0, 0); // 1 hour before bedtime

    if (reminderTime.getTime() < Date.now()) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    PushNotification.localNotificationSchedule({
      title: 'Bedtime Reminder',
      message: message || 'Time to prepare for sleep',
      date: reminderTime,
      repeatType: 'day',
    });
  }

  /**
   * Schedule smart alarm
   */
  scheduleSmartAlarm(alarm: AlarmConfig, _onTrigger: () => void): void {
    // Smart alarm is handled by SmartAlarmEngine
    // This is a fallback notification
    const [hours, minutes] = alarm.targetWindowStart.split(':').map(Number);
    const alarmTime = new Date();
    alarmTime.setHours(hours, minutes, 0, 0);

    if (alarmTime.getTime() < Date.now()) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    PushNotification.localNotificationSchedule({
      title: 'Wake Up',
      message: 'Time to wake up',
      date: alarmTime,
      soundName: 'default',
      vibrate: alarm.vibrationEnabled ? [0, 250, 250, 250] : undefined,
    });
  }

  /**
   * Send sleep summary notification
   */
  sendSleepSummary(score: number, duration: string): void {
    PushNotification.localNotification({
      title: 'Sleep Summary',
      message: `You slept ${duration} with a score of ${score}/100`,
      soundName: 'default',
    });
  }

  /**
   * Send weekly digest
   */
  sendWeeklyDigest(avgScore: number, _insights: string[]): void {
    PushNotification.localNotification({
      title: 'Weekly Sleep Summary',
      message: `Your average sleep score this week: ${avgScore}/100`,
      soundName: 'default',
    });
  }

  /**
   * Cancel all notifications
   */
  cancelAll(): void {
    PushNotification.cancelAllLocalNotifications();
  }
}

export const notificationManager = new NotificationManager();
export default notificationManager;

