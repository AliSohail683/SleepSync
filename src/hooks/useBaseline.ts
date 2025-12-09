/**
 * Baseline Progress Hook
 * Tracks baseline collection progress
 */

import { useEffect, useState } from 'react';
import { baselineAnalyzer } from '../engines/baseline/BaselineAnalyzer';
import { UUID } from '../models';

export const useBaseline = (userId: UUID | null) => {
  const [progress, setProgress] = useState({
    daysCollected: 0,
    daysRemaining: 14,
    progress: 0,
    isComplete: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const loadProgress = async () => {
      setIsLoading(true);
      try {
        const baselineProgress = await baselineAnalyzer.getBaselineProgress(userId);
        setProgress(baselineProgress);
      } catch (error) {
        console.error('Failed to load baseline progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [userId]);

  return { ...progress, isLoading };
};

