/**
 * Manual Sleep Log Screen
 * Allows users to manually log sleep sessions with bed/wake times, rested score, and awakenings
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Card, Button, Input } from '../../components';
import { colors, typography, spacing } from '../../config/theme';
import { useUserStore } from '../../store/userStore';
import { sleepService } from '../../services/sleepService';
import { v4 as uuidv4 } from 'uuid';
import { formatTime, createTimeString, parseTimeString } from '../../utils/dateUtils';
import { getStartOfDayLocal } from '../../utils/dateUtils';

interface ManualSleepLogScreenProps {
  onClose: () => void;
  onSave: () => void;
}

export const ManualSleepLogScreen: React.FC<ManualSleepLogScreenProps> = ({
  onClose,
  onSave,
}) => {
  const { profile } = useUserStore();
  const [bedTime, setBedTime] = useState<string>('');
  const [wakeTime, setWakeTime] = useState<string>('');
  const [restedScore, setRestedScore] = useState<number | null>(null);
  const [awakenings, setAwakenings] = useState<string>('0');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-suggest times based on user's profile or recent patterns
  useEffect(() => {
    if (profile) {
      // Suggest bedtime from profile
      if (profile.averageBedtime) {
        setBedTime(profile.averageBedtime);
      } else {
        // Default suggestion: 11 PM
        setBedTime('23:00');
      }

      // Suggest wake time from profile
      if (profile.averageWakeTime) {
        setWakeTime(profile.averageWakeTime);
      } else {
        // Default suggestion: 7 AM
        setWakeTime('07:00');
      }
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) {
      setError('No user profile found');
      return;
    }

    if (!bedTime || !wakeTime) {
      setError('Please enter both bedtime and wake time');
      return;
    }

    // Validate time format
    const bedMatch = bedTime.match(/^(\d{1,2}):(\d{2})$/);
    const wakeMatch = wakeTime.match(/^(\d{1,2}):(\d{2})$/);

    if (!bedMatch || !wakeMatch) {
      setError('Please enter times in HH:MM format (e.g., 23:00)');
      return;
    }

    const bedHours = parseInt(bedMatch[1], 10);
    const bedMins = parseInt(bedMatch[2], 10);
    const wakeHours = parseInt(wakeMatch[1], 10);
    const wakeMins = parseInt(wakeMatch[2], 10);

    if (
      bedHours < 0 ||
      bedHours > 23 ||
      bedMins < 0 ||
      bedMins > 59 ||
      wakeHours < 0 ||
      wakeHours > 23 ||
      wakeMins < 0 ||
      wakeMins > 59
    ) {
      setError('Invalid time values');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Calculate sleep session dates
      // If bedtime is late (after midnight), assume it's the previous day
      const today = new Date();
      const bedDate = new Date(today);
      bedDate.setHours(bedHours, bedMins, 0, 0);

      // If bedtime is after 6 AM, assume it's the previous night
      if (bedHours >= 0 && bedHours < 6) {
        bedDate.setDate(bedDate.getDate() - 1);
      }

      const wakeDate = new Date(today);
      wakeDate.setHours(wakeHours, wakeMins, 0, 0);

      // If wake time is before bedtime, assume it's the next day
      if (wakeDate <= bedDate) {
        wakeDate.setDate(wakeDate.getDate() + 1);
      }

      const durationMin = Math.round((wakeDate.getTime() - bedDate.getTime()) / (1000 * 60));

      if (durationMin < 60 || durationMin > 16 * 60) {
        setError('Sleep duration must be between 1 and 16 hours');
        setIsSaving(false);
        return;
      }

      // Create sleep session
      const session = {
        id: uuidv4(),
        userId: profile.id,
        startAt: bedDate.toISOString(),
        endAt: wakeDate.toISOString(),
        durationMin,
        awakeCount: parseInt(awakenings, 10) || 0,
        notes: restedScore !== null ? `Rested score: ${restedScore}/5` : undefined,
      };

      // Save via storage service directly (manual log, so we have both start and end times)
      const { storageService } = await import('../../services/storageService');
      if (!storageService.isInitialized()) {
        await storageService.setupDB();
      }
      await storageService.createSleepSession(session as any);
      
      // Evaluate the session to get score and stages
      await sleepService.evaluateSession(session as any);

      onSave();
    } catch (err: any) {
      console.error('Failed to save manual sleep log:', err);
      setError(err?.message || 'Failed to save sleep log. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const RestedScoreButton: React.FC<{ score: number }> = ({ score }) => (
    <TouchableOpacity
      onPress={() => setRestedScore(score)}
      style={[
        styles.scoreButton,
        restedScore === score && styles.scoreButtonSelected,
      ]}
    >
      <Text
        style={[
          styles.scoreButtonText,
          restedScore === score && styles.scoreButtonTextSelected,
        ]}
      >
        {score}
      </Text>
    </TouchableOpacity>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Log Sleep Manually</Text>
            <Text style={styles.subtitle}>
              Enter your sleep times from last night
            </Text>
          </View>

          {error && (
            <Card style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          )}

          <Card style={styles.formCard}>
            <Input
              label="Bedtime (HH:MM)"
              value={bedTime}
              onChangeText={setBedTime}
              placeholder="23:00"
              keyboardType="numeric"
            />

            <Input
              label="Wake Time (HH:MM)"
              value={wakeTime}
              onChangeText={setWakeTime}
              placeholder="07:00"
              keyboardType="numeric"
            />

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>How rested did you feel? (1-5)</Text>
              <View style={styles.scoreRow}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <RestedScoreButton key={score} score={score} />
                ))}
              </View>
              <Text style={styles.scoreHint}>
                1 = Exhausted, 5 = Fully refreshed
              </Text>
            </View>

            <Input
              label="Approximate awakenings"
              value={awakenings}
              onChangeText={setAwakenings}
              placeholder="0"
              keyboardType="numeric"
            />
          </Card>

          <View style={styles.hintCard}>
            <Text style={styles.hintText}>
              💡 Tip: Times are auto-suggested based on your profile. Adjust as needed.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={onClose}
            variant="ghost"
            size="medium"
            style={styles.footerButton}
          />
          <Button
            title={isSaving ? 'Saving...' : 'Save Sleep Log'}
            onPress={handleSave}
            size="medium"
            style={styles.footerButton}
            disabled={isSaving}
            loading={isSaving}
          />
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
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  scoreButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scoreButtonSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.light,
  },
  scoreButtonText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.secondary,
  },
  scoreButtonTextSelected: {
    color: colors.text.primary,
  },
  scoreHint: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  hintCard: {
    backgroundColor: colors.background.tertiary,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  hintText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  errorCard: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});

