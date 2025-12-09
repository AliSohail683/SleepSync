/**
 * User Store
 * Manages user profile and authentication state
 */

import { create } from 'zustand';
import { UserProfile, UUID } from '../models';
import { storageService } from '../services/storageService';
import { v4 as uuidv4 } from 'uuid';

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  isOnboardingComplete: boolean;
  
  // Actions
  loadProfile: (userId: UUID) => Promise<void>;
  createProfile: (data: Partial<UserProfile>) => Promise<UserProfile>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  setOnboardingComplete: (complete: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isLoading: false,
  isOnboardingComplete: false,

  loadProfile: async (userId: UUID) => {
    set({ isLoading: true });
    try {
      const profile = await storageService.getUserProfile(userId);
      set({ profile, isLoading: false });
    } catch (error) {
      console.error('Failed to load profile:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createProfile: async (data: Partial<UserProfile>) => {
    // Get or create user ID
    let userId = await storageService.getStoredUserId();
    if (!userId) {
      userId = uuidv4();
      await storageService.setStoredUserId(userId);
    }

    const profile: UserProfile = {
      id: userId,
      ageRange: data.ageRange || null,
      gender: data.gender,
      sleepGoalHours: data.sleepGoalHours || 8,
      averageBedtime: data.averageBedtime || null,
      averageWakeTime: data.averageWakeTime || null,
      caffeineHabits: data.caffeineHabits || 'moderate',
      screenBeforeBed: data.screenBeforeBed || false,
      roomTemperaturePrefC: data.roomTemperaturePrefC,
      noiseSensitivity: data.noiseSensitivity || 'medium',
      createdAt: new Date().toISOString(),
    };

    await storageService.createUserProfile(profile);
    set({ profile });
    return profile;
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { profile } = get();
    if (!profile) throw new Error('No profile to update');

    await storageService.updateUserProfile(profile.id, updates);
    
    const updatedProfile = await storageService.getUserProfile(profile.id);
    set({ profile: updatedProfile });
  },

  setOnboardingComplete: async (complete: boolean) => {
    // Persist to storage
    await storageService.setOnboardingComplete(complete);
    set({ isOnboardingComplete: complete });
  },

  logout: async () => {
    await storageService.clearStoredUserId();
    await storageService.clearOnboardingComplete();
    set({ profile: null, isOnboardingComplete: false });
  },
}));

