/**
 * Onboarding - Sleep Goals Screen
 * Set sleep duration and schedule goals
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Card } from '../../components';
import { colors, typography, spacing } from '../../config/theme';

interface SleepGoalsProps {
  onNext: (data: {
    sleepGoalHours: number;
    averageBedtime: string;
    averageWakeTime: string;
    weekdayBedtime: string;
    weekdayWakeTime: string;
    weekendBedtime: string;
    weekendWakeTime: string;
    performanceGoals: string[];
  }) => void;
  onBack: () => void;
}

export const SleepGoals: React.FC<SleepGoalsProps> = ({ onNext, onBack }) => {
  const [sleepGoal, setSleepGoal] = useState(8);
  const [bedtime, setBedtime] = useState('22:00');
  const [wakeTime, setWakeTime] = useState('06:00');
  const [weekdayBedtime, setWeekdayBedtime] = useState('23:00');
  const [weekdayWakeTime, setWeekdayWakeTime] = useState('07:00');
  const [weekendBedtime, setWeekendBedtime] = useState('00:00');
  const [weekendWakeTime, setWeekendWakeTime] = useState('08:00');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['work_study']);

  const sleepHours = [6, 7, 8, 9, 10];
  const bedtimes = ['21:00', '22:00', '23:00', '00:00', '01:00'];
  const wakeTimes = ['05:00', '06:00', '07:00', '08:00', '09:00'];

  const performanceGoalOptions = [
    { value: 'work_study', label: 'Work / Study' },
    { value: 'sport', label: 'Sport / Gym' },
    { value: 'aesthetics', label: 'Aesthetics / Body' },
    { value: 'mood', label: 'Mood / Mental' },
  ];

  const toggleGoal = (value: string) => {
    setSelectedGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  };

  const handleNext = () => {
    onNext({
      sleepGoalHours: sleepGoal,
      averageBedtime: bedtime,
      averageWakeTime: wakeTime,
      weekdayBedtime,
      weekdayWakeTime,
      weekendBedtime,
      weekendWakeTime,
      performanceGoals: selectedGoals,
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
            <Text style={styles.sectionTitle}>Typical weekday schedule</Text>
            <Text style={styles.sectionSubtitle}>Mon–Thu / work or class days</Text>
            <View style={styles.optionRow}>
              {bedtimes.map((time) => (
                <Card
                  key={`wd-bed-${time}`}
                  onPress={() => setWeekdayBedtime(time)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    weekdayBedtime === time && styles.optionCardSelected,
                  ])}
                >
                  <Text
                    style={[
                      styles.optionText,
                      weekdayBedtime === time && styles.optionTextSelected,
                    ]}
                  >
                    Bed {time}
                  </Text>
                </Card>
              ))}
            </View>
            <View style={[styles.optionRow, { marginTop: spacing.md }]}>
              {wakeTimes.map((time) => (
                <Card
                  key={`wd-wake-${time}`}
                  onPress={() => setWeekdayWakeTime(time)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    weekdayWakeTime === time && styles.optionCardSelected,
                  ])}
                >
                  <Text
                    style={[
                      styles.optionText,
                      weekdayWakeTime === time && styles.optionTextSelected,
                    ]}
                  >
                    Wake {time}
                  </Text>
                </Card>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Typical weekend schedule</Text>
            <Text style={styles.sectionSubtitle}>Fri–Sun</Text>
            <View style={styles.optionRow}>
              {bedtimes.map((time) => (
                <Card
                  key={`we-bed-${time}`}
                  onPress={() => setWeekendBedtime(time)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    weekendBedtime === time && styles.optionCardSelected,
                  ])}
                >
                  <Text
                    style={[
                      styles.optionText,
                      weekendBedtime === time && styles.optionTextSelected,
                    ]}
                  >
                    Bed {time}
                  </Text>
                </Card>
              ))}
            </View>
            <View style={[styles.optionRow, { marginTop: spacing.md }]}>
              {wakeTimes.map((time) => (
                <Card
                  key={`we-wake-${time}`}
                  onPress={() => setWeekendWakeTime(time)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    weekendWakeTime === time && styles.optionCardSelected,
                  ])}
                >
                  <Text
                    style={[
                      styles.optionText,
                      weekendWakeTime === time && styles.optionTextSelected,
                    ]}
                  >
                    Wake {time}
                  </Text>
                </Card>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What are you optimizing for?</Text>
            <Text style={styles.sectionSubtitle}>
              We’ll frame your insights around these priorities.
            </Text>
            <View style={styles.optionRow}>
              {performanceGoalOptions.map((option) => {
                const selected = selectedGoals.includes(option.value);
                return (
                  <Card
                    key={option.value}
                    onPress={() => toggleGoal(option.value)}
                    style={StyleSheet.flatten([
                      styles.optionCard,
                      selected && styles.optionCardSelected,
                    ])}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Card>
                );
              })}
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
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
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

