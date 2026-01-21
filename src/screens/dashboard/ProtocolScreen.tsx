/**
 * Protocol Screen
 * Shows daily steps for the active protocol (Kill the Zombie Mornings v1)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Card } from '../../components';
import { colors, typography, spacing } from '../../config/theme';
import { useProtocolStore } from '../../store/protocolStore';

interface ProtocolScreenProps {
  onClose: () => void;
}

export const ProtocolScreen: React.FC<ProtocolScreenProps> = ({ onClose }) => {
  const { activeProtocol, definitions, completeToday, skipToday, resetProtocol } =
    useProtocolStore();

  if (!activeProtocol) {
    const def = definitions['kill-zombie-mornings'];
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>{def.name}</Text>
            <Text style={styles.subtitle}>{def.description}</Text>
            <Text style={styles.meta}>
              Duration: {def.durationDays} days • Focus: consistent mornings
            </Text>
            <View style={styles.footer}>
              <Button
                title="Close"
                onPress={onClose}
                variant="ghost"
                fullWidth
                size="medium"
              />
            </View>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const def = definitions[activeProtocol.id];
  const today = def.days.find((d) => d.day === activeProtocol.currentDay) ?? def.days[0];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.step}>
            Day {today.day} of {def.durationDays}
          </Text>
          <Text style={styles.title}>{def.name}</Text>
          <Text style={styles.subtitle}>{today.title}</Text>
          <Text style={styles.focus}>{today.focus}</Text>

          <View style={styles.tasksSection}>
            {today.tasks.map((task, index) => (
              <Card key={index} style={styles.taskCard}>
                <Text style={styles.taskBullet}>•</Text>
                <Text style={styles.taskText}>{task}</Text>
              </Card>
            ))}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Completion is tracked per day. If you miss a day, you can skip it, but try to keep
              your wake time consistent.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Mark Today Complete"
            onPress={completeToday}
            fullWidth
            size="large"
          />
          <View style={styles.footerRow}>
            <Button title="Skip Today" onPress={skipToday} variant="ghost" />
            <View style={{ width: spacing.md }} />
            <Button title="Reset Program" onPress={resetProtocol} variant="ghost" />
          </View>
          <Button title="Close" onPress={onClose} variant="ghost" fullWidth size="medium" />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  step: {
    fontSize: typography.sizes.sm,
    color: colors.primary.light,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  meta: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  focus: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  tasksSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  taskBullet: {
    fontSize: typography.sizes.lg,
    color: colors.primary.light,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  taskText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  infoBox: {
    padding: spacing.md,
    backgroundColor: colors.overlay.medium,
    borderRadius: 12,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});


