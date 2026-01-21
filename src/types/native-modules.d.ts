/**
 * TypeScript declarations for native modules
 * Supports both Old Architecture (NativeModules) and New Architecture (TurboModules)
 */

declare module 'react-native' {
  interface NativeModulesStatic {
    SensorModule?: {
      requestPermissions(): Promise<boolean>;
      startMicrophone(interval: number): Promise<void>;
      stopMicrophone(): Promise<void>;
      startLightSensor(interval: number): Promise<void>;
      stopLightSensor(): Promise<void>;
      addListener(eventName: string): void;
      removeListeners(count: number): void;
    };
    SleepTrackingModule?: {
      startTracking(): Promise<boolean>;
      stopTracking(): Promise<boolean>;
      isTracking(): Promise<boolean>;
    };
    BackgroundTaskHandler?: {
      registerBackgroundTasks(): void;
      scheduleBackgroundTask(): void;
      scheduleBackgroundFetch(): void;
    };
    PowerManager?: {
      isIgnoringBatteryOptimizations(): Promise<boolean>;
      requestIgnoreBatteryOptimizations(): Promise<boolean>;
      openBatterySettings(): Promise<boolean>;
    };
  }
}

export {};

