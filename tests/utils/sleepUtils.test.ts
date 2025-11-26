/**
 * Sleep Utils Tests
 * Unit tests for sleep calculation algorithms
 */

import {
  calculateSleepScore,
  estimateSleepStages,
  calculateSleepDebt,
  calculateCumulativeDebt,
  getSleepQuality,
  calculateAverageSleepScore,
} from '../../src/utils/sleepUtils';
import { SleepSession, SleepDebtRecord } from '../../src/models';

describe('calculateSleepScore', () => {
  const mockSession: SleepSession = {
    id: '1',
    userId: 'user1',
    startAt: '2024-01-01T22:00:00Z',
    endAt: '2024-01-02T06:00:00Z',
    durationMin: 480, // 8 hours
    awakeCount: 1,
    sleepLatency: 15,
  };

  it('should calculate perfect score for ideal sleep', () => {
    const score = calculateSleepScore(mockSession, 8, 'none');
    expect(score).toBeGreaterThanOrEqual(90);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should penalize high caffeine intake', () => {
    const score = calculateSleepScore(mockSession, 8, 'high');
    expect(score).toBeLessThan(100);
  });

  it('should penalize multiple wake events', () => {
    const sessionWithWakes = {
      ...mockSession,
      awakeCount: 5,
    };
    const score = calculateSleepScore(sessionWithWakes, 8, 'none');
    expect(score).toBeLessThan(95);
  });

  it('should bonus quick sleep onset', () => {
    const sessionQuickSleep = {
      ...mockSession,
      sleepLatency: 10,
    };
    const score = calculateSleepScore(sessionQuickSleep, 8, 'none');
    expect(score).toBeGreaterThan(90);
  });

  it('should penalize slow sleep onset', () => {
    const sessionSlowSleep = {
      ...mockSession,
      sleepLatency: 50,
    };
    const score = calculateSleepScore(sessionSlowSleep, 8, 'none');
    expect(score).toBeLessThan(95);
  });

  it('should handle insufficient sleep', () => {
    const shortSession = {
      ...mockSession,
      durationMin: 300, // 5 hours
    };
    const score = calculateSleepScore(shortSession, 8, 'none');
    expect(score).toBeLessThan(70);
  });

  it('should bonus optimal sleep stages', () => {
    const sessionWithStages = {
      ...mockSession,
      stages: {
        light: 4.0, // 50%
        deep: 1.6,  // 20%
        rem: 2.4,   // 30%
      },
    };
    const score = calculateSleepScore(sessionWithStages, 8, 'none');
    expect(score).toBeGreaterThanOrEqual(95);
  });
});

describe('estimateSleepStages', () => {
  it('should estimate stages for 8-hour sleep', () => {
    const stages = estimateSleepStages(480); // 8 hours

    expect(stages.light).toBeGreaterThan(0);
    expect(stages.deep).toBeGreaterThan(0);
    expect(stages.rem).toBeGreaterThan(0);
    expect(stages.light + stages.deep + stages.rem).toBeCloseTo(8, 0);
  });

  it('should have reasonable stage proportions', () => {
    const stages = estimateSleepStages(480);
    const total = stages.light + stages.deep + stages.rem;

    const lightPercent = stages.light / total;
    const deepPercent = stages.deep / total;
    const remPercent = stages.rem / total;

    expect(lightPercent).toBeGreaterThan(0.4);
    expect(lightPercent).toBeLessThan(0.6);
    expect(deepPercent).toBeGreaterThan(0.1);
    expect(deepPercent).toBeLessThan(0.3);
    expect(remPercent).toBeGreaterThan(0.15);
    expect(remPercent).toBeLessThan(0.35);
  });

  it('should scale with duration', () => {
    const short = estimateSleepStages(240); // 4 hours
    const long = estimateSleepStages(600); // 10 hours

    const shortTotal = short.light + short.deep + short.rem;
    const longTotal = long.light + long.deep + long.rem;

    expect(shortTotal).toBeCloseTo(4, 0);
    expect(longTotal).toBeCloseTo(10, 0);
  });
});

describe('calculateSleepDebt', () => {
  it('should calculate debt when under-sleeping', () => {
    const debt = calculateSleepDebt(8, 6);
    expect(debt).toBe(2);
  });

  it('should return 0 when meeting sleep goal', () => {
    const debt = calculateSleepDebt(8, 8);
    expect(debt).toBe(0);
  });

  it('should return 0 when over-sleeping', () => {
    const debt = calculateSleepDebt(8, 9);
    expect(debt).toBe(0);
  });
});

describe('calculateCumulativeDebt', () => {
  it('should sum up debt over multiple days', () => {
    const records: SleepDebtRecord[] = [
      { date: '2024-01-01', idealHours: 8, actualHours: 6, debtHours: 2 },
      { date: '2024-01-02', idealHours: 8, actualHours: 7, debtHours: 1 },
      { date: '2024-01-03', idealHours: 8, actualHours: 5, debtHours: 3 },
    ];

    const totalDebt = calculateCumulativeDebt(records);
    expect(totalDebt).toBe(6);
  });

  it('should return 0 for empty records', () => {
    const totalDebt = calculateCumulativeDebt([]);
    expect(totalDebt).toBe(0);
  });
});

describe('getSleepQuality', () => {
  it('should return excellent for score >= 90', () => {
    const quality = getSleepQuality(95);
    expect(quality.label).toBe('Excellent');
    expect(quality.emoji).toBe('🌟');
  });

  it('should return good for score 75-89', () => {
    const quality = getSleepQuality(80);
    expect(quality.label).toBe('Good');
    expect(quality.emoji).toBe('😊');
  });

  it('should return fair for score 60-74', () => {
    const quality = getSleepQuality(65);
    expect(quality.label).toBe('Fair');
    expect(quality.emoji).toBe('😐');
  });

  it('should return poor for score < 60', () => {
    const quality = getSleepQuality(50);
    expect(quality.label).toBe('Poor');
    expect(quality.emoji).toBe('😴');
  });
});

describe('calculateAverageSleepScore', () => {
  const mockSessions: SleepSession[] = [
    {
      id: '1',
      userId: 'user1',
      startAt: '2024-01-01T22:00:00Z',
      endAt: '2024-01-02T06:00:00Z',
      durationMin: 480,
      sleepScore: 85,
    },
    {
      id: '2',
      userId: 'user1',
      startAt: '2024-01-02T22:00:00Z',
      endAt: '2024-01-03T06:00:00Z',
      durationMin: 480,
      sleepScore: 90,
    },
    {
      id: '3',
      userId: 'user1',
      startAt: '2024-01-03T22:00:00Z',
      endAt: '2024-01-04T06:00:00Z',
      durationMin: 480,
      sleepScore: 75,
    },
  ];

  it('should calculate average score', () => {
    const avgScore = calculateAverageSleepScore(mockSessions);
    expect(avgScore).toBe(83); // (85 + 90 + 75) / 3 = 83.33 -> 83
  });

  it('should return 0 for empty sessions', () => {
    const avgScore = calculateAverageSleepScore([]);
    expect(avgScore).toBe(0);
  });

  it('should handle sessions without scores', () => {
    const sessionsNoScores = mockSessions.map(s => ({ ...s, sleepScore: undefined }));
    const avgScore = calculateAverageSleepScore(sessionsNoScores as SleepSession[]);
    expect(avgScore).toBe(0);
  });
});

