/**
 * Slider Component
 * Peaceful slider with custom styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// Note: Install @react-native-community/slider if needed: npx expo install @react-native-community/slider
// For now, using a placeholder View
// import { Slider as RNSlider } from '@react-native-community/slider';
import { colors, typography, spacing } from '@/config/theme';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  label,
  showValue = true,
  valueFormatter,
}) => {
  const displayValue = valueFormatter ? valueFormatter(value) : value.toString();

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {showValue && <Text style={styles.value}>{displayValue}</Text>}
        </View>
      )}
      <View style={styles.sliderPlaceholder}>
        <Text style={styles.placeholderText}>
          Slider component - Install @react-native-community/slider
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  value: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary.main,
  },
  sliderPlaceholder: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
  },
  placeholderText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
});

