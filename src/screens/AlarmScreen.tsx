/**
 * Alarm Screen
 * Full-screen alarm that rings continuously until dismissed
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Vibration,
  AppState,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Sound from 'react-native-sound';
import { GradientBackground, Button } from '../components';
import { colors, typography, spacing } from '../config/theme';
import { useAlarmStore } from '../store/alarmStore';

interface AlarmScreenProps {
  alarmId?: string;
  onDismiss: () => void;
}

export const AlarmScreen: React.FC<AlarmScreenProps> = ({ alarmId, onDismiss }) => {
  const { alarms } = useAlarmStore();
  const [time, setTime] = useState(new Date());
  const soundRef = useRef<Sound | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const alarm = alarmId ? alarms.find(a => a.id === alarmId) : null;

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Start alarm sound
    startAlarmSound();

    // Start vibration pattern
    if (alarm?.vibrationEnabled) {
      startVibration();
    }

    // Handle app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - ensure alarm is still playing
        if (!soundRef.current?.isPlaying()) {
          startAlarmSound();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      clearInterval(timeInterval);
      stopAlarmSound();
      stopVibration();
      subscription.remove();
    };
  }, [alarmId, alarm?.vibrationEnabled]);

  const startAlarmSound = () => {
    try {
      // Release previous sound if exists
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
      }

      // Load and play alarm sound
      const soundFile = alarm?.gentleWake ? 'gentle_alarm.mp3' : 'alarm.mp3';
      const sound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.error('Failed to load alarm sound:', error);
          // Fallback to default system sound
          const defaultSound = new Sound('default', Sound.MAIN_BUNDLE);
          defaultSound.setNumberOfLoops(-1); // Loop infinitely
          defaultSound.setVolume(1.0);
          defaultSound.play();
          soundRef.current = defaultSound;
          return;
        }

        sound.setNumberOfLoops(-1); // Loop infinitely
        sound.setVolume(1.0);
        sound.play((success) => {
          if (!success) {
            console.error('Failed to play alarm sound');
          }
        });
        soundRef.current = sound;
      });
    } catch (error) {
      console.error('Error starting alarm sound:', error);
    }
  };

  const stopAlarmSound = () => {
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current.release();
      soundRef.current = null;
    }
  };

  const startVibration = () => {
    // Vibrate pattern: vibrate for 500ms, pause for 500ms, repeat
    const vibratePattern = [0, 500, 500, 500];

    vibrationIntervalRef.current = setInterval(() => {
      Vibration.vibrate(vibratePattern);
    }, 2000);
  };

  const stopVibration = () => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    Vibration.cancel();
  };

  const handleDismiss = () => {
    stopAlarmSound();
    stopVibration();
    onDismiss();
  };

  const handleSnooze = () => {
    stopAlarmSound();
    stopVibration();
    // Snooze for 5 minutes
    setTimeout(() => {
      startAlarmSound();
      if (alarm?.vibrationEnabled) {
        startVibration();
      }
    }, 5 * 60 * 1000);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <GradientBackground variant="alarm">
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.timeContainer}>
            <Text style={styles.time}>{formatTime(time)}</Text>
            <Text style={styles.date}>
              {time.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.emoji}>🌅</Text>
            <Text style={styles.title}>Time to Wake Up!</Text>
            {alarm?.gentleWake && (
              <Text style={styles.subtitle}>
                You're in a light sleep phase
              </Text>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Snooze (5 min)"
              onPress={handleSnooze}
              variant="secondary"
              size="large"
              style={styles.button}
            />
            <Button
              title="Dismiss"
              onPress={handleDismiss}
              variant="primary"
              size="large"
              style={styles.button}
            />
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  time: {
    fontSize: 72,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  date: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  button: {
    width: '100%',
  },
});

