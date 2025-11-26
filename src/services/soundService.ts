/**
 * Sound Service
 * Manages audio playback for soundscapes and sleep sounds
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';
import { SoundProfile, UserProfile, SleepSession, UUID } from '@/models';
import { storageService } from './storageService';
import { generateSoundProfile, createDefaultSoundProfile } from '@/utils/soundUtils';
import { APP_CONFIG } from '@/config/constants';

interface PlaybackControls {
  sound: Sound;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  fadeIn: (duration: number) => Promise<void>;
  fadeOut: (duration: number) => Promise<void>;
}

class SoundService {
  private currentSound: Sound | null = null;
  private isFading = false;

  /**
   * Initialize audio mode for background playback
   */
  async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('✅ Audio mode configured for background playback');
    } catch (error) {
      console.error('❌ Failed to set audio mode:', error);
    }
  }

  /**
   * Generate a personalized sound profile for a user
   */
  async generateProfileForUser(
    userProfile: UserProfile,
    lastSessions: SleepSession[]
  ): Promise<SoundProfile> {
    const profileData = generateSoundProfile(userProfile, lastSessions);
    
    const soundProfile: SoundProfile = {
      ...profileData,
      id: require('uuid').v4(),
      createdAt: new Date().toISOString(),
      isActive: false,
    };

    await storageService.createSoundProfile(soundProfile);
    console.log('✅ Generated sound profile:', soundProfile.name);
    
    return soundProfile;
  }

  /**
   * Play a sound profile with optional configuration
   */
  async playSound(
    profile: SoundProfile,
    options?: {
      volume?: number;
      loop?: boolean;
      fadeIn?: boolean;
    }
  ): Promise<PlaybackControls> {
    // Stop any currently playing sound
    await this.stopSound();

    // Initialize audio if not already done
    await this.initializeAudio();

    // In a real app, we'd load actual audio files
    // For this implementation, we'll use a placeholder approach
    // You would replace this with actual audio file loading

    try {
      // Create a new sound instance
      // NOTE: In production, you'd load actual audio files from assets
      // Example: const { sound } = await Audio.Sound.createAsync(require('assets/sounds/rain.mp3'));
      
      // For demo purposes, we'll create a mock sound object
      const { sound } = await Audio.Sound.createAsync(
        // This would be your actual sound file
        { uri: this.getMockSoundUri(profile.baseType) },
        {
          isLooping: options?.loop !== false,
          volume: options?.volume || profile.volume || APP_CONFIG.audio.defaultVolume,
          shouldPlay: true,
        },
        this.onPlaybackStatusUpdate
      );

      this.currentSound = sound;

      // Fade in if requested
      if (options?.fadeIn) {
        await this.fadeIn(sound, APP_CONFIG.audio.fadeInDuration);
      }

      // Create playback controls
      const controls: PlaybackControls = {
        sound,
        stop: async () => {
          await sound.stopAsync();
          await sound.unloadAsync();
          this.currentSound = null;
        },
        pause: async () => {
          await sound.pauseAsync();
        },
        resume: async () => {
          await sound.playAsync();
        },
        setVolume: async (volume: number) => {
          await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
        },
        fadeIn: async (duration: number) => {
          await this.fadeIn(sound, duration);
        },
        fadeOut: async (duration: number) => {
          await this.fadeOut(sound, duration);
        },
      };

      console.log('✅ Playing sound profile:', profile.name);
      return controls;
    } catch (error) {
      console.error('❌ Failed to play sound:', error);
      throw error;
    }
  }

  /**
   * Stop currently playing sound
   */
  async stopSound(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.fadeOut(this.currentSound, APP_CONFIG.audio.fadeOutDuration);
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
        this.currentSound = null;
        console.log('✅ Sound stopped');
      } catch (error) {
        console.error('❌ Failed to stop sound:', error);
      }
    }
  }

  /**
   * Fade in sound volume
   */
  private async fadeIn(sound: Sound, duration: number): Promise<void> {
    if (this.isFading) return;
    this.isFading = true;

    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = 1 / steps;

    try {
      for (let i = 0; i <= steps; i++) {
        await sound.setVolumeAsync(volumeStep * i);
        await new Promise((resolve) => setTimeout(resolve, stepDuration));
      }
    } finally {
      this.isFading = false;
    }
  }

  /**
   * Fade out sound volume
   */
  private async fadeOut(sound: Sound, duration: number): Promise<void> {
    if (this.isFading) return;
    this.isFading = true;

    const status = await sound.getStatusAsync();
    if (!status.isLoaded) {
      this.isFading = false;
      return;
    }

    const currentVolume = status.volume || 1;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = currentVolume / steps;

    try {
      for (let i = steps; i >= 0; i--) {
        await sound.setVolumeAsync(volumeStep * i);
        await new Promise((resolve) => setTimeout(resolve, stepDuration));
      }
    } finally {
      this.isFading = false;
    }
  }

  /**
   * Playback status update callback
   */
  private onPlaybackStatusUpdate(status: AVPlaybackStatus): void {
    if (status.isLoaded) {
      if (status.didJustFinish && !status.isLooping) {
        console.log('🎵 Sound playback finished');
      }
    } else if (status.error) {
      console.error('❌ Playback error:', status.error);
    }
  }

  /**
   * Get mock sound URI (in production, use actual audio files)
   */
  private getMockSoundUri(type: string): string {
    // In production, return actual file paths or remote URLs
    // For now, return a placeholder
    return `https://example.com/sounds/${type}.mp3`;
  }

  /**
   * Get all sound profiles for a user
   */
  async getSoundProfiles(userId: UUID): Promise<SoundProfile[]> {
    return await storageService.getSoundProfiles(userId);
  }

  /**
   * Create default sound profile for new user
   */
  async createDefaultProfile(userId: UUID): Promise<SoundProfile> {
    const profile = createDefaultSoundProfile(userId);
    await storageService.createSoundProfile(profile);
    return profile;
  }

  /**
   * Update sound profile
   */
  async updateProfile(profileId: UUID, updates: Partial<SoundProfile>): Promise<void> {
    await storageService.updateSoundProfile(profileId, updates);
  }

  /**
   * Delete sound profile
   */
  async deleteProfile(profileId: UUID): Promise<void> {
    await storageService.deleteSoundProfile(profileId);
  }
}

export const soundService = new SoundService();
export default soundService;

