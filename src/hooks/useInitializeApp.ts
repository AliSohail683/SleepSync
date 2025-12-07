/**
 * App Initialization Hook
 * Handles app startup logic
 */

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import storageService from '../services/storageService';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useUserStore } from '../store/userStore';

export const useInitializeApp = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { loadProfile, profile, setOnboardingComplete } = useUserStore();
  const { initialize: initializeSubscription } = useSubscriptionStore();

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize database
        await storageService.setupDB();

        // Try to load existing user profile
        // In a real app, you'd have proper user ID management
        const userId = uuidv4(); // For demo, generate new ID each time
        
        try {
          await loadProfile(userId);
          setOnboardingComplete(true);
        } catch {
          // No profile exists, user needs to onboard
          setOnboardingComplete(false);
        }

        // Initialize subscription service
        await initializeSubscription();

        setIsReady(true);
      } catch (err) {
        console.error('App initialization failed:', err);
        setError(err as Error);
        setIsReady(true); // Still set ready to allow app to load
      }
    };

    initialize();
  }, []);

  return { isReady, error, hasProfile: !!profile };
};

