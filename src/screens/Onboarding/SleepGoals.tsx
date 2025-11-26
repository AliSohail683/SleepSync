/**
 * Onboarding - Sleep Goals Screen
 * Set sleep duration and schedule goals
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Card } from '@/components';
import { colors, typography, spacing } from '@/config/theme';

interface SleepGoalsProps {
  onNext: (data: {
    sleepGoalHours: number;
    averageBedtime: string;
    averageWakeTime: string;
  }) => void;
  onBack: () => void;
}

export const SleepGoals: React.FC<SleepGoalsProps> = ({ onNext, onBack }) => {
  const [sleepGoal, setSleepGoal] = useState(8);
  const [bedtime, setBedtime] = useState('22:00');
  const [wakeTime, setWakeTime] = useState('06:00');

  const sleepHours = [6, 7, 8, 9, 10];
  const bedtimes = ['21:00', '22:00', '23:00', '00:00'];
  const wakeTimes = ['05:00', '06:00', '07:00', '08:00'];

  const handleNext = () => {
    onNext({
      sleepGoalHours: sleepGoal,
      averageBedtime: bedtime,
      averageWakeTime: wakeTime,
    });
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.step}>Step 2 of 5</Text>
            <Text style={styles.title}>Your Sleep Goals</Text>
            <Text style={styles.subtitle}>
              Help us understand your ideal sleep schedule
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How many hours do you want to sleep?</Text>
            <View style={styles.optionRow}>
              {sleepHours.map((hours) => (
                <Card
                  key={hours}
                  onPress={() => setSleepGoal(hours)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    sleepGoal === hours && styles.optionCardSelected,
                  ])}
                >
                  <Text
                    style={[
                      styles.optionText,
                      sleepGoal === hours && styles.optionTextSelected,
                    ]}
                  >
                    {hours}h
                  </Text>
                </Card>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>When do you usually go to bed?</Text>
            <View style={styles.optionRow}>
              {bedtimes.map((time) => (
                <Card
                  key={time}
                  onPress={() => setBedtime(time)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    bedtime === time && styles.optionCardSelected,
                  ])}
                >
                  <Text
                    style={[
                      styles.optionText,
                      bedtime === time && styles.optionTextSelected,
                    ]}
                  >
                    {time}
                  </Text>
                </Card>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>When do you usually wake up?</Text>
            <View style={styles.optionRow}>
              {wakeTimes.map((time) => (
                <Card
                  key={time}
                  onPress={() => setWakeTime(time)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    wakeTime === time && styles.optionCardSelected,
                  ])}
                >
                  <Text
                    style={[
                      styles.optionText,
                      wakeTime === time && styles.optionTextSelected,
                    ]}
                  >
                    {time}
                  </Text>
                </Card>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Back" onPress={onBack} variant="ghost" />
          <View style={{ width: spacing.md }} />
          <Button title="Next" onPress={handleNext} style={{ flex: 1 }} />
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
    marginBottom: spacing['2xl'],
  },
  step: {
    fontSize: typography.sizes.sm,
    color: colors.primary.light,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    lineHeight: typography.lineHeights.relaxed * typography.sizes.base,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  optionCard: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  optionCardSelected: {
    backgroundColor: colors.primary.main,
  },
  optionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  optionTextSelected: {
    color: colors.text.primary,
    fontWeight: typography.weights.bold,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
});

