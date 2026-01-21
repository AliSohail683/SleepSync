/**
 * Home Dashboard Screen
 * Main screen showing sleep stats, quick actions, and insights
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Card, AnimatedSleepScore, Button, LoadingSpinner } from '../components';
import { colors, typography, spacing } from '../config/theme';
import { useUserStore } from '../store/userStore';
import { useSleepStore } from '../store/sleepStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { formatDuration } from '../utils/dateUtils';
import { useAlarmStore } from '../store/alarmStore';
import { storageService } from '../services/storageService';
import { calculateCumulativeDebt } from '../utils/sleepUtils';
import { useProtocolStore } from '../store/protocolStore';

interface HomeDashboardProps {
  onStartSession: () => void;
  onViewInsights: () => void;
  onOpenSettings: (alarmId?: string) => void;
  onOpenHistory?: () => void;
  onOpenProtocol?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartSession,
  onViewInsights,
  onOpenSettings,
  onOpenHistory,
  onOpenProtocol,
}) => {
  const { profile } = useUserStore();
  const { currentSession, recentSessions, insights, loadRecentSessions, loadInsights } = useSleepStore();
  const { hasActiveSubscription } = useSubscriptionStore();
  const { alarms, loadAlarms, toggleAlarm } = useAlarmStore();
  const { activeProtocol, startProtocol } = useProtocolStore();
  
  const isPremium = hasActiveSubscription();
  const [stats, setStats] = useState({
    averageDuration: 0,
    averageScore: 0,
    totalSessions: 0,
    consistency: 0,
  });
  const [sleepDebtHours, setSleepDebtHours] = useState<number | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);

  const primaryAlarm = useMemo(
    () => alarms.find(a => a.enabled) || alarms[0],
    [alarms]
  );

  const tonightPlan = useMemo(() => {
    if (!profile) {
      return null;
    }

    const targetWake = profile.averageWakeTime || '07:00';
    const sleepGoal = profile.sleepGoalHours || 8;

    // Derive bedtime from wake time and goal
    const [wakeH, wakeM] = targetWake.split(':').map(Number);
    const wakeTotal = wakeH * 60 + wakeM;
    const bedtimeMinutes = wakeTotal - Math.round(sleepGoal * 60);
    const normalized = bedtimeMinutes < 0 ? bedtimeMinutes + 24 * 60 : bedtimeMinutes;
    const bedH = Math.floor(normalized / 60);
    const bedM = normalized % 60;
    const targetBed = `${String(bedH).padStart(2, '0')}:${String(bedM).padStart(2, '0')}`;

    const debt = sleepDebtHours ?? 0;
    let headline: string;
    if (debt >= 14) {
      headline = 'You are running on heavy sleep debt. Tonight is a recovery night.';
    } else if (debt >= 7) {
      headline = 'You are behind on sleep. Let’s claw back some hours tonight.';
    } else if (debt > 0.5) {
      headline = 'Mild sleep debt. Staying consistent will flip this.';
    } else {
      headline = 'You’re close to your target. Protect this rhythm.';
    }

    const microActions: string[] = [];
    if (debt >= 7) {
      microActions.push('Aim to be in bed by the target time, not just starting wind-down.');
      microActions.push('Avoid caffeine after 6 hours before bedtime.');
    } else {
      microActions.push('Keep bedtime within 30 minutes of your target.');
      microActions.push('Dim screens 30–45 minutes before bed.');
    }

    return {
      targetBedtime: targetBed,
      targetWakeTime: targetWake,
      headline,
      microActions,
    };
  }, [profile, sleepDebtHours]);

  useEffect(() => {
    if (profile) {
      loadRecentSessions(profile.id);
      loadInsights(profile.id);
      loadAlarms(profile.id).catch((err) => console.warn('Failed to load alarms', err));
    }
  }, [profile, loadRecentSessions, loadInsights, loadAlarms]);

  useEffect(() => {
    if (recentSessions.length > 0) {
      calculateStats();
    }
  }, [recentSessions]);

  useEffect(() => {
    const loadDebt = async () => {
      if (!profile) return;
      setIsPlanLoading(true);
      try {
        if (!storageService.isInitialized()) {
          await storageService.setupDB();
        }
        const records = await storageService.getSleepDebtRecords(7);
        if (records.length === 0) {
          setSleepDebtHours(0);
        } else {
          setSleepDebtHours(calculateCumulativeDebt(records));
        }
      } catch (error) {
        console.warn('Failed to load sleep debt records:', error);
        setSleepDebtHours(null);
      } finally {
        setIsPlanLoading(false);
      }
    };

    loadDebt();
  }, [profile, recentSessions]);

  const calculateStats = React.useCallback(() => {
    if (recentSessions.length > 0) {
      const completed = recentSessions.filter(s => s.endAt && s.durationMin);
      if (completed.length === 0) {
        setStats({
          averageDuration: 0,
          averageScore: 0,
          totalSessions: 0,
          consistency: 0,
        });
        return;
      }
      
      const avgDuration = completed.reduce((sum, s) => sum + (s.durationMin || 0), 0) / completed.length;
      const avgScore = completed.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / completed.length;
      
      // Calculate consistency (bedtime variance)
      const bedtimes = completed.map(s => {
        const date = new Date(s.startAt);
        return date.getHours() * 60 + date.getMinutes(); // minutes from midnight
      });
      const avgBedtime = bedtimes.reduce((sum, t) => sum + t, 0) / bedtimes.length;
      const variance = bedtimes.reduce((sum, t) => sum + Math.pow(t - avgBedtime, 2), 0) / bedtimes.length;
      const stdDev = Math.sqrt(variance);
      // Consistency: 100% if stdDev < 30min, decreases as variance increases
      const consistency = Math.max(0, Math.min(100, 100 - (stdDev / 30) * 20));
      
      setStats({
        averageDuration: Math.round(avgDuration),
        averageScore: Math.round(avgScore),
        totalSessions: completed.length,
        consistency: Math.round(consistency),
      });
    } else {
      setStats({
        averageDuration: 0,
        averageScore: 0,
        totalSessions: 0,
        consistency: 0,
      });
    }
  }, [recentSessions]);

  if (!profile) {
    return <LoadingSpinner text="Loading your sleep data..." />;
  }

  const lastSession = recentSessions[0];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good {getTimeOfDay()}</Text>
              <Text style={styles.userName}>Ready for better sleep?</Text>
            </View>
            <TouchableOpacity onPress={() => onOpenSettings()}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Tonight & Tomorrow Plan */}
          {tonightPlan && (
            <Card gradient style={styles.planCard}>
              <Text style={styles.planTitle}>Tonight & Tomorrow</Text>
              <View style={styles.planRow}>
                <View style={styles.planColumn}>
                  <Text style={styles.planLabel}>Tonight's Target Bedtime</Text>
                  <Text style={styles.planValue}>{tonightPlan.targetBedtime}</Text>
                </View>
                <View style={styles.planColumn}>
                  <Text style={styles.planLabel}>Tomorrow's Wake</Text>
                  <Text style={styles.planValue}>{tonightPlan.targetWakeTime}</Text>
                </View>
              </View>
              <View style={styles.debtRow}>
                <Text style={styles.debtLabel}>
                  Sleep Debt (last 7 days):
                </Text>
                <View style={styles.debtBadgeContainer}>
                  {sleepDebtHours === null ? (
                    <Text style={styles.debtValue}>
                      {isPlanLoading ? 'Calculating...' : 'N/A'}
                    </Text>
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.debtBadge,
                          sleepDebtHours >= 14 && styles.debtBadgeHigh,
                          sleepDebtHours >= 7 && sleepDebtHours < 14 && styles.debtBadgeMedium,
                          sleepDebtHours < 7 && styles.debtBadgeLow,
                        ]}
                      >
                        {sleepDebtHours >= 14
                          ? 'HIGH'
                          : sleepDebtHours >= 7
                          ? 'MEDIUM'
                          : 'LOW'}
                      </Text>
                      <Text style={styles.debtValue}>
                        {sleepDebtHours.toFixed(1)}h
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <Text style={styles.planHeadline}>{tonightPlan.headline}</Text>
              <View style={styles.planActions}>
                {tonightPlan.microActions.map((action, index) => (
                  <Text key={index} style={styles.planActionItem}>
                    • {action}
                  </Text>
                ))}
              </View>
            </Card>
          )}

          {/* Sleep Score Card */}
          {lastSession?.sleepScore && (
            <Card gradient style={styles.scoreCard}>
              <Text style={styles.cardTitle}>Last Night's Sleep</Text>
              <View style={styles.scoreContainer}>
                <AnimatedSleepScore score={lastSession.sleepScore} size={160} />
              </View>
              <View style={styles.scoreDetails}>
                <ScoreDetail label="Duration" value={formatDuration(lastSession.durationMin || 0)} />
                <ScoreDetail label="Deep Sleep" value={`${Math.round((lastSession.stages?.deep || 0) * 60)}m`} />
                <ScoreDetail label="REM" value={`${Math.round((lastSession.stages?.rem || 0) * 60)}m`} />
              </View>
            </Card>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {currentSession ? (
              <Card gradient style={styles.actionCard}>
                <Text style={styles.actionIcon}>😴</Text>
                <Text style={styles.actionTitle}>Sleep Session Active</Text>
                <Text style={styles.actionSubtitle}>
                  Started {new Date(currentSession.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Button
                  title="End Session"
                  onPress={onStartSession}
                  variant="secondary"
                  size="medium"
                  style={styles.actionButton}
                />
              </Card>
            ) : (
              <Card gradient style={styles.actionCard}>
                <Text style={styles.actionIcon}>🌙</Text>
                <Text style={styles.actionTitle}>Ready to Sleep?</Text>
                <Text style={styles.actionSubtitle}>Start tracking your sleep session</Text>
                <Button
                  title="Start Sleep Session"
                  onPress={onStartSession}
                  size="medium"
                  style={styles.actionButton}
                />
              </Card>
            )}
          </View>

          {/* Alarm Overview */}
          {primaryAlarm ? (
            <Card style={styles.alarmCard}>
              <View style={styles.alarmHeader}>
                <Text style={styles.alarmTitle}>Smart Wake Window</Text>
                <TouchableOpacity
                  onPress={() => toggleAlarm(primaryAlarm.id).catch(err => console.warn('Failed to toggle alarm', err))}
                >
                  <Text style={styles.alarmToggle}>
                    {primaryAlarm.enabled ? 'On' : 'Off'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.alarmTime}>
                {primaryAlarm.targetWindowStart} – {primaryAlarm.targetWindowEnd}
              </Text>
              <Text style={styles.alarmSubtitle}>
                Wake during your lightest sleep in this window.
              </Text>
              <Button
                title="Edit Schedule"
                size="small"
                variant="ghost"
                onPress={() => {
                  onOpenSettings(primaryAlarm.id);
                }}
                style={styles.alarmEditButton}
              />
            </Card>
          ) : (
            <Card style={styles.alarmCard}>
              <Text style={styles.alarmTitle}>Smart Wake Window</Text>
              <Text style={styles.alarmSubtitle}>
                Set up a smart alarm to wake you during your lightest sleep phase.
              </Text>
              <Button
                title="Create Alarm"
                size="medium"
                onPress={() => {
                  onOpenSettings();
                }}
                style={styles.alarmEditButton}
              />
            </Card>
          )}

          {/* Stats Overview */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="📊"
              label="Avg Duration"
              value={formatDuration(stats.averageDuration)}
            />
            <StatCard
              icon="⭐"
              label="Avg Score"
              value={stats.averageScore.toString()}
            />
            <StatCard
              icon="🔄"
              label="Consistency"
              value={`${stats.consistency}%`}
            />
            <StatCard
              icon="📅"
              label="Sessions"
              value={stats.totalSessions.toString()}
            />
          </View>

          {/* Protocol CTA */}
          <Card style={styles.protocolCard}>
            <View style={styles.protocolHeader}>
              <Text style={styles.protocolTitle}>
                {activeProtocol ? 'Kill the Zombie Mornings' : 'Start Kill the Zombie Mornings'}
              </Text>
              {activeProtocol && (
                <Text style={styles.protocolBadge}>
                  Day {activeProtocol.currentDay}
                </Text>
              )}
            </View>
            <Text style={styles.protocolDescription}>
              Lock in a consistent wake time over 7 days to stop feeling wrecked in the morning.
            </Text>
            <View style={styles.protocolActions}>
              {!activeProtocol ? (
                <Button
                  title="Start 7-Day Reset"
                  size="medium"
                  onPress={() => startProtocol('kill-zombie-mornings', profile.id)}
                />
              ) : (
                <Button
                  title="View Today’s Plan"
                  size="medium"
                  onPress={onOpenProtocol!}
                />
              )}
              {onOpenHistory && (
                <Button
                  title="View History"
                  size="medium"
                  variant="ghost"
                  onPress={onOpenHistory}
                />
              )}
            </View>
          </Card>

          {/* Insights */}
          {insights.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sleep Insights</Text>
                <TouchableOpacity onPress={onViewInsights}>
                  <Text style={styles.sectionAction}>View All</Text>
                </TouchableOpacity>
              </View>

              {insights.slice(0, 2).map((insight, index) => (
                <Card key={index} style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Text style={styles.insightEmoji}>
                      {insight.severity === 'good' ? '✅' : insight.severity === 'warning' ? '⚠️' : '❗'}
                    </Text>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                  </View>
                  <Text style={styles.insightDescription}>{insight.description}</Text>
                  {insight.recommendation && (
                    <Text style={styles.insightRecommendation}>💡 {insight.recommendation}</Text>
                  )}
                </Card>
              ))}
            </View>
          )}

          {/* Premium Upsell */}
          {!isPremium && (
            <Card gradient style={styles.premiumCard}>
              <Text style={styles.premiumIcon}>⭐</Text>
              <Text style={styles.premiumTitle}>Unlock Premium Features</Text>
              <Text style={styles.premiumSubtitle}>
                Get advanced insights, unlimited soundscapes, and more
              </Text>
              <Button
                title="Try Premium"
                onPress={() => {/* Navigate to subscription */}}
                variant="secondary"
                size="medium"
                style={styles.premiumButton}
              />
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
};

interface ScoreDetailProps {
  label: string;
  value: string;
}

const ScoreDetail: React.FC<ScoreDetailProps> = ({ label, value }) => (
  <View style={styles.scoreDetailItem}>
    <Text style={styles.scoreDetailLabel}>{label}</Text>
    <Text style={styles.scoreDetailValue}>{value}</Text>
  </View>
);

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <Card style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Card>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  userName: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  settingsIcon: {
    fontSize: 28,
  },
  scoreCard: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  scoreContainer: {
    marginVertical: spacing.lg,
  },
  scoreDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.lg,
  },
  scoreDetailItem: {
    alignItems: 'center',
  },
  scoreDetailLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  scoreDetailValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  quickActions: {
    marginBottom: spacing.lg,
  },
  actionCard: {
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  actionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  actionButton: {
    minWidth: 200,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  sectionAction: {
    fontSize: typography.sizes.sm,
    color: colors.primary.main,
    fontWeight: typography.weights.medium,
  },
  insightCard: {
    marginBottom: spacing.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  insightEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  insightTitle: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
  },
  insightDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: typography.lineHeights.normal * typography.sizes.sm,
  },
  insightRecommendation: {
    fontSize: typography.sizes.sm,
    color: colors.primary.light,
    fontStyle: 'italic',
  },
  premiumCard: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  premiumIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  premiumTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  premiumSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  premiumButton: {
    minWidth: 180,
  },
  protocolCard: {
    marginTop: spacing.lg,
  },
  protocolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  protocolTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
  },
  protocolBadge: {
    fontSize: typography.sizes.sm,
    color: colors.primary.light,
    fontWeight: typography.weights.medium,
  },
  protocolDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  protocolActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  planCard: {
    marginBottom: spacing.lg,
  },
  planTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  planColumn: {
    flex: 1,
  },
  planLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  planValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  debtLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  debtValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semiBold,
    color: colors.primary.light,
  },
  planHeadline: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  planActions: {
    gap: spacing.xs,
  },
  planActionItem: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  alarmCard: {
    marginBottom: spacing.lg,
  },
  alarmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  alarmTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
  },
  alarmToggle: {
    fontSize: typography.sizes.sm,
    color: colors.primary.light,
    fontWeight: typography.weights.medium,
  },
  alarmTime: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  alarmSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  alarmEditButton: {
    marginTop: spacing.sm,
  },
  debtBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  debtBadge: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  debtBadgeLow: {
    backgroundColor: colors.primary.light + '40',
    color: colors.primary.light,
  },
  debtBadgeMedium: {
    backgroundColor: '#F9C74F40',
    color: '#F9C74F',
  },
  debtBadgeHigh: {
    backgroundColor: '#F8717140',
    color: '#F87171',
  },
});

