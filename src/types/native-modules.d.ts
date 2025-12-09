/**
 * TypeScript declarations for native modules
 */

declare module 'react-native' {
  interface NativeModulesStatic {
    SleepTrackingModule: {
      startTracking(): Promise<boolean>;
      stopTracking(): Promise<boolean>;
      isTracking(): Promise<boolean>;
    };
    BackgroundTaskHandler: {
      registerBackgroundTasks(): void;
      scheduleBackgroundTask(): void;
      scheduleBackgroundFetch(): void;
    };
  }
}

export {};

