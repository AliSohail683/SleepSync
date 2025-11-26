/**
 * Alarm Utils Tests
 * Unit tests for alarm and wake time calculations
 */

import {
  computeWakeMoment,
  predictSleepStages,
  shouldAlarmTrigger,
  getTimeUntilAlarm,
  validateAlarmConfig,
} from '../../src/utils/alarmUtils';
import { AlarmConfig } from '../../src/models';

describe('computeWakeMoment', () => {
  it('should return window start when no predicted stages', () => {
    const wakeMoment = computeWakeMoment('06:00', '06:30');
    const expectedHour = 6;
    const expectedMinute = 0;

    expect(wakeMoment.getHours()).toBe(expectedHour);
    expect(wakeMoment.getMinutes()).toBe(expectedMinute);
  });

  it('should find earliest light sleep moment in window', () => {
    const now = new Date();
    const stages = [
      { time: new Date(now.getTime() + 10 * 60 * 1000), stage: 'deep' as const },
      { time: new Date(now.getTime() + 20 * 60 * 1000), stage: 'light' as const },
      { time: new Date(now.getTime() + 30 * 60 * 1000), stage: 'light' as const },
    ];

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const windowStart = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;
    const windowEnd = `${currentHour + 1}:${currentMinute.toString().padStart(2, '0')}`;

    const wakeMoment = computeWakeMoment(windowStart, windowEnd, stages);
    
    // Should select the first light sleep moment
    expect(wakeMoment.getTime()).toBe(stages[1].time.getTime());
  });
});

describe('predictSleepStages', () => {
  it('should generate stages for expected duration', () => {
    const sleepStart = new Date();
    const stages = predictSleepStages(sleepStart, 8);

    expect(stages.length).toBeGreaterThan(0);
    expect(stages[0].time.getTime()).toBeGreaterThanOrEqual(sleepStart.getTime());
  });

  it('should follow sleep cycle pattern', () => {
    const sleepStart = new Date();
    const stages = predictSleepStages(sleepStart, 3); // 3 hours = 2 cycles

    const stageTypes = stages.map(s => s.stage);
    
    // Should contain all stage types
    expect(stageTypes).toContain('light');
    expect(stageTypes).toContain('deep');
    expect(stageTypes).toContain('rem');
  });
});

describe('shouldAlarmTrigger', () => {
  const mockAlarm: AlarmConfig = {
    id: '1',
    userId: 'user1',
    enabled: true,
    targetWindowStart: '06:00',
    targetWindowEnd: '06:30',
    gentleWake: true,
    vibrationEnabled: true,
    daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
  };

  it('should trigger on enabled weekday', () => {
    const monday = new Date('2024-01-01'); // Monday
    const should = shouldAlarmTrigger(mockAlarm, monday);
    expect(should).toBe(true);
  });

  it('should not trigger on weekend', () => {
    const saturday = new Date('2024-01-06'); // Saturday
    const should = shouldAlarmTrigger(mockAlarm, saturday);
    expect(should).toBe(false);
  });

  it('should not trigger when disabled', () => {
    const disabledAlarm = { ...mockAlarm, enabled: false };
    const monday = new Date('2024-01-01');
    const should = shouldAlarmTrigger(disabledAlarm, monday);
    expect(should).toBe(false);
  });
});

describe('validateAlarmConfig', () => {
  it('should validate correct alarm config', () => {
    const config: Partial<AlarmConfig> = {
      targetWindowStart: '06:00',
      targetWindowEnd: '06:30',
    };
    const isValid = validateAlarmConfig(config);
    expect(isValid).toBe(true);
  });

  it('should reject missing times', () => {
    const config: Partial<AlarmConfig> = {
      targetWindowStart: '06:00',
    };
    const isValid = validateAlarmConfig(config);
    expect(isValid).toBe(false);
  });

  it('should reject invalid time format', () => {
    const config: Partial<AlarmConfig> = {
      targetWindowStart: '25:00', // Invalid hour
      targetWindowEnd: '06:30',
    };
    const isValid = validateAlarmConfig(config);
    expect(isValid).toBe(false);
  });

  it('should accept midnight crossing times', () => {
    const config: Partial<AlarmConfig> = {
      targetWindowStart: '23:30',
      targetWindowEnd: '00:30',
    };
    const isValid = validateAlarmConfig(config);
    expect(isValid).toBe(true);
  });
});

