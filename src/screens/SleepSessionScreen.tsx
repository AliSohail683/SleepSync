/**
 * Sleep Session Screen
 * Active sleep tracking with timer and controls
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Card } from '../components';
import { colors, typography, spacing, borderRadius } from '../config/theme';
import { useSleepStore } from '../store/sleepStore';
import { useUserStore } from '../store/userStore';

interface SleepSessionScreenProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const SleepSessionScreen: React.FC<SleepSessionScreenProps> = ({
  onComplete,
  onCancel,
}) => {
  const { currentSession, startSession, endSession, isLoading } = useSleepStore();
  const { profile } = useUserStore();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSession) return;
    
    const interval = setInterval(() => {
      const start = new Date(currentSession.startAt).getTime();
      const now = new Date().getTime();
      setElapsedTime(Math.floor((now - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = async (): Promise<void> => {
    if (!profile) {
      setError('Cannot start session: No user profile');
      return;
    }
    
    setError(null);
    
    // Wrap in additional try-catch to prevent any unhandled errors
    try {
      await startSession(profile.id).catch((error: any) => {
        // This catch handles any errors that might slip through
        console.error('Session start error (caught):', error);
        throw error; // Re-throw to be caught by outer try-catch
      });
    } catch (error: any) {
      console.error('Failed to start session:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to start sleep session. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.code) {
        errorMessage = `Error ${error.code}: ${error.message || 'Unknown error'}`;
      }
      
      setError(errorMessage);
      
      // Log full error for debugging
      console.error('Full error details:', JSON.stringify(error, null, 2));
    }
  };

  const handleEndSession = async (): Promise<void> => {
    try {
      await endSession();
      onComplete();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  if (!currentSession) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>🌙</Text>
            <Text style={styles.title}>Start Sleep Session</Text>
            <Text style={styles.subtitle}>
              Track your sleep quality, stages, and patterns
            </Text>

            <Card gradient style={styles.infoCard}>
              <Text style={styles.infoTitle}>What we'll track:</Text>
              <InfoItem icon="⏰" text="Sleep duration" />
              <InfoItem icon="📊" text="Sleep stages (Light, Deep, REM)" />
              <InfoItem icon="⭐" text="Sleep quality score" />
              <InfoItem icon="💤" text="Wake events" />
            </Card>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Button
                title={isLoading ? "Starting..." : "Start Session"}
                onPress={handleStartSession}
                size="large"
                fullWidth
                disabled={isLoading}
                loading={isLoading}
              />
              <Button
                title="Cancel"
                onPress={onCancel}
                variant="ghost"
                size="medium"
                fullWidth
                disabled={isLoading}
              />
            </View>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            <Text style={styles.emoji}>😴</Text>
            <Text style={styles.title}>Sleep Session Active</Text>
            <Text style={styles.subtitle}>
              Started at {new Date(currentSession.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>

            <View style={styles.timerContainer}>
              <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
              <Text style={styles.timerLabel}>Time Asleep</Text>
            </View>

            <View style={styles.statusCards}>
              <StatCard icon="🌊" label="Stage" value="Light" />
              <StatCard icon="💤" label="Quality" value="Good" />
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <Button
            title="End Session"
            onPress={handleEndSession}
            size="large"
            fullWidth
            disabled={isLoading}
            loading={isLoading}
          />
          <Text style={styles.hint}>
            Your sleep will be analyzed when you end the session
          </Text>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

interface InfoItemProps {
  icon: string;
  text: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, text }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <Text style={styles.infoText}>{text}</Text>
  </View>
);

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <Card style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Card>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  content: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  footer: {
    width: '100%',
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: spacing['2xl'],
    width: '100%',
  },
  timer: {
    fontSize: 64,
    fontWeight: typography.weights.bold,
    color: colors.primary.light,
    letterSpacing: 2,
    textAlign: 'center',
    includeFontPadding: false,
  },
  timerLabel: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  infoCard: {
    width: '100%',
    marginBottom: spacing['2xl'],
  },
  infoTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  infoText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  statusCards: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  hint: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  errorContainer: {
    width: '100%',
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    textAlign: 'center',
  },
});

