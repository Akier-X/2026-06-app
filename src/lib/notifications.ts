import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Habit } from '@/types';

const HABIT_NOTIF_PREFIX = 'habit-';
const MOOD_NOTIF_ID = 'mood-daily';
const WEEKLY_NOTIF_ID = 'weekly-report';

export const NOTIF_ACTION_COMPLETE = 'HABIT_COMPLETE';
export const NOTIF_ACTION_SKIP = 'HABIT_SKIP';
const HABIT_CATEGORY = 'HABIT_REMINDER';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: next } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return next === 'granted';
}

export async function initNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('habit-reminders', {
      name: '習慣リマインダー',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3E8E75',
    });
    await Notifications.setNotificationChannelAsync('mood-reminders', {
      name: '気分チェック',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.setNotificationCategoryAsync(HABIT_CATEGORY, [
    {
      identifier: NOTIF_ACTION_COMPLETE,
      buttonTitle: '✅ 達成',
      options: { opensAppToForeground: true },
    },
    {
      identifier: NOTIF_ACTION_SKIP,
      buttonTitle: 'あとで',
      options: { opensAppToForeground: false },
    },
  ]);
}

function habitNotifId(habitId: string): string {
  return `${HABIT_NOTIF_PREFIX}${habitId}`;
}

export async function scheduleHabitReminder(habit: Habit): Promise<void> {
  if (!habit.reminderTime) return;
  const [h, m] = habit.reminderTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return;

  await Notifications.cancelScheduledNotificationAsync(habitNotifId(habit.id)).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: habitNotifId(habit.id),
    content: {
      title: `${habit.emoji} ${habit.name}`,
      body: '習慣の時間です。今日も続けましょう！',
      categoryIdentifier: HABIT_CATEGORY,
      data: { habitId: habit.id, type: 'habit' },
      ...(Platform.OS === 'android' ? { android: { channelId: 'habit-reminders' } } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: h,
      minute: m,
    },
  });
}

export async function cancelHabitReminder(habitId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(habitNotifId(habitId)).catch(() => {});
}

export async function rescheduleAllHabitReminders(habits: Habit[]): Promise<void> {
  for (const habit of habits) {
    if (habit.reminderTime) {
      await scheduleHabitReminder(habit).catch(() => {});
    } else {
      await cancelHabitReminder(habit.id);
    }
  }
}

export async function scheduleMoodReminder(time: string): Promise<void> {
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return;

  await Notifications.cancelScheduledNotificationAsync(MOOD_NOTIF_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: MOOD_NOTIF_ID,
    content: {
      title: '今日の気分は？',
      body: '毎日の記録がパターン発見につながります 📊',
      data: { type: 'mood' },
      ...(Platform.OS === 'android' ? { android: { channelId: 'mood-reminders' } } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: h,
      minute: m,
    },
  });
}

export async function cancelMoodReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MOOD_NOTIF_ID).catch(() => {});
}

export async function scheduleWeeklyReportNotification(opts: {
  rate: number;
  bestHabitName?: string;
  time: string;
}): Promise<void> {
  const [h, m] = opts.time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return;

  await Notifications.cancelScheduledNotificationAsync(WEEKLY_NOTIF_ID).catch(() => {});

  const rateText = opts.rate > 0 ? `今週の達成率 ${Math.round(opts.rate * 100)}%` : '振り返りを見てみましょう';
  const body = opts.bestHabitName ? `${rateText} · ${opts.bestHabitName}が好調です` : rateText;

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_NOTIF_ID,
    content: {
      title: '今週の習慣レポートが届きました',
      body,
      data: { type: 'weekly-report' },
      ...(Platform.OS === 'android' ? { android: { channelId: 'mood-reminders' } } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // 1 = Sunday
      hour: h,
      minute: m,
    },
  });
}

export async function cancelWeeklyNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_NOTIF_ID).catch(() => {});
}
