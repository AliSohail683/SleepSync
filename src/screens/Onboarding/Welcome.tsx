/**
 * Onboarding - Welcome Screen
 * First screen in the onboarding flow
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button } from '../../components';
import { colors, typography, spacing } from '../../config/theme';

interface WelcomeProps {
  onNext: () => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onNext }) => {
  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.emoji}>🌙</Text>
              <Text style={styles.title}>Welcome to SleepSync</Text>
              <Text style={styles.subtitle}>
                Your journey to better sleep starts here
              </Text>
            </View>

            <View style={styles.features}>
              <FeatureItem
                icon="📊"
                title="Track Your Sleep"
                description="Monitor sleep stages, quality, and patterns"
              />
              <FeatureItem
                icon="🎵"
                title="Custom Soundscapes"
                description="AI-powered audio for deeper, restful sleep"
              />
              <FeatureItem
                icon="⏰"
                title="Smart Alarms"
                description="Wake up during light sleep for better mornings"
              />
              <FeatureItem
                icon="💡"
                title="Sleep Insights"
                description="Personalized tips and recommendations"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Get Started"
            onPress={onNext}
            fullWidth
            size="large"

          />
          <Text style={styles.disclaimer}>
            Better sleep in just a few minutes of setup
          </Text>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  emoji: {
    fontSize: 80,
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
  },
  features: {
    gap: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlay.light,
    padding: spacing.lg,
    borderRadius: 16,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.lineHeights.normal * typography.sizes.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
  disclaimer: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

