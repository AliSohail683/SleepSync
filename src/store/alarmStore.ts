/**
 * Alarm Store
 * Manages alarm configurations and scheduling
 */

import { create } from 'zustand';
import { AlarmConfig, UUID } from '../models';
import { alarmService } from '../services/alarmService';

interface AlarmState {
  alarms: AlarmConfig[];
  isLoading: boolean;
  
  // Actions
  loadAlarms: (userId: UUID) => Promise<void>;
  createAlarm: (alarm: AlarmConfig) => Promise<void>;
  updateAlarm: (alarmId: UUID, updates: Partial<AlarmConfig>) => Promise<void>;
  deleteAlarm: (alarmId: UUID) => Promise<void>;
  toggleAlarm: (alarmId: UUID) => Promise<void>;
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  alarms: [],
  isLoading: false,

  loadAlarms: async (userId: UUID) => {
    set({ isLoading: true });
    try {
      const alarms = await alarmService.getUserAlarms(userId);
      set({ alarms, isLoading: false });
    } catch (error) {
      console.error('Failed to load alarms:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createAlarm: async (alarm: AlarmConfig) => {
    set({ isLoading: true });
    try {
      await alarmService.createAlarm(alarm);
      await get().loadAlarms(alarm.userId);
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to create alarm:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateAlarm: async (alarmId: UUID, updates: Partial<AlarmConfig>) => {
    try {
      // Find the alarm to get userId
      const alarm = get().alarms.find(a => a.id === alarmId);
      if (!alarm) throw new Error('Alarm not found');

      await alarmService.updateAlarm(alarmId, { ...updates, userId: alarm.userId });
      await get().loadAlarms(alarm.userId);
    } catch (error) {
      console.error('Failed to update alarm:', error);
      throw error;
    }
  },

  deleteAlarm: async (alarmId: UUID) => {
    try {
      await alarmService.deleteAlarm(alarmId);
      
      const alarms = get().alarms.filter(a => a.id !== alarmId);
      set({ alarms });
    } catch (error) {
      console.error('Failed to delete alarm:', error);
      throw error;
    }
  },

  toggleAlarm: async (alarmId: UUID) => {
    try {
      const alarm = get().alarms.find(a => a.id === alarmId);
      if (!alarm) throw new Error('Alarm not found');

      await get().updateAlarm(alarmId, { enabled: !alarm.enabled });
    } catch (error) {
      console.error('Failed to toggle alarm:', error);
      throw error;
    }
  },
}));

