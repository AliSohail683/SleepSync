/**
 * Session Merger
 * Handles merging fragmented sleep sessions
 */

import { SleepSessionEnhanced } from '../../types/sleep';

class SessionMerger {
  /**
   * Merge fragmented sessions (e.g., user got up briefly)
   */
  async mergeSessions(
    sessions: SleepSessionEnhanced[],
    maxGapMinutes: number = 30
  ): Promise<SleepSessionEnhanced[]> {
    if (sessions.length <= 1) return sessions;

    const merged: SleepSessionEnhanced[] = [];
    let current = sessions[0];

    for (let i = 1; i < sessions.length; i++) {
      const next = sessions[i];
      const gap = this.calculateGap(current, next);

      if (gap <= maxGapMinutes) {
        // Merge sessions
        current = this.mergeTwoSessions(current, next);
      } else {
        // Gap too large, keep separate
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
    return merged;
  }

  /**
   * Calculate gap between sessions in minutes
   */
  private calculateGap(
    session1: SleepSessionEnhanced,
    session2: SleepSessionEnhanced
  ): number {
    const end1 = session1.endAt ? new Date(session1.endAt).getTime() : 0;
    const start2 = new Date(session2.startAt).getTime();
    return (start2 - end1) / 60000; // minutes
  }

  /**
   * Merge two sessions into one
   */
  private mergeTwoSessions(
    session1: SleepSessionEnhanced,
    session2: SleepSessionEnhanced
  ): SleepSessionEnhanced {
    const totalDuration =
      (session1.durationMin || 0) + (session2.durationMin || 0);

    const mergedStages = {
      light: (session1.stages?.light || 0) + (session2.stages?.light || 0),
      deep: (session1.stages?.deep || 0) + (session2.stages?.deep || 0),
      rem: (session1.stages?.rem || 0) + (session2.stages?.rem || 0),
    };

    const mergedDisturbances = [
      ...(session1.disturbances || []),
      ...(session2.disturbances || []),
    ];

    return {
      ...session1,
      endAt: session2.endAt,
      durationMin: totalDuration,
      stages: mergedStages,
      disturbances: mergedDisturbances,
      stageSegments: [
        ...(session1.stageSegments || []),
        ...(session2.stageSegments || []),
      ],
    };
  }
}

export const sessionMerger = new SessionMerger();
export default sessionMerger;

