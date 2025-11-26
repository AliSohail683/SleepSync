/**
 * Card Component
 * Elegant card container with peaceful gradient background
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, shadows } from '@/config/theme';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'flat';
  gradient?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  gradient = false,
  onPress,
  style,
}) => {
  const cardStyle = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    variant === 'flat' && styles.flat,
    style,
  ];

  const content = <View style={styles.content}>{children}</View>;

  if (gradient) {
    const Wrapper = onPress ? TouchableOpacity : View;
    return (
      <Wrapper onPress={onPress} activeOpacity={0.9} style={cardStyle}>
        <LinearGradient
          colors={[...colors.gradients.sleepCard]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          {content}
        </LinearGradient>
      </Wrapper>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={cardStyle}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
    overflow: 'hidden',
  },
  elevated: {
    ...shadows.md,
  },
  flat: {
    backgroundColor: colors.background.secondary,
  },
  gradientCard: {
    borderRadius: borderRadius.lg,
  },
  content: {
    padding: spacing.lg,
  },
});

