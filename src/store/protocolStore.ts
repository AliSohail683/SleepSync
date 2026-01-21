/**
 * Protocol Store
 * Manages structured multi-day sleep protocols (programs)
 */

import { create } from 'zustand';
import { mmkvStorage } from '../storage/mmkv/storage';
import { UUID } from '../models';

export type ProtocolId = 'kill-zombie-mornings';

interface ProtocolDay {
  day: number;
  title: string;
  focus: string;
  tasks: string[];
}

export interface ProtocolDefinition {
  id: ProtocolId;
  name: string;
  durationDays: number;
  description: string;
  days: ProtocolDay[];
}

export interface ProtocolProgress {
  id: ProtocolId;
  currentDay: number;
  completedDays: number[];
  startedAt: string;
  completedAt?: string;
}

interface ProtocolState {
  activeProtocol: ProtocolProgress | null;
  definitions: Record<ProtocolId, ProtocolDefinition>;

  // Actions
  startProtocol: (id: ProtocolId, userId: UUID) => void;
  completeToday: () => void;
  skipToday: () => void;
  resetProtocol: () => void;
}

const STORAGE_KEY = 'protocol_state_v1';

const loadPersistedState = (): ProtocolProgress | null => {
  return mmkvStorage.getPreference<ProtocolProgress | null>(STORAGE_KEY, null) ?? null;
};

const savePersistedState = (progress: ProtocolProgress | null) => {
  if (progress) {
    mmkvStorage.setPreference(STORAGE_KEY, progress);
  } else {
    mmkvStorage.removePreference(STORAGE_KEY);
  }
};

const KILL_ZOMBIE_MORNINGS: ProtocolDefinition = {
  id: 'kill-zombie-mornings',
  name: 'Kill the Zombie Mornings',
  durationDays: 7,
  description:
    'A 7‑day reset to lock in a consistent wake time and stop feeling wrecked in the morning.',
  days: [
    {
      day: 1,
      title: 'Lock the Wake Time',
      focus: 'Pick a wake time you can hold for the next 7 days.',
      tasks: [
        'Choose a wake time you can realistically keep even on weekends.',
        'Set your smart alarm window around that time.',
      ],
    },
    {
      day: 2,
      title: 'No Snooze Rule',
      focus: 'Break the snooze loop.',
      tasks: [
        'Move your phone/alarm out of arm’s reach.',
        'When the alarm goes off, stand up before you touch your phone.',
      ],
    },
    {
      day: 3,
      title: 'Anchor Light Exposure',
      focus: 'Tell your brain when “day” starts.',
      tasks: [
        'Get 5–10 minutes of light (preferably outside) within 60 minutes of waking.',
        'Avoid sunglasses for the first 10 minutes outside.',
      ],
    },
    {
      day: 4,
      title: 'Caffeine Cut-Off',
      focus: 'Stop sabotaging your sleep with late caffeine.',
      tasks: [
        'Set a hard caffeine cut-off 8 hours before your target bedtime.',
        'Track whether you stick to it today.',
      ],
    },
    {
      day: 5,
      title: 'Wind-Down Trigger',
      focus: 'Give your brain a clear “we’re done for the day” signal.',
      tasks: [
        'Pick a 15–20 minute wind-down ritual (reading, stretching, journaling).',
        'Start it ~30 minutes before tonight’s target bedtime.',
      ],
    },
    {
      day: 6,
      title: 'Consistency Under Stress',
      focus: 'Hold the line even when the day gets messy.',
      tasks: [
        'Protect your wake time even if bedtime slipped.',
        'If you’re exhausted, schedule a short nap earlier in the day instead of sleeping in.',
      ],
    },
    {
      day: 7,
      title: 'Review & Lock In',
      focus: 'Turn this into your new default.',
      tasks: [
        'Review how many days you kept your wake time within ±15 minutes.',
        'Decide what wake time you’ll keep for the next 2 weeks.',
      ],
    },
  ],
};

const definitions: Record<ProtocolId, ProtocolDefinition> = {
  'kill-zombie-mornings': KILL_ZOMBIE_MORNINGS,
};

export const useProtocolStore = create<ProtocolState>((set, get) => ({
  activeProtocol: loadPersistedState(),
  definitions,

  startProtocol: (id: ProtocolId, _userId: UUID) => {
    const def = get().definitions[id];
    const now = new Date().toISOString();
    const progress: ProtocolProgress = {
      id,
      currentDay: 1,
      completedDays: [],
      startedAt: now,
    };
    savePersistedState(progress);
    set({ activeProtocol: progress });
  },

  completeToday: () => {
    const { activeProtocol, definitions } = get();
    if (!activeProtocol) return;

    const def = definitions[activeProtocol.id];
    const today = activeProtocol.currentDay;
    const completedDays = Array.from(new Set([...activeProtocol.completedDays, today]));

    const isLastDay = today >= def.durationDays;
    const nextDay = isLastDay ? today : today + 1;

    const updated: ProtocolProgress = {
      ...activeProtocol,
      currentDay: nextDay,
      completedDays,
      completedAt: isLastDay ? new Date().toISOString() : activeProtocol.completedAt,
    };

    savePersistedState(updated);
    set({ activeProtocol: updated });
  },

  skipToday: () => {
    const { activeProtocol, definitions } = get();
    if (!activeProtocol) return;
    const def = definitions[activeProtocol.id];

    const isLastDay = activeProtocol.currentDay >= def.durationDays;
    const nextDay = isLastDay ? activeProtocol.currentDay : activeProtocol.currentDay + 1;

    const updated: ProtocolProgress = {
      ...activeProtocol,
      currentDay: nextDay,
    };

    savePersistedState(updated);
    set({ activeProtocol: updated });
  },

  resetProtocol: () => {
    savePersistedState(null);
    set({ activeProtocol: null });
  },
}));


