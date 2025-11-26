/**
 * Gradient Background Component
 * Peaceful gradient background for screens
 */

import React, { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/config/theme';

interface GradientBackgroundProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = 'default',
}) => {
  const gradientColors = {
    default: colors.gradients.background,
    primary: colors.gradients.primaryButton,
    success: colors.gradients.scoreGood,
    warning: colors.gradients.scoreWarning,
  }[variant];

  return (
    <LinearGradient
      colors={[...gradientColors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

