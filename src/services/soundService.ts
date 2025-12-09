/**
 * Sound Service
 * Manages audio playback for soundscapes and sleep sounds
 */

import Sound from 'react-native-sound';
import { SoundProfile, UserProfile, SleepSession, UUID } from '@/models';
import { storageService } from './storageService';
import { generateSoundProfile, createDefaultSoundProfile } from '@/utils/soundUtils';
import { APP_CONFIG } from '../config/constants';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback', true);

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
      // react-native-sound handles background playback automatically
      // when Sound.setCategory is called
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
      // Example: const sound = new Sound('rain.mp3', Sound.MAIN_BUNDLE);
      
      return new Promise<PlaybackControls>((resolve, reject) => {
        // Get sound file path (must be in app bundle or remote URL)
        const soundUri = this.getSoundUri(profile.baseType);
        const sound = new Sound(soundUri, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.error('❌ Failed to load sound:', error);
            reject(error);
            return;
          }

          // Set volume
          const volume = options?.volume || profile.volume || APP_CONFIG.audio.defaultVolume;
          sound.setVolume(volume);
          
          // Set looping
          if (options?.loop !== false) {
            sound.setNumberOfLoops(-1); // -1 means infinite loop
          }

          this.currentSound = sound;

          // Play the sound
          sound.play((success) => {
            if (!success) {
              console.error('❌ Failed to play sound');
            }
          });

          // Fade in if requested
          if (options?.fadeIn) {
            this.fadeIn(sound, APP_CONFIG.audio.fadeInDuration);
          }

          // Create playback controls
          const controls: PlaybackControls = {
            sound,
            stop: async () => {
              sound.stop(() => {
                sound.release();
                this.currentSound = null;
              });
            },
            pause: async () => {
              sound.pause();
            },
            resume: async () => {
              sound.play();
            },
            setVolume: async (volume: number) => {
              sound.setVolume(Math.max(0, Math.min(1, volume)));
            },
            fadeIn: async (duration: number) => {
              await this.fadeIn(sound, duration);
            },
            fadeOut: async (duration: number) => {
              await this.fadeOut(sound, duration);
            },
          };

          console.log('✅ Playing sound profile:', profile.name);
          resolve(controls);
        });
      });
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
        this.currentSound.stop(() => {
          this.currentSound?.release();
          this.currentSound = null;
        });
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
        sound.setVolume(volumeStep * i);
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

    // Get current volume (default to 1 if not available)
    const currentVolume = 1; // react-native-sound doesn't have getVolume, so we track it
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = currentVolume / steps;

    try {
      for (let i = steps; i >= 0; i--) {
        sound.setVolume(volumeStep * i);
        await new Promise((resolve) => setTimeout(resolve, stepDuration));
      }
    } finally {
      this.isFading = false;
    }
  }


  /**
   * Get sound file URI
   * Returns path to audio file in app bundle or remote URL
   * NOTE: Audio files must be added to the app bundle (ios/SleepSync/ or android/app/src/main/res/raw/)
   */
  private getSoundUri(type: string): string {
    // For react-native-sound, use relative paths for bundled assets
    // Example: 'rain.mp3' for files in ios/SleepSync/ or android/app/src/main/res/raw/
    // Or use full URLs for remote audio files
    // TODO: Add actual audio files to app bundle and update paths here
    return `${type}.mp3`; // Must exist in app bundle
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

