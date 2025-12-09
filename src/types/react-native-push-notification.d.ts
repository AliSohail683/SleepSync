/**
 * Type definitions for react-native-push-notification
 */

declare module 'react-native-push-notification' {
  interface PushNotificationOptions {
    onRegister?: (token: { token: string; os: string }) => void;
    onNotification?: (notification: any) => void;
    permissions?: {
      alert?: boolean;
      badge?: boolean;
      sound?: boolean;
    };
    popInitialNotification?: boolean;
    requestPermissions?: boolean;
  }

  interface LocalNotification {
    title?: string;
    message?: string;
    date?: Date;
    soundName?: string;
    vibrate?: number[];
    repeatType?: 'day' | 'week' | 'month';
  }

  export default class PushNotification {
    static configure(options: PushNotificationOptions): void;
    static localNotificationSchedule(notification: LocalNotification): void;
    static localNotification(notification: LocalNotification): void;
    static cancelAllLocalNotifications(): void;
  }
}

