/**
 * Night Summary Screen
 * Single-page "night card" with all sleep metrics
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Card } from '../../components';
import { colors, typography, spacing } from '../../config/theme';
import { SleepSessionEnhanced, SleepScoreBreakdown } from '../../types/sleep';
import { formatDuration, formatTime } from '../../utils/dateUtils';

interface NightSummaryScreenProps {
  session: SleepSessionEnhanced;
  scoreBreakdown?: SleepScoreBreakdown;
  onClose: () => void;
}

export const NightSummaryScreen: React.FC<NightSummaryScreenProps> = ({
  session,
  scoreBreakdown,
  onClose,
}) => {
  const duration = session.durationMin ? formatDuration(session.durationMin) : 'N/A';
  const efficiency = session.sleepEfficiency
    ? `${Math.round(session.sleepEfficiency)}%`
    : 'N/A';
  const latency = session.sleepLatency
    ? `${Math.round(session.sleepLatency)} min`
    : 'N/A';
  const waso = session.wakeAfterSleepOnset
    ? `${Math.round(session.wakeAfterSleepOnset)} min`
    : 'N/A';

  const stages = session.stages;
  const totalHours = session.durationMin ? session.durationMin / 60 : 0;
  const lightPercent = stages && totalHours > 0
    ? Math.round((stages.light / totalHours) * 100)
    : 0;
  const deepPercent = stages && totalHours > 0
    ? Math.round((stages.deep / totalHours) * 100)
    : 0;
  const remPercent = stages && totalHours > 0
    ? Math.round((stages.rem / totalHours) * 100)
    : 0;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Sleep Summary</Text>
            <Text style={styles.date}>{formatTime(session.startAt)} - {session.endAt ? formatTime(session.endAt) : 'Ongoing'}</Text>
          </View>

          {/* Sleep Score */}
          {session.sleepScore !== undefined && (
            <Card style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Sleep Score</Text>
              <Text style={styles.scoreValue}>{session.sleepScore}</Text>
              {scoreBreakdown?.factors && scoreBreakdown.factors.length > 0 && (
                <View style={styles.factors}>
                  {scoreBreakdown.factors.slice(0, 3).map((factor, index) => (
                    <Text key={index} style={styles.factorText}>
                      {factor.impact === 'positive' ? '✓' : '✗'} {factor.name}
                    </Text>
                  ))}
                </View>
              )}
            </Card>
          )}

          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <MetricCard label="Duration" value={duration} />
            <MetricCard label="Efficiency" value={efficiency} />
            <MetricCard label="Latency" value={latency} />
            <MetricCard label="WASO" value={waso} />
          </View>

          {/* Sleep Stages */}
          {stages && (
            <Card style={styles.stagesCard}>
              <Text style={styles.sectionTitle}>Sleep Stages</Text>
              <View style={styles.stagesContainer}>
                <StageBar label="Light" percent={lightPercent} color={colors.primary.light} />
                <StageBar label="Deep" percent={deepPercent} color={colors.primary.main} />
                <StageBar label="REM" percent={remPercent} color={colors.primary.dark} />
              </View>
              <View style={styles.stagesDetails}>
                <Text style={styles.stageDetail}>
                  Light: {stages.light.toFixed(1)}h ({lightPercent}%)
                </Text>
                <Text style={styles.stageDetail}>
                  Deep: {stages.deep.toFixed(1)}h ({deepPercent}%)
                </Text>
                <Text style={styles.stageDetail}>
                  REM: {stages.rem.toFixed(1)}h ({remPercent}%)
                </Text>
              </View>
            </Card>
          )}

          {/* Disturbances */}
          {session.disturbances && session.disturbances.length > 0 && (
            <Card style={styles.disturbancesCard}>
              <Text style={styles.sectionTitle}>Disturbances</Text>
              <Text style={styles.disturbanceCount}>
                {session.disturbances.length} disturbance(s) detected
              </Text>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value }) => (
  <Card style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </Card>
);

interface StageBarProps {
  label: string;
  percent: number;
  color: string;
}

const StageBar: React.FC<StageBarProps> = ({ label, percent, color }) => (
  <View style={styles.stageBarContainer}>
    <Text style={styles.stageLabel}>{label}</Text>
    <View style={styles.stageBarBackground}>
      <View style={[styles.stageBarFill, { width: `${percent}%`, backgroundColor: color }]} />
    </View>
    <Text style={styles.stagePercent}>{percent}%</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  scoreCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  scoreLabel: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: typography.sizes['5xl'],
    fontWeight: typography.weights.bold,
    color: colors.primary.main,
    marginBottom: spacing.md,
  },
  factors: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  factorText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
  },
  metricLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  stagesCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  stagesContainer: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stageBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stageLabel: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    width: 50,
  },
  stageBarBackground: {
    flex: 1,
    height: 20,
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    overflow: 'hidden',
  },
  stageBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  stagePercent: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    width: 40,
    textAlign: 'right',
  },
  stagesDetails: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  stageDetail: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  disturbancesCard: {
    padding: spacing.lg,
  },
  disturbanceCount: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
});

