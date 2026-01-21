/**
 * Sound Store
 * Manages soundscape profiles and playback state
 */

import { create } from 'zustand';
import { SoundProfile, UUID } from '../models';
import { soundService } from '../services/soundService';

interface SoundState {
  profiles: SoundProfile[];
  activeProfile: SoundProfile | null;
  isPlaying: boolean;
  isLoading: boolean;
  
  // Actions
  loadProfiles: (userId: UUID) => Promise<void>;
  createProfile: (profile: SoundProfile) => Promise<void>;
  updateProfile: (profileId: UUID, updates: Partial<SoundProfile>) => Promise<void>;
  deleteProfile: (profileId: UUID) => Promise<void>;
  playProfile: (profile: SoundProfile) => Promise<void>;
  stopPlayback: () => Promise<void>;
  setActiveProfile: (profile: SoundProfile | null) => void;
}

export const useSoundStore = create<SoundState>((set, get) => ({
  profiles: [],
  activeProfile: null,
  isPlaying: false,
  isLoading: false,

  loadProfiles: async (userId: UUID) => {
    set({ isLoading: true });
    try {
      const profiles = await soundService.getSoundProfiles(userId);
      set({ profiles, isLoading: false });
    } catch (error) {
      console.error('Failed to load sound profiles:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createProfile: async (profile: SoundProfile) => {
    try {
      await soundService.createDefaultProfile(profile.userId);
      await get().loadProfiles(profile.userId);
    } catch (error) {
      console.error('Failed to create profile:', error);
      throw error;
    }
  },

  updateProfile: async (profileId: UUID, updates: Partial<SoundProfile>) => {
    try {
      await soundService.updateProfile(profileId, updates);
      
      // Update local state
      const profiles = get().profiles.map(p =>
        p.id === profileId ? { ...p, ...updates } : p
      );
      set({ profiles });
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  },

  deleteProfile: async (profileId: UUID) => {
    try {
      await soundService.deleteProfile(profileId);
      
      const profiles = get().profiles.filter(p => p.id !== profileId);
      set({ profiles });
    } catch (error) {
      console.error('Failed to delete profile:', error);
      throw error;
    }
  },

  playProfile: async (profile: SoundProfile) => {
    try {
      await soundService.playSound(profile, { fadeIn: true });
      set({ activeProfile: profile, isPlaying: true });
    } catch (error) {
      console.error('Failed to play profile:', error);
      throw error;
    }
  },

  stopPlayback: async () => {
    try {
      await soundService.stopSound();
      set({ isPlaying: false, activeProfile: null });
    } catch (error) {
      console.error('Failed to stop playback:', error);
      throw error;
    }
  },

  setActiveProfile: (profile: SoundProfile | null) => {
    set({ activeProfile: profile });
  },
}));

