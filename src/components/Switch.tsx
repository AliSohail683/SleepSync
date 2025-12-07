/**
 * Switch Component
 * Peaceful toggle switch with smooth animation
 */

import React from 'react';
import { Switch as RNSwitch, Platform, StyleSheet } from 'react-native';
import { colors } from '../config/theme';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ value, onValueChange, disabled = false }) => {
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: colors.gray[700],
        true: colors.primary.main,
      }}
      thumbColor={value ? colors.text.primary : colors.gray[400]}
      ios_backgroundColor={colors.gray[700]}
      style={styles.switch}
    />
  );
};

const styles = StyleSheet.create({
  switch: {
    transform: Platform.OS === 'ios' ? [{ scaleX: 0.9 }, { scaleY: 0.9 }] : [],
  },
});

