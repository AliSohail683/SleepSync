/**
 * App Initialization Hook
 * Handles app startup logic
 */

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import storageService from '../services/storageService';
import { database } from '../storage/sqlite/database';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useUserStore } from '../store/userStore';
import { backgroundTrackingService } from '../system/background/BackgroundTrackingService';
import { sleepService } from '../services/sleepService';
import { sensorDataProcessor } from '../services/SensorDataProcessor';

export const useInitializeApp = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { loadProfile, profile, setOnboardingComplete } = useUserStore();
  const { initialize: initializeSubscription } = useSubscriptionStore();

  useEffect(() => {
    const initialize = async () => {
      // Set a maximum timeout for initialization (5 seconds)
      const initTimeout = setTimeout(() => {
        console.warn('Initialization timeout - setting app as ready anyway');
        setIsReady(true);
      }, 5000);

      try {
        // Initialize enhanced database
        try {
          await database.initialize();
        } catch (dbError) {
          console.error('Database initialization error:', dbError);
          // Continue anyway - database might be optional
        }
        
        // Also initialize legacy storage service for backward compatibility
        try {
          await storageService.setupDB();
        } catch (storageError) {
          console.error('Storage service setup error:', storageError);
          // Continue anyway
        }

        // Get or create persistent user ID
        // Check if user ID exists in storage
        let userId: string | null = null;
        let onboardingComplete = false;
        
        try {
          userId = await storageService.getStoredUserId();
          onboardingComplete = await storageService.getOnboardingComplete();
        } catch (storageError) {
          console.error('Error getting user data from storage:', storageError);
          // Continue with new user flow
        }
        
        if (!userId) {
          // First time user - generate and store ID
          userId = uuidv4();
          await storageService.setStoredUserId(userId);
          // New user - show onboarding
          await setOnboardingComplete(false);
        } else {
          // Existing user - check onboarding status and profile
          if (onboardingComplete) {
            // Onboarding was completed - try to load profile
            try {
              await loadProfile(userId);
              // Profile found - confirm onboarding complete
              await setOnboardingComplete(true);
            } catch {
              // Profile missing but onboarding was complete - might be corrupted
              // Reset onboarding to allow user to recreate profile
              console.warn('Profile missing but onboarding was complete, resetting onboarding');
              await setOnboardingComplete(false);
            }
          } else {
            // Onboarding not complete - check if profile exists anyway
            try {
              await loadProfile(userId);
              // Profile exists but onboarding not marked complete - mark it now
              await setOnboardingComplete(true);
            } catch {
              // No profile - show onboarding
              await setOnboardingComplete(false);
            }
          }
        }

        // Initialize subscription service
        try {
          await initializeSubscription();
        } catch (subError) {
          console.error('Subscription initialization error:', subError);
          // Continue anyway - subscriptions can be initialized later
        }

        // Initialize background tracking (non-blocking with timeout)
        // Don't await - let it run in background to prevent blocking app startup
        Promise.race([
          (async () => {
            try {
              await backgroundTrackingService.initialize();
              
              // Check for active sessions and recover tracking (non-blocking)
              if (userId) {
                try {
                  const activeSession = await sleepService.getActiveSession(userId);
                  if (activeSession) {
                    console.log('🔄 Found active session, recovering tracking:', activeSession.id);
                    
                    // Process sensor data in background (non-blocking)
                    // Don't await - let it run in background
                    sensorDataProcessor.needsProcessing(activeSession.id)
                      .then((needsProcessing) => {
                        if (needsProcessing) {
                          console.log('📊 Processing raw sensor data from background service (background task)...');
                          // Process with timeout to prevent hanging
                          return Promise.race([
                            sensorDataProcessor.processSessionData(activeSession.id),
                            new Promise((_, reject) =>
                              setTimeout(() => reject(new Error('Processing timeout')), 10000)
                            )
                          ]);
                        }
                      })
                      .then((processed) => {
                        if (processed && processed > 0) {
                          console.log(`✅ Processed ${processed} raw sensor data points`);
                        }
                      })
                      .catch((error) => {
                        console.warn('Failed to process raw sensor data on app init:', error);
                        // Don't block - processing can happen later
                      });
                  }
                } catch (error) {
                  console.warn('Failed to get active session:', error);
                }
              }
            } catch (error) {
              console.warn('Background tracking initialization error:', error);
            }
          })(),
          new Promise((_, reject) =>
            setTimeout(() => {
              console.warn('Background tracking init timeout - continuing anyway');
              reject(new Error('Background tracking init timeout'));
            }, 3000)
          )
        ]).catch((error) => {
          console.warn('Background tracking init timeout or error:', error);
          // Don't block app initialization
        });

        clearTimeout(initTimeout);
        setIsReady(true);
      } catch (err) {
        console.error('App initialization failed:', err);
        setError(err as Error);
        clearTimeout(initTimeout);
        setIsReady(true); // Still set ready to allow app to load
      }
    };

    initialize();
  }, [loadProfile, setOnboardingComplete, initializeSubscription]);

  return { isReady, error, hasProfile: !!profile };
};

