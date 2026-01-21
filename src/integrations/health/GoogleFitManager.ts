/**
 * Google Fit Integration
 * Syncs sleep data with Google Fit using react-native-google-fit
 */

import { Platform, Linking } from 'react-native';
import { SleepSessionEnhanced } from '../../types/sleep';
import { UUID } from '../../models';

// Import react-native-google-fit
let GoogleFit: any = null;
if (Platform.OS === 'android') {
  try {
    GoogleFit = require('react-native-google-fit').default;
  } catch (error) {
    console.warn('react-native-google-fit not available:', error);
  }
}

class GoogleFitManager {
  private isAuthorized = false;
  private isInstalled: boolean | null = null;

  /**
   * Request Google Fit authorization
   */
  async requestAuthorization(retryCount: number = 0): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('Google Fit is only available on Android');
      return false;
    }

    if (!GoogleFit) {
      console.error('react-native-google-fit library not available');
      return false;
    }

    // Check if Google Fit is installed first
    const installed = await this.isGoogleFitInstalled();
    if (!installed) {
      console.warn('⚠️ Cannot request authorization: Google Fit app is not installed');
      return false;
    }

    try {
      const scopes = [
        'https://www.googleapis.com/auth/fitness.sleep.read',
        'https://www.googleapis.com/auth/fitness.sleep.write',
        'https://www.googleapis.com/auth/fitness.heart_rate.read',
        'https://www.googleapis.com/auth/fitness.activity.read',
      ];

      console.log('🔐 Requesting Google Fit authorization...');
      
      // react-native-google-fit v0.22.1 uses Promises, but handle both patterns
      // Use longer timeout for OAuth flow (60 seconds - OAuth can take time)
      let result: any;
      
      try {
        // Try Promise pattern first (most common in v0.22.1)
        try {
          result = await Promise.race([
            GoogleFit.authorize({
              scopes: scopes,
            }),
            new Promise<{ success: boolean }>((_, reject) =>
              setTimeout(() => {
                console.warn('⚠️ Google Fit authorization timeout (60s)');
                reject(new Error('Google Fit authorization timeout'));
              }, 60000) // 60 seconds for OAuth flow
            )
          ]);
        } catch (error: any) {
          // If Promise pattern fails with callback error, try callback pattern
          if (error.message?.includes('callback') || 
              error.message?.includes('not a function') ||
              error.message?.includes('undefined')) {
            console.log('🔄 Trying callback pattern for authorize...');
            result = await new Promise<{ success: boolean }>((resolve, reject) => {
              try {
                GoogleFit.authorize(
                  { scopes: scopes },
                  (authError: any, response: any) => {
                    if (authError) {
                      reject(authError);
                    } else {
                      resolve(response || { success: true });
                    }
                  }
                );
              } catch (err) {
                reject(err);
              }
            });
          } else {
            // Re-throw if it's not a callback error
            throw error;
          }
        }
      } catch (error: any) {
        console.error('Google Fit authorization error:', error);
        
        // Retry once if it's a timeout or network error
        if (retryCount < 1 && (
          error.message?.includes('timeout') ||
          error.message?.includes('network') ||
          error.code === 'NETWORK_ERROR'
        )) {
          console.log('🔄 Retrying Google Fit authorization...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          return this.requestAuthorization(retryCount + 1);
        }
        
        // If callback error, don't retry - it's a code issue
        if (error.message?.includes('callback') || error.message?.includes('not a function')) {
          console.error('⚠️ Google Fit authorization failed: callback error - check library version compatibility');
          return false;
        }
        
        throw error;
      }

      // Handle response - can be { success: boolean } or just boolean
      const success = result?.success !== undefined ? result.success : result === true;
      this.isAuthorized = success;
      
      if (success) {
        console.log('✅ Google Fit authorization granted');
      } else {
        console.warn('⚠️ Google Fit authorization denied or failed');
      }
      return success;
    } catch (error: any) {
      console.error('Google Fit authorization failed:', error);
      
      // Retry once for unexpected errors (but not callback errors)
      if (retryCount < 1 && !error.message?.includes('callback') && !error.message?.includes('not a function')) {
        console.log('🔄 Retrying Google Fit authorization after error...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.requestAuthorization(retryCount + 1);
      }
      
      return false;
    }
  }

  /**
   * Sync sleep session to Google Fit
   */
  async syncSleepSession(session: SleepSessionEnhanced): Promise<void> {
    if (Platform.OS !== 'android' || !GoogleFit) {
      throw new Error('Google Fit is only available on Android');
    }

    // Check if Google Fit is installed
    const installed = await this.isGoogleFitInstalled();
    if (!installed) {
      throw new Error('Google Fit app is not installed. Please install Google Fit from Play Store.');
    }

    if (!this.isAuthorized) {
      const granted = await this.requestAuthorization();
      if (!granted) {
        throw new Error('Google Fit authorization required. Please grant permissions to sync sleep data.');
      }
    }

    try {
      const startDate = new Date(session.startAt);
      const endDate = session.endAt ? new Date(session.endAt) : new Date();

      // Google Fit sleep data format
      const sleepData = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataTypeName: 'com.google.sleep.segment',
        // Google Fit uses different values for sleep stages
        // 1 = asleep, 2 = awake
        value: {
          intVal: 1, // ASLEEP
        },
      };

      // Use Promise directly - react-native-google-fit returns Promises
      await GoogleFit.saveSleep(sleepData);

      // If stages available, save them as separate segments
      if (session.stageSegments && session.stageSegments.length > 0) {
        for (const segment of session.stageSegments) {
          const stageValue = this.mapStageToGoogleFit(segment.stage);
          const segmentData = {
            startDate: new Date(segment.startTime).toISOString(),
            endDate: new Date(segment.endTime).toISOString(),
            dataTypeName: 'com.google.sleep.segment',
            value: {
              intVal: stageValue,
            },
          };

          await GoogleFit.saveSleep(segmentData);
        }
      }

      console.log('✅ Sleep session synced to Google Fit:', session.id);
    } catch (error) {
      console.error('Failed to sync to Google Fit:', error);
      throw error;
    }
  }

  /**
   * Map sleep stage to Google Fit value
   */
  private mapStageToGoogleFit(stage: string): number {
    // Google Fit sleep segment values
    // 1 = asleep, 2 = awake
    const mapping: Record<string, number> = {
      awake: 2,
      asleep: 1,
      light: 1, // Light sleep maps to asleep
      deep: 1, // Deep sleep maps to asleep
      rem: 1, // REM maps to asleep
    };
    return mapping[stage] || 1;
  }

  /**
   * Read sleep data from Google Fit
   */
  async readSleepData(startDate: Date, endDate: Date): Promise<any[]> {
    if (Platform.OS !== 'android' || !GoogleFit) {
      return [];
    }

    // Check if Google Fit is installed
    const installed = await this.isGoogleFitInstalled();
    if (!installed) {
      console.warn('⚠️ Cannot read sleep data: Google Fit app is not installed');
      return [];
    }

    if (!this.isAuthorized) {
      const granted = await this.requestAuthorization();
      if (!granted) {
        throw new Error('Google Fit authorization required');
      }
    }

    try {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucketUnit: 'DAY',
        bucketSize: 1,
      };

      // Use Promise directly
      const result = await GoogleFit.getSleepSamples(options);
      return result || [];
    } catch (error) {
      console.error('Failed to read from Google Fit:', error);
      throw error;
    }
  }

  /**
   * Read movement and heart rate data from Google Fit for a time period
   * Used to fill gaps when app was killed
   */
  async readGapData(startDate: Date, endDate: Date): Promise<{
    movementData: Array<{ timestamp: number; magnitude: number }>;
    heartRateData: Array<{ timestamp: number; bpm: number }>;
  }> {
    if (Platform.OS !== 'android' || !GoogleFit) {
      return { movementData: [], heartRateData: [] };
    }

    // Check if Google Fit is installed
    const installed = await this.isGoogleFitInstalled();
    if (!installed) {
      console.warn('⚠️ Cannot read Google Fit data: Google Fit app is not installed');
      return { movementData: [], heartRateData: [] };
    }

    // Request authorization if not already authorized
    if (!this.isAuthorized) {
      console.log('🔐 Requesting Google Fit authorization to read data...');
      const granted = await this.requestAuthorization();
      if (!granted) {
        console.warn('⚠️ Google Fit authorization denied, cannot read data');
        return { movementData: [], heartRateData: [] };
      }
    }

    try {
      console.log('�� Reading Google Fit data from', startDate.toISOString(), 'to', endDate.toISOString());
      
      // Read heart rate data - use Promise directly
      let heartRateData: Array<{ timestamp: number; bpm: number }> = [];
      try {
        const heartRateOptions = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          bucketUnit: 'MINUTE' as const,
          bucketSize: 1,
        };

        const heartRateResult = await Promise.race([
          GoogleFit.getHeartRateSamples(heartRateOptions),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Heart rate read timeout')), 15000)
          )
        ]).catch((error) => {
          console.warn('Failed to read heart rate data:', error);
          return [];
        });

        heartRateData = (heartRateResult || []).map((sample: any) => ({
          timestamp: new Date(sample.startDate || sample.endDate || sample.date).getTime(),
          bpm: sample.value || sample.heartRate || 0,
        }));
        
        if (heartRateData.length > 0) {
          console.log(`✅ Read ${heartRateData.length} heart rate data points from Google Fit`);
        }
      } catch (error) {
        console.warn('Error reading heart rate data:', error);
      }

      // Read step count - use Promise directly
      let movementData: Array<{ timestamp: number; magnitude: number }> = [];
      try {
        const stepOptions = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          bucketUnit: 'MINUTE' as const,
          bucketSize: 1,
        };

        const stepResult = await Promise.race([
          GoogleFit.getDailyStepCountSamples(stepOptions),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Step count read timeout')), 15000)
          )
        ]).catch((error) => {
          console.warn('Failed to read step count data:', error);
          return [];
        });

        movementData = (stepResult || []).map((sample: any) => ({
          timestamp: new Date(sample.startDate || sample.endDate || sample.date).getTime(),
          magnitude: (sample.steps || sample.value || 0) * 0.1,
        }));
        
        if (movementData.length > 0) {
          console.log(`✅ Read ${movementData.length} movement data points from Google Fit`);
        }
      } catch (error) {
        console.warn('Error reading step count data:', error);
      }

      const totalDataPoints = heartRateData.length + movementData.length;
      if (totalDataPoints > 0) {
        console.log(`✅ Successfully read ${totalDataPoints} total data points from Google Fit`);
      } else {
        console.log('ℹ️ No data available in Google Fit for the specified time range');
      }

      return {
        movementData,
        heartRateData,
      };
    } catch (error) {
      console.error('Failed to read Google Fit gap data:', error);
      return { movementData: [], heartRateData: [] };
    }
  }

  /**
   * Check authorization status
   */
  async checkAuthorizationStatus(): Promise<boolean> {
    if (Platform.OS !== 'android' || !GoogleFit) {
      return false;
    }

    try {
      const options = {
        startDate: new Date(Date.now() - 86400000).toISOString(),
        endDate: new Date().toISOString(),
        bucketUnit: 'DAY' as const,
        bucketSize: 1,
      };

      // Use Promise directly
      const result = await Promise.race([
        GoogleFit.getSleepSamples(options),
        new Promise((_, reject) =>
          setTimeout(() => {
            console.warn('Google Fit authorization check timeout');
            reject(new Error('Google Fit authorization check timeout'));
          }, 5000)
        )
      ]).catch((error: any) => {
        // Check if error is permission-related
        const errorMessage = error.message || error.toString() || '';
        const isPermissionError =
          errorMessage.includes('authorization') ||
          errorMessage.includes('permission') ||
          errorMessage.includes('not authorized') ||
          error.code === 'AUTH_ERROR' ||
          error.code === 'E_AUTHORIZATION' ||
          errorMessage.includes('timeout');

        if (isPermissionError) {
          this.isAuthorized = false;
          return null;
        } else {
          this.isAuthorized = true;
          return [];
        }
      });

      if (result !== null) {
        this.isAuthorized = true;
        return true;
      } else {
        this.isAuthorized = false;
        return false;
      }
    } catch (error: any) {
      console.warn('Google Fit authorization check failed:', error);
      this.isAuthorized = false;
      return false;
    }
  }

  /**
   * Check if Google Fit app is installed on the device
   * Uses multiple methods to reliably detect installation
   */
  async isGoogleFitInstalled(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    if (this.isInstalled !== null) {
      return this.isInstalled;
    }

    if (!GoogleFit) {
      this.isInstalled = false;
      return false;
    }

    try {
      // Method 1: Check if react-native-google-fit has an isAvailable method
      // react-native-google-fit v0.22.1 uses callbacks for isAvailable
      if (typeof GoogleFit.isAvailable === 'function') {
        try {
          const isAvailable = await new Promise<boolean>((resolve, reject) => {
            try {
              // Callback pattern: (error, available)
              GoogleFit.isAvailable((error: any, available: boolean) => {
                if (error) {
                  // Error doesn't mean not installed, just means check failed
                  resolve(false);
                } else {
                  resolve(available === true);
                }
              });
            } catch (err) {
              // If calling without callback throws, try as Promise
              try {
                const result = GoogleFit.isAvailable();
                if (result instanceof Promise) {
                  result.then(resolve).catch(() => resolve(false));
                } else {
                  resolve(result === true);
                }
              } catch {
                resolve(false);
              }
            }
          });
          
          this.isInstalled = isAvailable;
          if (this.isInstalled) {
            console.log('✅ Google Fit app is installed (via isAvailable)');
            return this.isInstalled;
          }
        } catch (error) {
          console.warn('isAvailable check failed:', error);
        }
      }

      // Method 2: Try getAccount - react-native-google-fit v0.22.1 uses callbacks
      try {
        if (typeof GoogleFit.getAccount === 'function') {
          const account = await new Promise<any>((resolve) => {
            try {
              // Callback pattern: (error, accountData)
              GoogleFit.getAccount((error: any, accountData: any) => {
                if (error) {
                  // Error might mean not authorized, but doesn't mean not installed
                  resolve(null);
                } else {
                  resolve(accountData);
                }
              });
            } catch (err) {
              // If calling without callback throws, try as Promise
              try {
                const result = GoogleFit.getAccount();
                if (result instanceof Promise) {
                  result.then(resolve).catch(() => resolve(null));
                } else {
                  resolve(result);
                }
              } catch {
                resolve(null);
              }
            }
          });
          
          this.isInstalled = account !== null && account !== undefined;
          if (this.isInstalled) {
            console.log('✅ Google Fit app is installed (via getAccount)');
            return this.isInstalled;
          }
        }
      } catch (error) {
        // getAccount might fail if not authorized, but that doesn't mean it's not installed
        console.warn('getAccount check inconclusive:', error);
      }

      // Method 3: Try to check if we can open Google Fit package
      try {
        const canOpen = await Linking.canOpenURL('com.google.android.apps.fitness://');
        if (canOpen) {
          this.isInstalled = true;
          console.log('✅ Google Fit app is installed (via package check)');
          return true;
        }
      } catch (error) {
        console.warn('Package check failed:', error);
      }

      // Method 4: If library is available, assume Google Fit services are available
      // The library being available usually means Google Play Services (which includes Google Fit) is available
      this.isInstalled = true;
      console.log('✅ Google Fit services appear to be available (library loaded)');
      return true;
    } catch (error) {
      console.warn('Failed to check Google Fit installation:', error);
      // If we get here, assume installed since library is available
      // Authorization will handle the actual verification
      this.isInstalled = true;
      return true;
    }
  }

  /**
   * Check authorization status (in-memory flag)
   */
  isGoogleFitAuthorized(): boolean {
    return this.isAuthorized;
  }

  /**
   * Open Google Fit in Play Store for installation
   */
  async openPlayStore(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.google.android.apps.fitness';
      const canOpen = await Linking.canOpenURL(playStoreUrl);
      
      if (canOpen) {
        await Linking.openURL(playStoreUrl);
        console.log('✅ Opened Google Fit in Play Store');
      } else {
        // Fallback: Try to open the package directly
        await Linking.openURL('market://details?id=com.google.android.apps.fitness');
      }
    } catch (error) {
      console.error('Failed to open Play Store:', error);
      throw error;
    }
  }
}

export const googleFitManager = new GoogleFitManager();
export default googleFitManager;

