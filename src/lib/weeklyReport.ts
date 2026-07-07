import { lastNDateKeys, todayKey, weekdayLabel } from '@/lib/dates';
import type { Habit, MoodValue } from '@/types';

export interface HabitInsight {
  habitName: string;
  habitEmoji: string;
  streak: number;
  weekRate: number; // 0-1
}

export interface DayPattern {
  dayLabel: string;
  avgMood: number; // 1-5, 0 if no data
  completionRate: number; // 0-1
}

export interface WeeklyReport {
  weeklyDone: number;
  totalPossible: number;
  weeklyRate: number; // 0-1
  avgMood: number; // 1-5, 0 if no data
  bestHabit: HabitInsight | null;
  worstHabit: HabitInsight | null;
  // Premium-only fields
  dayPatterns: DayPattern[];
  moodHabitCorrelation: string | null; // e.g. "運動した日の気分は平均1.2高い"
  lowMoodDayWarning: string | null; // e.g. "火曜日は気分が落ち込みやすい傾向"
  topInsight: string | null;
}

function calcHabitWeekRate(
  habit: Habit,
  completions: Record<string, string[]>,
  week: string[],
): number {
  const done = week.filter((key) => (completions[key] ?? []).includes(habit.id)).length;
  return week.length === 0 ? 0 : done / week.length;
}

function calcHabitStreak(
  habit: Habit,
  completions: Record<string, string[]>,
): number {
  let streak = 0;
  const today = todayKey();
  // Check up to 90 days back
  const allKeys = lastNDateKeys(90);
  for (const key of [...allKeys].reverse()) {
    if (key > today) continue;
    if ((completions[key] ?? []).includes(habit.id)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function generateWeeklyReport(
  habits: Habit[],
  completions: Record<string, string[]>,
  moods: Record<string, MoodValue>,
): WeeklyReport {
  const week = lastNDateKeys(7);
  const total = habits.length;

  // Basic stats
  const weeklyDone = week.reduce(
    (sum, key) =>
      sum + (completions[key] ?? []).filter((id) => habits.some((h) => h.id === id)).length,
    0,
  );
  const totalPossible = total * 7;
  const weeklyRate = totalPossible === 0 ? 0 : weeklyDone / totalPossible;

  // Average mood this week
  const moodValues = week.map((k) => moods[k]).filter(Boolean) as MoodValue[];
  const avgMood =
    moodValues.length === 0 ? 0 : moodValues.reduce((a, b) => a + b, 0) / moodValues.length;

  // Per-habit stats
  const habitInsights: HabitInsight[] = habits.map((h) => ({
    habitName: h.name,
    habitEmoji: h.emoji,
    streak: calcHabitStreak(h, completions),
    weekRate: calcHabitWeekRate(h, completions, week),
  }));

  const sorted = [...habitInsights].sort((a, b) => b.weekRate - a.weekRate);
  const bestHabit = sorted[0] ?? null;
  const worstHabit = sorted.length > 1 ? sorted[sorted.length - 1] : null;

  // Day-of-week patterns (last 4 weeks = 28 days)
  const longHistory = lastNDateKeys(28);
  const dayBuckets: Record<string, { moods: number[]; rates: number[] }> = {};
  for (const key of longHistory) {
    const label = weekdayLabel(key);
    if (!dayBuckets[label]) dayBuckets[label] = { moods: [], rates: [] };
    const moodVal = moods[key];
    if (moodVal) dayBuckets[label].moods.push(moodVal);
    const done = (completions[key] ?? []).filter((id) => habits.some((h) => h.id === id)).length;
    const rate = total === 0 ? 0 : done / total;
    dayBuckets[label].rates.push(rate);
  }
  const dayPatterns: DayPattern[] = Object.entries(dayBuckets).map(([label, data]) => ({
    dayLabel: label,
    avgMood: data.moods.length === 0 ? 0 : data.moods.reduce((a, b) => a + b, 0) / data.moods.length,
    completionRate: data.rates.length === 0 ? 0 : data.rates.reduce((a, b) => a + b, 0) / data.rates.length,
  }));

  // Mood-habit correlation: for each habit, compare avg mood on days done vs not done
  let moodHabitCorrelation: string | null = null;
  let bestCorrelation = 0;
  let bestCorrelationHabit: Habit | null = null;
  for (const habit of habits) {
    const doneDayMoods: number[] = [];
    const notDoneDayMoods: number[] = [];
    for (const key of longHistory) {
      const mood = moods[key];
      if (!mood) continue;
      if ((completions[key] ?? []).includes(habit.id)) {
        doneDayMoods.push(mood);
      } else {
        notDoneDayMoods.push(mood);
      }
    }
    if (doneDayMoods.length >= 3 && notDoneDayMoods.length >= 3) {
      const avgDone = doneDayMoods.reduce((a, b) => a + b, 0) / doneDayMoods.length;
      const avgNotDone = notDoneDayMoods.reduce((a, b) => a + b, 0) / notDoneDayMoods.length;
      const diff = avgDone - avgNotDone;
      if (diff > bestCorrelation) {
        bestCorrelation = diff;
        bestCorrelationHabit = habit;
      }
    }
  }
  if (bestCorrelationHabit && bestCorrelation >= 0.4) {
    moodHabitCorrelation = `${bestCorrelationHabit.emoji} ${bestCorrelationHabit.name}を達成した日の気分は平均${bestCorrelation.toFixed(1)}高い`;
  }

  // Low mood day warning
  let lowMoodDayWarning: string | null = null;
  const moodByDay = dayPatterns.filter((d) => d.avgMood > 0);
  if (moodByDay.length >= 4) {
    const overallAvg = moodByDay.reduce((s, d) => s + d.avgMood, 0) / moodByDay.length;
    const lowDay = moodByDay
      .filter((d) => d.avgMood < overallAvg - 0.5)
      .sort((a, b) => a.avgMood - b.avgMood)[0];
    if (lowDay) {
      lowMoodDayWarning = `${lowDay.dayLabel}曜日は気分が落ち込みやすい傾向があります`;
    }
  }

  // Top insight (most actionable)
  let topInsight: string | null = null;
  if (moodHabitCorrelation) {
    topInsight = moodHabitCorrelation;
  } else if (worstHabit && worstHabit.weekRate < 0.3 && total >= 2) {
    topInsight = `${worstHabit.habitEmoji} ${worstHabit.habitName}の達成率が低めです。もう少し簡単な目標に変えてみませんか？`;
  } else if (bestHabit && bestHabit.streak >= 5) {
    topInsight = `${bestHabit.habitEmoji} ${bestHabit.habitName}が${bestHabit.streak}日連続。この調子です`;
  }

  return {
    weeklyDone,
    totalPossible,
    weeklyRate,
    avgMood,
    bestHabit,
    worstHabit,
    dayPatterns,
    moodHabitCorrelation,
    lowMoodDayWarning,
    topInsight,
  };
}
