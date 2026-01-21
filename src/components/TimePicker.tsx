/**
 * Time Picker Component
 * Custom time picker with hour and minute selectors
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../config/theme';
import { Button } from './Button';
import { parseTimeString, createTimeString } from '../utils/dateUtils';

interface TimePickerProps {
  value: string; // HH:MM format
  onChange: (time: string) => void;
  label?: string;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tempHours, setTempHours] = useState(0);
  const [tempMinutes, setTempMinutes] = useState(0);
  const hoursScrollRef = useRef<ScrollView>(null);
  const minutesScrollRef = useRef<ScrollView>(null);

  const { hours, minutes } = parseTimeString(value);

  const openPicker = () => {
    if (disabled) return;
    setTempHours(hours);
    setTempMinutes(minutes);
    setIsVisible(true);
    // Scroll to current values after modal is rendered
    setTimeout(() => {
      const itemHeight = 60;
      const offset = 80; // Padding to center items
      hoursScrollRef.current?.scrollTo({
        y: hours * itemHeight,
        animated: false,
      });
      minutesScrollRef.current?.scrollTo({
        y: minutes * itemHeight,
        animated: false,
      });
    }, 200);
  };

  const handleConfirm = () => {
    const timeString = createTimeString(tempHours, tempMinutes);
    onChange(timeString);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setIsVisible(false);
  };

  const formatTime = (h: number, m: number): string => {
    return createTimeString(h, m);
  };

  const formatDisplayTime = (h: number, m: number): string => {
    return createTimeString(h, m);
  };

  return (
    <>
      <TouchableOpacity
        onPress={openPicker}
        disabled={disabled}
        style={[styles.trigger, disabled && styles.triggerDisabled]}
      >
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>{formatDisplayTime(hours, minutes)}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
            </View>

            <View style={styles.pickerContainer}>
              {/* Hours Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <View style={styles.pickerWrapper}>
                  <ScrollView
                    ref={hoursScrollRef}
                    style={styles.pickerScroll}
                    contentContainerStyle={styles.pickerContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={60}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(e) => {
                      const y = e.nativeEvent.contentOffset.y;
                      const index = Math.round(y / 60);
                      const newHour = Math.max(0, Math.min(23, index));
                      setTempHours(newHour);
                    }}
                  >
                    {HOURS.map((hour) => (
                      <View key={hour} style={styles.pickerItem}>
                        <Text
                          style={[
                            styles.pickerItemText,
                            tempHours === hour && styles.pickerItemTextSelected,
                          ]}
                        >
                          {String(hour).padStart(2, '0')}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                  <View style={styles.pickerIndicator} />
                </View>
              </View>

              <Text style={styles.pickerSeparator}>:</Text>

              {/* Minutes Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <View style={styles.pickerWrapper}>
                  <ScrollView
                    ref={minutesScrollRef}
                    style={styles.pickerScroll}
                    contentContainerStyle={styles.pickerContent}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={60}
                    decelerationRate="fast"
                    onMomentumScrollEnd={(e) => {
                      const y = e.nativeEvent.contentOffset.y;
                      const index = Math.round(y / 60);
                      const newMinute = Math.max(0, Math.min(59, index));
                      setTempMinutes(newMinute);
                    }}
                  >
                    {MINUTES.map((minute) => (
                      <View key={minute} style={styles.pickerItem}>
                        <Text
                          style={[
                            styles.pickerItemText,
                            tempMinutes === minute && styles.pickerItemTextSelected,
                          ]}
                        >
                          {String(minute).padStart(2, '0')}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                  <View style={styles.pickerIndicator} />
                </View>
              </View>

            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={handleCancel}
                variant="ghost"
                size="medium"
                style={styles.footerButton}
              />
              <Button
                title="Confirm"
                onPress={handleConfirm}
                size="medium"
                style={styles.footerButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  timeDisplay: {
    alignItems: 'flex-start',
  },
  timeText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontWeight: typography.weights.medium,
  },
  pickerWrapper: {
    height: 200,
    width: '100%',
    position: 'relative',
  },
  pickerScroll: {
    flex: 1,
  },
  pickerContent: {
    paddingVertical: 80, // Half of pickerWrapper height to center items
  },
  pickerItem: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: typography.sizes['2xl'],
    color: colors.text.secondary,
  },
  pickerItemTextSelected: {
    color: colors.text.primary,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes['3xl'],
  },
  pickerIndicator: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    height: 60,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.primary.main,
    backgroundColor: 'rgba(107, 76, 230, 0.1)',
    pointerEvents: 'none',
  },
  pickerSeparator: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  periodContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.tertiary,
  },
  footerButton: {
    flex: 1,
  },
});

