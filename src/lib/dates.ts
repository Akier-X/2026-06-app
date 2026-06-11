/** "YYYY-MM-DD" in the device's local timezone. */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey();
}

export function daysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
}

/** Last `n` date keys, oldest first, ending today. */
export function lastNDateKeys(n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(daysAgoKey(i));
  }
  return keys;
}

/**
 * Consecutive completed days ending today (or yesterday, so the streak
 * doesn't read as broken before the user checks in today).
 */
export function calcStreak(isDone: (key: string) => boolean): number {
  let streak = 0;
  let offset = isDone(todayKey()) ? 0 : 1;
  while (isDone(daysAgoKey(offset + streak))) {
    streak++;
  }
  return streak;
}

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

export function weekdayLabel(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return WEEKDAYS_JA[d.getDay()];
}
