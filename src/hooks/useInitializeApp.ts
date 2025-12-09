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

export const useInitializeApp = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { loadProfile, profile, setOnboardingComplete } = useUserStore();
  const { initialize: initializeSubscription } = useSubscriptionStore();

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize enhanced database
        await database.initialize();
        // Also initialize legacy storage service for backward compatibility
        await storageService.setupDB();

        // Get or create persistent user ID
        // Check if user ID exists in storage
        let userId = await storageService.getStoredUserId();
        
        // Check onboarding completion status from storage
        const onboardingComplete = await storageService.getOnboardingComplete();
        
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
        await initializeSubscription();

        // Initialize background tracking
        try {
          await backgroundTrackingService.initialize();
          
          // Check for active sessions and recover tracking
          if (userId) {
            const activeSession = await sleepService.getActiveSession(userId);
            if (activeSession) {
              console.log('🔄 Found active session, recovering tracking:', activeSession.id);
            }
          }
        } catch (error) {
          console.warn('Failed to initialize background tracking:', error);
          // Don't block app initialization
        }

        setIsReady(true);
      } catch (err) {
        console.error('App initialization failed:', err);
        setError(err as Error);
        setIsReady(true); // Still set ready to allow app to load
      }
    };

    initialize();
  }, [loadProfile, setOnboardingComplete, initializeSubscription]);

  return { isReady, error, hasProfile: !!profile };
};

