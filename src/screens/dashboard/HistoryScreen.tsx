/**
 * History Screen
 * Shows recent sleep sessions and simple weekly summary
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Card, Button } from '../../components';
import { colors, typography, spacing } from '../../config/theme';
import { useUserStore } from '../../store/userStore';
import { sleepService } from '../../services/sleepService';
import { SleepSession } from '../../models';
import { formatDuration, formatDateShort } from '../../utils/dateUtils';
import { storageService } from '../../services/storageService';

interface HistoryScreenProps {
  onClose: () => void;
  onAddSleep?: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onClose, onAddSleep }) => {
  const { profile } = useUserStore();
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      setIsLoading(true);
      try {
        if (!storageService.isInitialized()) {
          await storageService.setupDB();
        }
        const recent = await sleepService.getRecentSessions(profile.id, 14);
        setSessions(recent);

        const completed = recent.filter((s) => s.endAt && s.durationMin);
        if (completed.length === 0) {
          setWeeklySummary('No completed sleep sessions yet. Start tracking tonight.');
        } else {
          const week = completed.slice(0, 7);
          const totalMinutes = week.reduce((sum, s) => sum + (s.durationMin || 0), 0);
          const avgHours = totalMinutes / week.length / 60;
          const goal = profile.sleepGoalHours || 8;
          const diff = avgHours - goal;

          // Calculate timing consistency (bedtime variance)
          const bedtimes = week.map((s) => {
            const date = new Date(s.startAt);
            return date.getHours() + date.getMinutes() / 60;
          });
          const avgBedtime = bedtimes.reduce((sum, t) => sum + t, 0) / bedtimes.length;
          const bedtimeVariance = bedtimes.reduce((sum, t) => sum + Math.pow(t - avgBedtime, 2), 0) / bedtimes.length;
          const bedtimeStdDev = Math.sqrt(bedtimeVariance);
          const bedtimeVarianceHours = bedtimeStdDev;

          // Calculate wake time consistency
          const wakeTimes = week.map((s) => {
            const date = new Date(s.endAt!);
            return date.getHours() + date.getMinutes() / 60;
          });
          const avgWakeTime = wakeTimes.reduce((sum, t) => sum + t, 0) / wakeTimes.length;
          const wakeVariance = wakeTimes.reduce((sum, t) => sum + Math.pow(t - avgWakeTime, 2), 0) / wakeTimes.length;
          const wakeStdDev = Math.sqrt(wakeVariance);
          const wakeVarianceHours = wakeStdDev;

          // Build comprehensive summary
          const parts: string[] = [];

          // Amount
          if (diff < -1) {
            parts.push(
              `You averaged ${avgHours.toFixed(1)}h over the last week, ${Math.abs(diff).toFixed(1)}h below your target of ${goal.toFixed(1)}h.`
            );
          } else if (diff > 0.5) {
            parts.push(
              `You averaged ${avgHours.toFixed(1)}h over the last week, slightly above your target of ${goal.toFixed(1)}h.`
            );
          } else {
            parts.push(
              `You averaged ${avgHours.toFixed(1)}h over the last week, close to your target of ${goal.toFixed(1)}h.`
            );
          }

          // Timing consistency
          if (bedtimeVarianceHours > 1.5) {
            parts.push(
              `Your bedtime varies by ${bedtimeVarianceHours.toFixed(1)} hours on average—this inconsistency hurts sleep quality.`
            );
          } else if (bedtimeVarianceHours < 0.5) {
            parts.push(`Your bedtime is very consistent (within ${bedtimeVarianceHours.toFixed(1)}h), which supports better sleep.`);
          }

          // Wake time consistency
          if (wakeVarianceHours > 1.5) {
            parts.push(
              `Your wake time shifts by ${wakeVarianceHours.toFixed(1)} hours—try locking it in for better mornings.`
            );
          } else if (wakeVarianceHours < 0.5 && bedtimeVarianceHours >= 0.5) {
            parts.push(`Your wake time is consistent, but your bedtime needs work.`);
          }

          setWeeklySummary(parts.join(' '));
        }
      } catch (error) {
        console.warn('Failed to load history:', error);
        setWeeklySummary('Unable to load history. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [profile]);

  const renderItem = ({ item }: { item: SleepSession }) => {
    const duration = item.durationMin ? formatDuration(item.durationMin) : 'N/A';
    const dateLabel = formatDateShort(item.startAt);

    return (
      <Card style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionDate}>{dateLabel}</Text>
          {item.sleepScore !== undefined && (
            <Text style={styles.sessionScore}>{Math.round(item.sleepScore)}</Text>
          )}
        </View>
        <Text style={styles.sessionDetail}>Duration: {duration}</Text>
        {item.awakeCount !== undefined && (
          <Text style={styles.sessionDetail}>Awakenings: {item.awakeCount}</Text>
        )}
      </Card>
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sleep History</Text>
          <Text style={styles.subtitle}>{weeklySummary}</Text>
        </View>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !isLoading ? (
              <Text style={styles.emptyText}>No sleep sessions recorded yet.</Text>
            ) : null
          }
        />
        <View style={styles.footer}>
          {onAddSleep && (
            <Button
              title="Add Sleep Log"
              onPress={onAddSleep}
              size="medium"
              style={styles.footerButton}
            />
          )}
          <Button
            title="Close"
            onPress={onClose}
            fullWidth={!onAddSleep}
            size="medium"
            variant="ghost"
            style={onAddSleep ? styles.footerButton : undefined}
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
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sessionCard: {
    padding: spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sessionDate: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
  },
  sessionScore: {
    fontSize: typography.sizes.base,
    color: colors.primary.light,
    fontWeight: typography.weights.medium,
  },
  sessionDetail: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});


