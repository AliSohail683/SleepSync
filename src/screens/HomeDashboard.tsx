/**
 * Home Dashboard Screen
 * Main screen showing sleep stats, quick actions, and insights
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Card, AnimatedSleepScore, Button, LoadingSpinner } from '../components';
import { colors, typography, spacing } from '../config/theme';
import { useUserStore } from '../store/userStore';
import { useSleepStore } from '../store/sleepStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { formatDuration } from '../utils/dateUtils';

interface HomeDashboardProps {
  onStartSession: () => void;
  onViewInsights: () => void;
  onOpenSettings: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartSession,
  onViewInsights,
  onOpenSettings,
}) => {
  const { profile } = useUserStore();
  const { currentSession, recentSessions, insights, loadRecentSessions, loadInsights } = useSleepStore();
  const { hasActiveSubscription } = useSubscriptionStore();
  
  const isPremium = hasActiveSubscription();
  const [stats, setStats] = React.useState({
    averageDuration: 0,
    averageScore: 0,
    totalSessions: 0,
    consistency: 0,
  });

  useEffect(() => {
    if (profile) {
      loadRecentSessions(profile.id);
      loadInsights(profile.id);
      calculateStats();
    }
  }, [profile]);

  const calculateStats = () => {
    if (recentSessions.length > 0) {
      const completed = recentSessions.filter(s => s.endAt && s.durationMin);
      const avgDuration = completed.reduce((sum, s) => sum + (s.durationMin || 0), 0) / completed.length;
      const avgScore = completed.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / completed.length;
      
      setStats({
        averageDuration: Math.round(avgDuration),
        averageScore: Math.round(avgScore),
        totalSessions: completed.length,
        consistency: 85, // Placeholder
      });
    }
  };

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
            <TouchableOpacity onPress={onOpenSettings}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

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
});

