/**
 * Circadian Rhythm Utilities
 * Functions for calculating circadian alignment and optimal sleep windows
 */

/**
 * Calculate circadian phase based on bedtime
 */
export function calculateCircadianPhase(bedtime: string): {
  phase: 'early' | 'normal' | 'late';
  hours: number;
} {
  const [hours, minutes] = bedtime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const hourOfDay = totalMinutes / 60;

  if (hourOfDay < 21) {
    return { phase: 'early', hours: hourOfDay };
  } else if (hourOfDay <= 23) {
    return { phase: 'normal', hours: hourOfDay };
  } else {
    return { phase: 'late', hours: hourOfDay };
  }
}

/**
 * Calculate optimal wake window based on circadian rhythm
 */
export function calculateOptimalWakeWindow(
  bedtime: string,
  sleepDuration: number
): { start: number; end: number } {
  const [bedHours, bedMinutes] = bedtime.split(':').map(Number);
  const bedTimeMinutes = bedHours * 60 + bedMinutes;

  // Sleep cycles are ~90 minutes
  const cycles = Math.floor(sleepDuration / 1.5);
  const optimalWakeTime = bedTimeMinutes + cycles * 90;

  // Optimal window is 30 minutes before and after
  const start = optimalWakeTime - 30;
  const end = optimalWakeTime + 30;

  return { start, end };
}

/**
 * Calculate circadian alignment score (0-100)
 */
export function calculateCircadianAlignment(
  actualBedtime: string,
  baselineBedtime: string,
  actualWakeTime: string,
  baselineWakeTime: string
): number {
  const actualBed = parseTimeToMinutes(actualBedtime);
  const baselineBed = parseTimeToMinutes(baselineBedtime);
  const actualWake = parseTimeToMinutes(actualWakeTime);
  const baselineWake = parseTimeToMinutes(baselineWakeTime);

  const bedtimeDeviation = Math.abs(actualBed - baselineBed);
  const wakeTimeDeviation = Math.abs(actualWake - baselineWake);

  // Penalize deviations (30 minutes = 10 point penalty)
  const bedtimeScore = Math.max(0, 100 - (bedtimeDeviation / 30) * 10);
  const wakeTimeScore = Math.max(0, 100 - (wakeTimeDeviation / 30) * 10);

  return Math.round((bedtimeScore + wakeTimeScore) / 2);
}

/**
 * Parse time string to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Determine chronotype based on sleep patterns
 */
export function determineChronotype(
  averageBedtime: string,
  averageWakeTime: string
): 'early_bird' | 'normal' | 'night_owl' {
  const [bedHours] = averageBedtime.split(':').map(Number);
  const [wakeHours] = averageWakeTime.split(':').map(Number);

  if (bedHours < 22 && wakeHours < 7) {
    return 'early_bird';
  } else if (bedHours > 23 || wakeHours > 9) {
    return 'night_owl';
  } else {
    return 'normal';
  }
}

/**
 * Calculate melatonin onset time (approximate)
 */
export function calculateMelatoninOnset(bedtime: string): string {
  const [hours, minutes] = bedtime.split(':').map(Number);
  // Melatonin typically starts 2-3 hours before sleep
  const onsetHours = hours - 2;
  const onsetMinutes = minutes;

  const hour = onsetHours < 0 ? onsetHours + 24 : onsetHours;
  return `${String(hour).padStart(2, '0')}:${String(onsetMinutes).padStart(2, '0')}`;
}

