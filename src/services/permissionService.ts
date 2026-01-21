/**
 * Permission Service
 * Handles all app permissions including sensors, background services, and battery optimization
 */

import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { sensorBridge } from '../bridge/nativeModules';
import { healthSyncService } from '../integrations/health/HealthSyncService';

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  blocked: boolean;
}

export interface AllPermissionsStatus {
  microphone: PermissionStatus;
  sensors: PermissionStatus;
  notifications: PermissionStatus;
  health: PermissionStatus;
  batteryOptimization: PermissionStatus;
  backgroundLocation?: PermissionStatus; // For future use
}

class PermissionService {
  /**
   * Request all necessary permissions for sleep tracking
   */
  async requestAllPermissions(): Promise<AllPermissionsStatus> {
    const results: AllPermissionsStatus = {
      microphone: { granted: false, denied: false, blocked: false },
      sensors: { granted: false, denied: false, blocked: false },
      notifications: { granted: false, denied: false, blocked: false },
      health: { granted: false, denied: false, blocked: false },
      batteryOptimization: { granted: false, denied: false, blocked: false },
    };

    if (Platform.OS === 'android') {
      // Request Android runtime permissions
      results.microphone = await this.requestMicrophonePermission();
      results.sensors = await this.requestSensorPermissions();
      results.notifications = await this.requestNotificationPermission();
      results.batteryOptimization = await this.requestBatteryOptimizationExemption();
    } else {
      // iOS permissions are handled differently
      results.microphone = await this.requestMicrophonePermissionIOS();
      results.sensors = { granted: true, denied: false, blocked: false }; // iOS sensors don't need explicit permission
    }

    // Request health permissions (works on both platforms)
    try {
      // For Android, check if Google Fit is installed first
      if (Platform.OS === 'android') {
        const { googleFitManager } = require('../integrations/health/GoogleFitManager');
        const isInstalled = await googleFitManager.isGoogleFitInstalled();
        
        if (!isInstalled) {
          console.warn('⚠️ Google Fit is not installed. User needs to install it from Play Store.');
          results.health = {
            granted: false,
            denied: true,
            blocked: true, // Mark as blocked since app is not installed
          };
        } else {
          // Google Fit is installed, proceed with authorization
          const healthGranted = await healthSyncService.requestPermissions();
          results.health = {
            granted: healthGranted,
            denied: !healthGranted,
            blocked: false,
          };
        }
      } else {
        // iOS - request HealthKit permissions
        const healthGranted = await healthSyncService.requestPermissions();
        results.health = {
          granted: healthGranted,
          denied: !healthGranted,
          blocked: false,
        };
      }
    } catch (error) {
      console.error('Failed to request health permissions:', error);
      results.health = { granted: false, denied: true, blocked: false };
    }

    return results;
  }

  /**
   * Request microphone permission (Android)
   */
  private async requestMicrophonePermission(): Promise<PermissionStatus> {
    try {
      if (Platform.Version >= 33) {
        // Android 13+ uses granular audio permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message:
              'SleepSync needs microphone access to detect snoring and sleep disturbances during your sleep session.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return {
          granted: granted === PermissionsAndroid.RESULTS.GRANTED,
          denied: granted === PermissionsAndroid.RESULTS.DENIED,
          blocked: granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
        };
      } else {
        // Use native module for older Android versions
        const granted = await sensorBridge.requestPermissions();
        return {
          granted,
          denied: !granted,
          blocked: false,
        };
      }
    } catch (error) {
      console.error('Failed to request microphone permission:', error);
      return { granted: false, denied: true, blocked: false };
    }
  }

  /**
   * Request microphone permission (iOS)
   */
  private async requestMicrophonePermissionIOS(): Promise<PermissionStatus> {
    try {
      const granted = await sensorBridge.requestPermissions();
      return {
        granted,
        denied: !granted,
        blocked: false,
      };
    } catch (error) {
      console.error('Failed to request microphone permission:', error);
      return { granted: false, denied: true, blocked: false };
    }
  }

  /**
   * Request sensor permissions (Android)
   */
  private async requestSensorPermissions(): Promise<PermissionStatus> {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BODY_SENSORS,
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);

      const bodySensorsGranted =
        results[PermissionsAndroid.PERMISSIONS.BODY_SENSORS] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const activityRecognitionGranted =
        results[PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION] ===
        PermissionsAndroid.RESULTS.GRANTED;

      const allGranted = bodySensorsGranted && activityRecognitionGranted;
      const anyBlocked =
        results[PermissionsAndroid.PERMISSIONS.BODY_SENSORS] ===
          PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
        results[PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION] ===
          PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

      return {
        granted: allGranted,
        denied: !allGranted && !anyBlocked,
        blocked: anyBlocked,
      };
    } catch (error) {
      console.error('Failed to request sensor permissions:', error);
      return { granted: false, denied: true, blocked: false };
    }
  }

  /**
   * Request notification permission (Android 13+)
   */
  private async requestNotificationPermission(): Promise<PermissionStatus> {
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message:
              'SleepSync needs notification permission to send you sleep insights and alarm reminders.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return {
          granted: granted === PermissionsAndroid.RESULTS.GRANTED,
          denied: granted === PermissionsAndroid.RESULTS.DENIED,
          blocked: granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
        };
      } else {
        // Pre-Android 13, notifications are granted by default
        return { granted: true, denied: false, blocked: false };
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return { granted: false, denied: true, blocked: false };
    }
  }

  /**
   * Request battery optimization exemption (Android)
   * This is critical for background sleep tracking
   */
  private async requestBatteryOptimizationExemption(): Promise<PermissionStatus> {
    if (Platform.OS !== 'android') {
      return { granted: true, denied: false, blocked: false };
    }

    try {
      // Check if already exempted
      const { NativeModules } = require('react-native');
      const PowerManager = NativeModules.PowerManager;
      
      if (PowerManager) {
        try {
          const isIgnoring = await PowerManager.isIgnoringBatteryOptimizations();
          if (isIgnoring) {
            return { granted: true, denied: false, blocked: false };
          }

          // For now, just show the dialog - user can grant it manually
          // The permission screen will show the status
          return { granted: false, denied: true, blocked: false };
        } catch (error) {
          console.error('Failed to check battery optimization:', error);
          return { granted: false, denied: true, blocked: false };
        }
      } else {
        // Fallback: Open battery settings manually
        Alert.alert(
          'Battery Optimization',
          'Please disable battery optimization for SleepSync to ensure accurate sleep tracking. We will open the settings for you.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open Settings',
              onPress: async () => {
                try {
                  await Linking.openSettings();
                } catch (error) {
                  console.error('Failed to open settings:', error);
                }
              },
            },
          ]
        );
        return { granted: false, denied: true, blocked: false };
      }
    } catch (error) {
      console.error('Failed to request battery optimization exemption:', error);
      return { granted: false, denied: true, blocked: false };
    }
  }

  /**
   * Check current permission status
   */
  async checkAllPermissions(): Promise<AllPermissionsStatus> {
    const results: AllPermissionsStatus = {
      microphone: { granted: false, denied: false, blocked: false },
      sensors: { granted: false, denied: false, blocked: false },
      notifications: { granted: false, denied: false, blocked: false },
      health: { granted: false, denied: false, blocked: false },
      batteryOptimization: { granted: false, denied: false, blocked: false },
    };

    if (Platform.OS === 'android') {
      // Check Android permissions
      const microphoneStatus = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      results.microphone.granted = microphoneStatus;
      results.microphone.denied = !microphoneStatus;

      const bodySensorsStatus = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BODY_SENSORS
      );
      const activityRecognitionStatus = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
      );
      results.sensors.granted = bodySensorsStatus && activityRecognitionStatus;
      results.sensors.denied = !results.sensors.granted;

      if (Platform.Version >= 33) {
        const notificationStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        results.notifications.granted = notificationStatus;
        results.notifications.denied = !notificationStatus;
      } else {
        results.notifications.granted = true; // Pre-Android 13
      }

      // Check battery optimization
      try {
        const { NativeModules } = require('react-native');
        const PowerManager = NativeModules.PowerManager;
        if (PowerManager) {
          const isIgnoring = await PowerManager.isIgnoringBatteryOptimizations();
          results.batteryOptimization.granted = isIgnoring;
          results.batteryOptimization.denied = !isIgnoring;
        }
      } catch (error) {
        console.error('Failed to check battery optimization:', error);
      }

      // Check Google Fit installation and authorization
      try {
        const { googleFitManager } = require('../integrations/health/GoogleFitManager');
        const isInstalled = await googleFitManager.isGoogleFitInstalled();
        
        if (!isInstalled) {
          results.health.granted = false;
          results.health.denied = true;
          results.health.blocked = true; // Blocked because app is not installed
        } else {
          const isAuthorized = await googleFitManager.checkAuthorizationStatus();
          results.health.granted = isAuthorized;
          results.health.denied = !isAuthorized;
          results.health.blocked = false;
        }
      } catch (error) {
        console.error('Failed to check Google Fit status:', error);
        results.health.denied = true;
        results.health.blocked = false;
      }
    } else if (Platform.OS === 'ios') {
      // Check iOS permissions
      // Note: iOS doesn't provide a way to check microphone permission status
      // without requesting it. We'll mark it as unknown/needs checking.
      // The actual status will be determined when user tries to use microphone.
      results.microphone.granted = false;
      results.microphone.denied = false; // Unknown status, not explicitly denied

      // iOS sensors don't need explicit permission
      results.sensors.granted = true;

      // iOS notifications are handled by the system, assume granted if app is installed
      results.notifications.granted = true;

      // Check HealthKit authorization
      try {
        const { healthKitManager } = require('../integrations/health/HealthKitManager');
        const isAuthorized = await healthKitManager.checkAuthorizationStatus();
        results.health.granted = isAuthorized;
        results.health.denied = !isAuthorized;
      } catch (error) {
        console.error('Failed to check HealthKit authorization:', error);
        results.health.denied = true;
      }

      // Battery optimization not applicable on iOS
      results.batteryOptimization.granted = true;
    }

    return results;
  }

  /**
   * Request battery optimization exemption (can be called from UI)
   */
  async requestBatteryOptimization(): Promise<PermissionStatus> {
    if (Platform.OS !== 'android') {
      return { granted: true, denied: false, blocked: false };
    }

    try {
      const { NativeModules } = require('react-native');
      const PowerManager = NativeModules.PowerManager;
      
      if (PowerManager) {
        const isIgnoring = await PowerManager.isIgnoringBatteryOptimizations();
        if (isIgnoring) {
          return { granted: true, denied: false, blocked: false };
        }

        await PowerManager.requestIgnoreBatteryOptimizations();
        
        // Wait a bit and check again
        await new Promise(resolve => setTimeout(resolve, 500));
        const newStatus = await PowerManager.isIgnoringBatteryOptimizations();
        
        return {
          granted: newStatus,
          denied: !newStatus,
          blocked: false,
        };
      } else {
        // Fallback: Open settings
        await Linking.openSettings();
        return { granted: false, denied: true, blocked: false };
      }
    } catch (error) {
      console.error('Failed to request battery optimization:', error);
      return { granted: false, denied: true, blocked: false };
    }
  }

  /**
   * Show permission explanation dialog
   */
  showPermissionExplanation(
    permission: string,
    onGrant: () => void,
    onDeny: () => void
  ): void {
    const messages: Record<string, { title: string; message: string }> = {
      microphone: {
        title: 'Microphone Permission',
        message:
          'SleepSync uses your microphone to detect snoring and sleep disturbances. This helps us provide accurate sleep quality analysis. Audio is processed locally and never stored or transmitted.',
      },
      sensors: {
        title: 'Sensor Permissions',
        message:
          'SleepSync needs access to motion and body sensors to track your sleep patterns, detect movement, and monitor sleep stages. This data is essential for accurate sleep analysis.',
      },
      notifications: {
        title: 'Notification Permission',
        message:
          'SleepSync sends you sleep insights, smart alarm reminders, and important sleep tracking updates. Notifications help you stay informed about your sleep health.',
      },
      health: {
        title: 'Health Data Access',
        message:
          'SleepSync can sync with Apple Health or Google Fit to provide a complete picture of your sleep. We read your existing sleep data and save new sleep sessions to your health app.',
      },
      battery: {
        title: 'Battery Optimization',
        message:
          'To track your sleep accurately throughout the night, SleepSync needs to run in the background. Disabling battery optimization ensures continuous tracking even when your phone is locked.',
      },
    };

    const config = messages[permission] || {
      title: 'Permission Required',
      message: 'This permission is required for sleep tracking to work properly.',
    };

    Alert.alert(config.title, config.message, [
      {
        text: 'Not Now',
        style: 'cancel',
        onPress: onDeny,
      },
      {
        text: 'Grant Permission',
        onPress: onGrant,
      },
    ]);
  }
}

export const permissionService = new PermissionService();
export default permissionService;

