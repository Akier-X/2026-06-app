import { lastNDateKeys, todayKey, weekdayLabel } from '@/lib/dates';
import type { Habit, MoodValue } from '@/types';
import type { DayPattern, HabitInsight } from './weeklyReport';

export interface WeekBreakdown {
  label: string;
  done: number;
  possible: number;
  rate: number;
}

export interface MonthlyReport {
  monthlyDone: number;
  totalPossible: number;
  monthlyRate: number;
  avgMood: number;
  bestHabit: HabitInsight | null;
  worstHabit: HabitInsight | null;
  topInsight: string | null;
  weekBreakdown: WeekBreakdown[];
  dayPatterns: DayPattern[];
  moodHabitCorrelation: string | null;
  lowMoodDayWarning: string | null;
}

function habitMonthRate(habit: Habit, completions: Record<string, string[]>, days: string[]): number {
  const done = days.filter((key) => (completions[key] ?? []).includes(habit.id)).length;
  return days.length === 0 ? 0 : done / days.length;
}

function habitStreak(habit: Habit, completions: Record<string, string[]>): number {
  let streak = 0;
  const today = todayKey();
  for (const key of [...lastNDateKeys(90)].reverse()) {
    if (key > today) continue;
    if ((completions[key] ?? []).includes(habit.id)) streak++;
    else break;
  }
  return streak;
}

export function generateMonthlyReport(
  habits: Habit[],
  completions: Record<string, string[]>,
  moods: Record<string, MoodValue>,
): MonthlyReport {
  const month = lastNDateKeys(30);
  const total = habits.length;

  const monthlyDone = month.reduce(
    (sum, key) =>
      sum + (completions[key] ?? []).filter((id) => habits.some((h) => h.id === id)).length,
    0,
  );
  const totalPossible = total * 30;
  const monthlyRate = totalPossible === 0 ? 0 : monthlyDone / totalPossible;

  const moodValues = month.map((k) => moods[k]).filter(Boolean) as MoodValue[];
  const avgMood =
    moodValues.length === 0 ? 0 : moodValues.reduce((a, b) => a + b, 0) / moodValues.length;

  const habitInsights: HabitInsight[] = habits.map((h) => ({
    habitName: h.name,
    habitEmoji: h.emoji,
    streak: habitStreak(h, completions),
    weekRate: habitMonthRate(h, completions, month),
  }));

  const sorted = [...habitInsights].sort((a, b) => b.weekRate - a.weekRate);
  const bestHabit = sorted[0] ?? null;
  const worstHabit = sorted.length > 1 ? sorted[sorted.length - 1] : null;

  const weekBreakdown: WeekBreakdown[] = [0, 1, 2, 3].map((w) => {
    const weekDays = month.slice(w * 7, (w + 1) * 7);
    const done = weekDays.reduce(
      (sum, key) =>
        sum + (completions[key] ?? []).filter((id) => habits.some((h) => h.id === id)).length,
      0,
    );
    const possible = total * weekDays.length;
    return { label: `第${w + 1}週`, done, possible, rate: possible === 0 ? 0 : done / possible };
  });

  const dayBuckets: Record<string, { moods: number[]; rates: number[] }> = {};
  for (const key of month) {
    const label = weekdayLabel(key);
    if (!dayBuckets[label]) dayBuckets[label] = { moods: [], rates: [] };
    const moodVal = moods[key];
    if (moodVal) dayBuckets[label].moods.push(moodVal);
    const done = (completions[key] ?? []).filter((id) => habits.some((h) => h.id === id)).length;
    dayBuckets[label].rates.push(total === 0 ? 0 : done / total);
  }
  const dayPatterns: DayPattern[] = Object.entries(dayBuckets).map(([label, data]) => ({
    dayLabel: label,
    avgMood:
      data.moods.length === 0 ? 0 : data.moods.reduce((a, b) => a + b, 0) / data.moods.length,
    completionRate:
      data.rates.length === 0 ? 0 : data.rates.reduce((a, b) => a + b, 0) / data.rates.length,
  }));

  let moodHabitCorrelation: string | null = null;
  let bestCorr = 0;
  let bestCorrHabit: Habit | null = null;
  for (const habit of habits) {
    const doneMoods: number[] = [];
    const notDoneMoods: number[] = [];
    for (const key of month) {
      const mood = moods[key];
      if (!mood) continue;
      if ((completions[key] ?? []).includes(habit.id)) doneMoods.push(mood);
      else notDoneMoods.push(mood);
    }
    if (doneMoods.length >= 3 && notDoneMoods.length >= 3) {
      const avgDone = doneMoods.reduce((a, b) => a + b, 0) / doneMoods.length;
      const avgNotDone = notDoneMoods.reduce((a, b) => a + b, 0) / notDoneMoods.length;
      const diff = avgDone - avgNotDone;
      if (diff > bestCorr) {
        bestCorr = diff;
        bestCorrHabit = habit;
      }
    }
  }
  if (bestCorrHabit && bestCorr >= 0.4) {
    moodHabitCorrelation = `${bestCorrHabit.emoji} ${bestCorrHabit.name}を達成した日の気分は平均${bestCorr.toFixed(1)}高い`;
  }

  let lowMoodDayWarning: string | null = null;
  const moodByDay = dayPatterns.filter((d) => d.avgMood > 0);
  if (moodByDay.length >= 4) {
    const overallAvg = moodByDay.reduce((s, d) => s + d.avgMood, 0) / moodByDay.length;
    const lowDay = moodByDay
      .filter((d) => d.avgMood < overallAvg - 0.5)
      .sort((a, b) => a.avgMood - b.avgMood)[0];
    if (lowDay) lowMoodDayWarning = `${lowDay.dayLabel}曜日は気分が落ち込みやすい傾向があります`;
  }

  let topInsight: string | null = null;
  if (moodHabitCorrelation) {
    topInsight = moodHabitCorrelation;
  } else if (worstHabit && worstHabit.weekRate < 0.3 && total >= 2) {
    topInsight = `${worstHabit.habitEmoji} ${worstHabit.habitName}の月間達成率が低め。目標を小さくしてみませんか？`;
  } else if (bestHabit && bestHabit.streak >= 7) {
    topInsight = `${bestHabit.habitEmoji} ${bestHabit.habitName}が${bestHabit.streak}日連続。すごいです`;
  } else if (monthlyRate >= 0.8) {
    topInsight = '今月の達成率は80%以上。継続できていて素晴らしいです！';
  }

  return {
    monthlyDone,
    totalPossible,
    monthlyRate,
    avgMood,
    bestHabit,
    worstHabit,
    topInsight,
    weekBreakdown,
    dayPatterns,
    moodHabitCorrelation,
    lowMoodDayWarning,
  };
}
