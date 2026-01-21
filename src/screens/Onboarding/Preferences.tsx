/**
 * Onboarding - Preferences Screen
 * Collect sleep environment and habit preferences
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Card, Switch } from '../../components';
import { colors, typography, spacing } from '../../config/theme';

interface PreferencesProps {
  onNext: (data: {
    caffeineHabits: string;
    screenBeforeBed: boolean;
    noiseSensitivity: string;
    roomTemperaturePrefC?: number;
    recentSleepHours?: number[];
    fatigueLevel?: number;
  }) => void;
  onBack: () => void;
}

export const Preferences: React.FC<PreferencesProps> = ({ onNext, onBack }) => {
  const [caffeine, setCaffeine] = useState('moderate');
  const [screenTime, setScreenTime] = useState(false);
  const [noise, setNoise] = useState('medium');
  const [temp, setTemp] = useState<number | undefined>(18);
  const [recentNights, setRecentNights] = useState<number[]>([6, 6, 6]);
  const [fatigue, setFatigue] = useState<number>(3);

  const caffeineOptions = [
    { value: 'none', label: 'None', emoji: '🚫' },
    { value: 'low', label: 'Low (1 cup)', emoji: '☕' },
    { value: 'moderate', label: 'Moderate (2-3)', emoji: '☕☕' },
    { value: 'high', label: 'High (4+)', emoji: '☕☕☕' },
  ];

  const noiseOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  const tempOptions = [16, 17, 18, 19, 20];

  const recentSleepOptions = [4, 5, 6, 7, 8, 9];
  const fatigueOptions = [1, 2, 3, 4, 5];

  const setRecentNight = (index: number, hours: number) => {
    setRecentNights((prev) => {
      const copy = [...prev];
      copy[index] = hours;
      return copy;
    });
  };

  const handleNext = () => {
    onNext({
      caffeineHabits: caffeine,
      screenBeforeBed: screenTime,
      noiseSensitivity: noise,
      roomTemperaturePrefC: temp,
      recentSleepHours: recentNights,
      fatigueLevel: fatigue,
    });
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.step}>Step 3 of 5</Text>
            <Text style={styles.title}>Sleep Environment</Text>
            <Text style={styles.subtitle}>
              Understanding your habits helps us optimize your sleep
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily caffeine intake</Text>
            <View style={styles.optionGrid}>
              {caffeineOptions.map((option) => (
                <Card
                  key={option.value}
                  onPress={() => setCaffeine(option.value)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    caffeine === option.value && styles.optionCardSelected,
                  ])}
                >
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.optionLabel,
                      caffeine === option.value && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Card>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.sectionTitle}>Screen time before bed?</Text>
                <Text style={styles.sectionSubtitle}>
                  Phone, TV, or computer within 1 hour
                </Text>
              </View>
              <Switch value={screenTime} onValueChange={setScreenTime} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Noise sensitivity</Text>
            <View style={styles.optionRow}>
              {noiseOptions.map((option) => (
                <Card
                  key={option.value}
                  onPress={() => setNoise(option.value)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    styles.flexOption,
                    noise === option.value && styles.optionCardSelected,
                  ])}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      noise === option.value && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Card>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred room temperature (°C)</Text>
            <View style={styles.optionRow}>
              {tempOptions.map((temperature) => (
                <Card
                  key={temperature}
                  onPress={() => setTemp(temperature)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    styles.flexOption,
                    temp === temperature && styles.optionCardSelected,
                  ])}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      temp === temperature && styles.optionLabelSelected,
                    ]}
                  >
                    {temperature}°
                  </Text>
                </Card>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last 3 nights of sleep</Text>
            <Text style={styles.sectionSubtitle}>
              Roughly how many hours did you sleep each night?
            </Text>
            {[0, 1, 2].map((index) => (
              <View key={index} style={styles.recentRow}>
                <Text style={styles.recentLabel}>Night {index + 1}</Text>
                <View style={styles.optionRow}>
                  {recentSleepOptions.map((hours) => {
                    const selected = recentNights[index] === hours;
                    return (
                      <Card
                        key={`${index}-${hours}`}
                        onPress={() => setRecentNight(index, hours)}
                        style={StyleSheet.flatten([
                          styles.optionCard,
                          styles.flexOption,
                          selected && styles.optionCardSelected,
                        ])}
                      >
                        <Text
                          style={[
                            styles.optionLabel,
                            selected && styles.optionLabelSelected,
                          ]}
                        >
                          {hours}h
                        </Text>
                      </Card>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How wrecked do you feel most mornings?</Text>
            <Text style={styles.sectionSubtitle}>1 = fine, 5 = completely drained</Text>
            <View style={styles.optionRow}>
              {fatigueOptions.map((level) => {
                const selected = fatigue === level;
                return (
                  <Card
                    key={level}
                    onPress={() => setFatigue(level)}
                    style={StyleSheet.flatten([
                      styles.optionCard,
                      styles.flexOption,
                      selected && styles.optionCardSelected,
                    ])}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        selected && styles.optionLabelSelected,
                      ]}
                    >
                      {level}
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
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  optionCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    minWidth: '45%',
  },
  flexOption: {
    flex: 1,
  },
  optionCardSelected: {
    backgroundColor: colors.primary.main,
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  optionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: colors.text.primary,
    fontWeight: typography.weights.bold,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.tertiary,
    padding: spacing.lg,
    borderRadius: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  recentRow: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  recentLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
});

