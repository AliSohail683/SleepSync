/**
 * Button Component
 * Peaceful, minimalistic button with multiple variants
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, typography, borderRadius, spacing } from '../config/theme';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const isDisabled = disabled || loading;

  const buttonContent = (
    <>
      {loading && <ActivityIndicator color={colors.text.primary} style={styles.loader} />}
      {!loading && (
        <Text
          style={[
            styles.text,
            styles[`text_${size}`],
            isOutline && styles.textOutline,
            isGhost && styles.textGhost,
            isDisabled && styles.textDisabled,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </>
  );

  const buttonStyle = [
    styles.button,
    styles[`button_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    !isPrimary && styles.buttonNonPrimary,
    isOutline && styles.buttonOutline,
    isGhost && styles.buttonGhost,
    style,
  ];

  if (isPrimary && !isDisabled) {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} activeOpacity={0.8}>
        <LinearGradient
          colors={[...colors.gradients.primaryButton]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{

            width: "100%",
            height: 48,
            borderRadius: 12,
             alignItems: 'center', justifyContent: 'center',

          }}
        // style={buttonStyle}
        >
          {buttonContent}
        </LinearGradient>
      </TouchableOpacity >
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    // style={buttonStyle}
    >
      {buttonContent}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    flexDirection: 'row',
  },
  button_small: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  button_medium: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  button_large: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 56,
  },
  buttonNonPrimary: {
    backgroundColor: colors.background.tertiary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary.main,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  text_small: {
    fontSize: typography.sizes.sm,
  },
  text_medium: {
    fontSize: typography.sizes.base,
  },
  text_large: {
    fontSize: typography.sizes.lg,
  },
  textOutline: {
    color: colors.primary.main,
  },
  textGhost: {
    color: colors.primary.light,
  },
  textDisabled: {
    color: colors.text.disabled,
  },
  loader: {
    marginRight: spacing.sm,
  },
});

