/**
 * Onboarding - Basic Info Screen
 * Collect basic user information
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Card } from '../../components';
import { colors, typography, spacing } from '../../config/theme';
import { AGE_RANGES } from '../../config/constants';

interface BasicInfoProps {
  onNext: (data: { ageRange: string; gender?: string }) => void;
  onBack: () => void;
}

export const BasicInfo: React.FC<BasicInfoProps> = ({ onNext, onBack }) => {
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);

  const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

  const handleNext = () => {
    if (selectedAge) {
      onNext({
        ageRange: selectedAge,
        gender: selectedGender || undefined,
      });
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.step}>Step 1 of 5</Text>
            <Text style={styles.title}>Tell us about yourself</Text>
            <Text style={styles.subtitle}>
              This helps us personalize your sleep experience
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Age Range</Text>
            <View style={styles.optionGrid}>
              {AGE_RANGES.map((age) => (
                <Card
                  key={age}
                  onPress={() => setSelectedAge(age)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    selectedAge === age && styles.optionCardSelected,
                  ])}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedAge === age && styles.optionTextSelected,
                    ]}
                  >
                    {age}
                  </Text>
                </Card>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gender (Optional)</Text>
            <View style={styles.optionGrid}>
              {genders.map((gender) => (
                <Card
                  key={gender}
                  onPress={() => setSelectedGender(gender)}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    selectedGender === gender && styles.optionCardSelected,
                  ])}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedGender === gender && styles.optionTextSelected,
                    ]}
                  >
                    {gender}
                  </Text>
                </Card>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="Back" onPress={onBack} variant="ghost" />
          <View style={{ width: spacing.md }} />
          <Button
            title="Next"
            onPress={handleNext}
            disabled={!selectedAge}
            style={{ flex: 1 }}
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
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
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

