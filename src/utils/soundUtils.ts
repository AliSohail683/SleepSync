/**
 * Sound and audio utility functions
 */

import { SoundProfile, UserProfile, SleepSession } from '@/models';
import { SOUNDSCAPE_TYPES } from '@/config/constants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a personalized sound profile based on user preferences and sleep data
 * This is a deterministic algorithm that can be unit tested
 */
export const generateSoundProfile = (
  userProfile: UserProfile,
  recentSessions: SleepSession[]
): Omit<SoundProfile, 'id' | 'createdAt'> => {
  let baseType: SoundProfile['baseType'] = 'white';
  const blend: Array<{ type: string; level: number }> = [];

  // Select base type based on noise sensitivity
  if (userProfile.noiseSensitivity === 'high') {
    baseType = 'white';
    blend.push({ type: 'pink', level: 0.3 });
  } else if (userProfile.noiseSensitivity === 'medium') {
    baseType = 'rain';
    blend.push({ type: 'ocean', level: 0.2 });
  } else {
    baseType = 'brown';
    blend.push({ type: 'forest', level: 0.25 });
  }

  // Adjust based on average sleep quality
  if (recentSessions.length > 0) {
    const avgScore = recentSessions.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / recentSessions.length;
    
    if (avgScore < 60) {
      // Poor sleep - try more calming sounds
      baseType = 'ocean';
      blend.push({ type: 'rain', level: 0.35 });
    }
  }

  return {
    userId: userProfile.id,
    name: `Custom ${baseType.charAt(0).toUpperCase() + baseType.slice(1)}`,
    baseType,
    blend,
    volume: 0.5,
  };
};

/**
 * Mix multiple sound layers with specified levels
 */
export const mixSoundLayers = (
  layers: Array<{ type: string; level: number }>
): Array<{ type: string; volume: number }> => {
  // Normalize levels so total doesn't exceed 1.0
  const totalLevel = layers.reduce((sum, layer) => sum + layer.level, 1.0);
  const normalizer = totalLevel > 1.0 ? 1.0 / totalLevel : 1.0;

  return layers.map((layer) => ({
    type: layer.type,
    volume: layer.level * normalizer,
  }));
};

/**
 * Get sound file path for a given soundscape type
 */
export const getSoundFilePath = (type: string): string => {
  // In production, these would be actual audio files
  // For now, return placeholder paths
  return `assets/sounds/${type}.mp3`;
};

/**
 * Validate sound profile data
 */
export const validateSoundProfile = (profile: Partial<SoundProfile>): boolean => {
  if (!profile.baseType) return false;
  if (profile.volume && (profile.volume < 0 || profile.volume > 1)) return false;
  
  const validTypes = SOUNDSCAPE_TYPES.map(t => t.id);
  if (!validTypes.includes(profile.baseType)) return false;

  return true;
};

/**
 * Create a default sound profile for a user
 */
export const createDefaultSoundProfile = (userId: string): SoundProfile => {
  return {
    id: uuidv4(),
    userId,
    name: 'Default White Noise',
    baseType: 'white',
    blend: [],
    volume: 0.5,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
};

