/**
 * Alarm Settings Screen
 * Configure smart wake window, days, and alarm preferences
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Card, Button, Switch, TimePicker } from '../../components';
import { colors, typography, spacing } from '../../config/theme';
import { useUserStore } from '../../store/userStore';
import { useAlarmStore } from '../../store/alarmStore';
import { AlarmConfig } from '../../models';
import { v4 as uuidv4 } from 'uuid';
import { parseTimeString, createTimeString } from '../../utils/dateUtils';

interface AlarmSettingsScreenProps {
  alarmId?: string; // If provided, edit existing alarm; otherwise create new
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export const AlarmSettingsScreen: React.FC<AlarmSettingsScreenProps> = ({
  alarmId,
  onClose,
}) => {
  const { profile } = useUserStore();
  const { alarms, createAlarm, updateAlarm, loadAlarms, isLoading } = useAlarmStore();

  const existingAlarm = alarmId ? alarms.find((a) => a.id === alarmId) : null;

  // Load alarms when screen opens
  useEffect(() => {
    const load = async () => {
      if (profile) {
        try {
          await loadAlarms(profile.id);
        } catch (err: any) {
          console.error('Failed to load alarms:', err);
          setError(err?.message || 'Failed to load alarms. Please try again.');
        }
      }
    };
    load();
  }, [profile, loadAlarms]);

  const [enabled, setEnabled] = useState(existingAlarm?.enabled ?? true);
  const [windowStart, setWindowStart] = useState(
    existingAlarm?.targetWindowStart ?? '06:30'
  );
  const [windowEnd, setWindowEnd] = useState(
    existingAlarm?.targetWindowEnd ?? '07:00'
  );
  const [gentleWake, setGentleWake] = useState(
    existingAlarm?.gentleWake ?? true
  );
  const [vibrationEnabled, setVibrationEnabled] = useState(
    existingAlarm?.vibrationEnabled ?? true
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    existingAlarm?.daysOfWeek ?? [1, 2, 3, 4, 5] // Default: weekdays
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Validate time format
  const handleSave = async () => {
    if (isSaving || isLoading) return; // Prevent double saves
    if (!profile) {
      setError('No user profile found');
      return;
    }
    console.log('🔔 Attempting to save alarm:', {
      isEdit: !!existingAlarm,
      alarmId: existingAlarm?.id,
      windowStart,
      windowEnd,
      daysOfWeek,
      enabled,
    });

    // Validate window order (TimePicker ensures valid format)
    const startTime = parseTimeString(windowStart);
    const endTime = parseTimeString(windowEnd);
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;

    if (endMinutes <= startMinutes) {
      setError('End time must be after start time');
      return;
    }

    if (daysOfWeek.length === 0) {
      setError('Select at least one day');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const alarmData: AlarmConfig = {
        id: existingAlarm?.id || uuidv4(),
        userId: profile.id,
        enabled,
        targetWindowStart: windowStart,
        targetWindowEnd: windowEnd,
        gentleWake,
        vibrationEnabled,
        daysOfWeek: daysOfWeek.sort(),
      };

      console.log('📝 Alarm data prepared:', {
        id: alarmData.id,
        userId: alarmData.userId,
        enabled: alarmData.enabled,
        windowStart: alarmData.targetWindowStart,
        windowEnd: alarmData.targetWindowEnd,
        daysOfWeek: alarmData.daysOfWeek,
        gentleWake: alarmData.gentleWake,
        vibrationEnabled: alarmData.vibrationEnabled,
      });

      if (existingAlarm) {
        console.log('🔄 Updating existing alarm:', existingAlarm.id);
        // For update, pass only the changed fields (Partial<AlarmConfig>)
        await updateAlarm(existingAlarm.id, {
          enabled,
          targetWindowStart: windowStart,
          targetWindowEnd: windowEnd,
          gentleWake,
          vibrationEnabled,
          daysOfWeek: daysOfWeek.sort(),
        });
        console.log('✅ Alarm updated successfully');
      } else {
        console.log('➕ Creating new alarm...');
        try {
          await createAlarm(alarmData);
          console.log('✅ Alarm created successfully');
        } catch (createErr: any) {
          console.error('❌ Create alarm error:', createErr);
          throw createErr;
        }
      }

      // Success - close screen
      onClose();
    } catch (err: any) {
      console.error('❌ Failed to save alarm:', err);
      console.error('Error details:', {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        alarmId,
        existingAlarm: !!existingAlarm,
        windowStart,
        windowEnd,
        daysOfWeek,
      });
      const errorMessage = err?.message || 'Failed to save alarm. Please try again.';
      setError(errorMessage);
      // Show alert for better visibility
      Alert.alert(
        'Failed to Save Alarm',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (dayValue: number) => {
    if (daysOfWeek.includes(dayValue)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayValue));
    } else {
      setDaysOfWeek([...daysOfWeek, dayValue]);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {existingAlarm ? 'Edit Alarm' : 'Create Alarm'}
            </Text>
            <Text style={styles.subtitle}>
              Configure your smart wake window
            </Text>
          </View>

          {error && (
            <Card style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          )}

          {/* Enable/Disable Toggle */}
          <Card style={styles.sectionCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.sectionTitle}>Enable Alarm</Text>
                <Text style={styles.sectionSubtitle}>
                  Turn alarm on or off
                </Text>
              </View>
              <Switch value={enabled} onValueChange={setEnabled} />
            </View>
          </Card>

          {/* Wake Window Times */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Wake Window</Text>
            <Text style={styles.sectionSubtitle}>
              Alarm will trigger during this time range
            </Text>

            <View style={styles.timeRow}>
              <View style={styles.timePickerContainer}>
                <TimePicker
                  label="Start Time"
                  value={windowStart}
                  onChange={setWindowStart}
                />
              </View>
              <Text style={styles.timeSeparator}>–</Text>
              <View style={styles.timePickerContainer}>
                <TimePicker
                  label="End Time"
                  value={windowEnd}
                  onChange={setWindowEnd}
                />
              </View>
            </View>
          </Card>

          {/* Days of Week */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Repeat Days</Text>
            <Text style={styles.sectionSubtitle}>
              Select which days the alarm should repeat
            </Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = daysOfWeek.includes(day.value);
                return (
                  <TouchableOpacity
                    key={day.value}
                    onPress={() => toggleDay(day.value)}
                    style={[
                      styles.dayButton,
                      isSelected && styles.dayButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        isSelected && styles.dayButtonTextSelected,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Gentle Wake */}
          <Card style={styles.sectionCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.sectionTitle}>Gentle Wake</Text>
                <Text style={styles.sectionSubtitle}>
                  Wake during lightest sleep phase
                </Text>
              </View>
              <Switch value={gentleWake} onValueChange={setGentleWake} />
            </View>
          </Card>

          {/* Vibration */}
          <Card style={styles.sectionCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.sectionTitle}>Vibration</Text>
                <Text style={styles.sectionSubtitle}>
                  Enable vibration with alarm
                </Text>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={setVibrationEnabled}
              />
            </View>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={onClose}
            variant="ghost"
            size="medium"
            style={styles.footerButton}
          />
          <Button
            title={isSaving || isLoading ? 'Saving...' : (existingAlarm ? 'Save Changes' : 'Create Alarm')}
            onPress={handleSave}
            size="medium"
            style={styles.footerButton}
            disabled={isSaving || isLoading}
            loading={isSaving || isLoading}
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
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  sectionCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  timePickerContainer: {
    flex: 1,
  },
  timeSeparator: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.secondary,
    marginTop: spacing.xl,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dayButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.background.tertiary,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 50,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.light,
  },
  dayButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  dayButtonTextSelected: {
    color: colors.text.primary,
    fontWeight: typography.weights.bold,
  },
  errorCard: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});

