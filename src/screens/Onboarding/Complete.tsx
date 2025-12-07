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
}

export const Complete: React.FC<CompleteProps> = ({ onComplete }) => {
  return (
    <GradientBackground variant="success">
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>You're All Set!</Text>
          <Text style={styles.subtitle}>
            Your personalized sleep profile is ready.{'\n'}
            Let's start your journey to better sleep.
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

