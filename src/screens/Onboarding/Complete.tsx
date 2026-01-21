/**
 * Onboarding - Complete Screen
 * Final onboarding screen with completion message
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button } from '../../components';
import { colors, typography, spacing } from '../../config/theme';

interface CompleteProps {
  onComplete: () => void;
  summary?: {
    sleepGoalHours: number;
    averageBedtime: string | null;
    averageWakeTime: string | null;
    estimatedCurrentHours: number | null;
    estimatedWeeklyDebt: number | null;
    weekdayBedtime?: string | null;
    weekdayWakeTime?: string | null;
    weekendBedtime?: string | null;
    weekendWakeTime?: string | null;
    fatigueLevel?: number;
    performanceGoals?: string[];
  };
}

export const Complete: React.FC<CompleteProps> = ({ onComplete, summary }) => {
  const goal = summary?.sleepGoalHours ?? 8;
  const current = summary?.estimatedCurrentHours ?? null;
  const weeklyDebt = summary?.estimatedWeeklyDebt ?? null;
   const fatigue = summary?.fatigueLevel;
   const goals = summary?.performanceGoals ?? [];

  const primaryGoalLabel = goals[0] === 'sport'
    ? 'performance'
    : goals[0] === 'aesthetics'
    ? 'how you look and feel'
    : goals[0] === 'mood'
    ? 'your mood and focus'
    : 'your work and study output';

  const primaryLine =
    current !== null
      ? `You're currently getting about ${current.toFixed(
          1
        )} hours vs your goal of ${goal.toFixed(1)} hours.`
      : `Your target is around ${goal.toFixed(
          1
        )} hours of sleep per night.`;

  const debtLine =
    weeklyDebt !== null && weeklyDebt > 0.5
      ? `That adds up to roughly ${weeklyDebt.toFixed(
          1
        )} hours of lost sleep every week. That is absolutely capping ${primaryGoalLabel}. SleepSync will help you claw that back.`
      : 'You’re in a good range. SleepSync will help you keep it consistent and aligned with your goals.';

  const fatigueLine =
    fatigue && fatigue >= 4
      ? 'Based on how wrecked you feel most mornings, we’ll treat this as a serious recovery project, not a casual wellness tweak.'
      : 'We’ll nudge you toward a schedule that feels natural instead of forcing willpower every night.';

  return (
    <GradientBackground variant="success">
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>You're All Set!</Text>
          <Text style={styles.subtitle}>
            {primaryLine}
            {'\n'}
            {debtLine}
            {'\n'}
            {fatigueLine}
          </Text>

          <View style={styles.features}>
            <FeatureItem
              icon="✅"
              text="Sleep tracking configured"
            />
            <FeatureItem
              icon="✅"
              text="AI soundscapes personalized"
            />
            <FeatureItem
              icon="✅"
              text="Smart alarm ready"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Start Tracking Sleep"
            onPress={onComplete}
            fullWidth
            size="large"
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

interface FeatureItemProps {
  icon: string;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text }) => {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 100,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed * typography.sizes.lg,
    marginBottom: spacing['3xl'],
  },
  features: {
    gap: spacing.md,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlay.medium,
    padding: spacing.lg,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  featureText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});

