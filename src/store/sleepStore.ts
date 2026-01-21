/**
 * Sleep Store
 * Manages sleep session state and tracking
 */

import { create } from 'zustand';
import { SleepSession, UUID, SleepInsight } from '../models';
import { sleepService } from '../services/sleepService';

interface SleepState {
  currentSession: SleepSession | null;
  recentSessions: SleepSession[];
  insights: SleepInsight[];
  isLoading: boolean;
  
  // Actions
  startSession: (userId: UUID) => Promise<void>;
  endSession: () => Promise<void>;
  loadRecentSessions: (userId: UUID, count?: number) => Promise<void>;
  loadInsights: (userId: UUID, days?: number) => Promise<void>;
  refreshSessions: (userId: UUID) => Promise<void>;
}

export const useSleepStore = create<SleepState>((set, get) => ({
  currentSession: null,
  recentSessions: [],
  insights: [],
  isLoading: false,

  startSession: async (userId: UUID) => {
    set({ isLoading: true });
    try {
      const session = await sleepService.startSession(userId);
      set({ currentSession: session, isLoading: false });
    } catch (error: any) {
      console.error('Failed to start session:', error);
      set({ isLoading: false });
      // Re-throw with a user-friendly message
      const errorMessage = error?.message || 'Failed to start sleep session. Please try again.';
      throw new Error(errorMessage);
    }
  },

  endSession: async () => {
    const { currentSession } = get();
    if (!currentSession) throw new Error('No active session');

    set({ isLoading: true });
    try {
      await sleepService.endSession(currentSession.id);
      
      // Refresh recent sessions
      const recentSessions = await sleepService.getRecentSessions(currentSession.userId, 30);
      
      set({
        currentSession: null,
        recentSessions,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to end session:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  loadRecentSessions: async (userId: UUID, count = 30) => {
    set({ isLoading: true });
    try {
      const sessions = await sleepService.getRecentSessions(userId, count);
      
      // Check for active session
      const activeSession = sessions.find(s => !s.endAt);
      
      set({
        recentSessions: sessions,
        currentSession: activeSession || null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load sessions:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  loadInsights: async (userId: UUID, days = 7) => {
    try {
      const insights = await sleepService.getSleepInsights(userId, days);
      set({ insights });
    } catch (error) {
      console.error('Failed to load insights:', error);
      throw error;
    }
  },

  refreshSessions: async (userId: UUID) => {
    const { loadRecentSessions, loadInsights } = get();
    await Promise.all([
      loadRecentSessions(userId),
      loadInsights(userId),
    ]);
  },
}));

