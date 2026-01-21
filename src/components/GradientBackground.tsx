/**
 * Gradient Background Component
 * Peaceful gradient background for screens
 */

import React, { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../config/theme';

interface GradientBackgroundProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'alarm';
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
    alarm: ['#FF6B6B', '#FF8E53', '#FF6B6B'] as const,
  }[variant];

  return (
    <LinearGradient
      colors={gradientColors}
      start={variant === 'alarm' ? { x: 0, y: 0 } : { x: 0, y: 0 }}
      end={variant === 'alarm' ? { x: 1, y: 1 } : { x: 0, y: 1 }}
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

