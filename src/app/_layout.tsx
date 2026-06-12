import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import {
  initNotifications,
  NOTIF_ACTION_COMPLETE,
  cancelWeeklyNotification,
  requestNotificationPermissions,
  rescheduleAllHabitReminders,
  scheduleMoodReminder,
  scheduleWeeklyReportNotification,
} from '@/lib/notifications';
import { initAds } from '@/lib/ads';
import { generateWeeklyReport } from '@/lib/weeklyReport';
import { checkPremium, initPurchases } from '@/lib/purchases';
import { useAppStore } from '@/store/useAppStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const setPremium = useAppStore((s) => s.setPremium);
  const completeHabit = useAppStore((s) => s.completeHabit);
  const habits = useAppStore((s) => s.habits);
  const completions = useAppStore((s) => s.completions);
  const moods = useAppStore((s) => s.moods);
  const profile = useAppStore((s) => s.profile);

  useEffect(() => {
    (async () => {
      try {
        await initPurchases();
        const premium = await checkPremium();
        if (premium !== null) setPremium(premium);
      } catch {
        // Purchases are unavailable (Expo Go / web) — keep local state.
      }
      await initAds();
    })();
  }, [setPremium]);

  useEffect(() => {
    (async () => {
      try {
        const granted = await requestNotificationPermissions();
        if (!granted) return;
        await initNotifications();
        await rescheduleAllHabitReminders(habits);
        if (profile.moodReminderTime) {
          await scheduleMoodReminder(profile.moodReminderTime);
        }
        if (profile.weeklyNotificationEnabled) {
          const report = generateWeeklyReport(habits, completions, moods);
          await scheduleWeeklyReportNotification({
            rate: report.weeklyRate,
            bestHabitName: report.bestHabit?.habitName,
            time: profile.weeklyNotificationTime ?? '09:00',
          });
        } else {
          await cancelWeeklyNotification();
        }
        // Handle the notification that launched the app from killed state
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          handleNotificationResponse(lastResponse, completeHabit);
        }
      } catch {
        // Notifications not available in current environment
      }
    })();
    // Run only once on mount; habits/profile changes are handled via habit-settings UI
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response, completeHabit);
    });
    return () => sub.remove();
  }, [completeHabit]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="paywall"
          options={{ presentation: 'modal', title: 'プレミアム' }}
        />
        <Stack.Screen
          name="add-habit"
          options={{ presentation: 'modal', title: '習慣を追加' }}
        />
        <Stack.Screen
          name="habit-settings"
          options={{ presentation: 'modal', title: '習慣の設定' }}
        />
        <Stack.Screen
          name="feedback"
          options={{ presentation: 'modal', title: 'ご意見・お問い合わせ' }}
        />
        <Stack.Screen
          name="legal"
          options={{ presentation: 'modal', title: '法的情報' }}
        />
        <Stack.Screen
          name="annual-report"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="archived-habits"
          options={{ title: 'アーカイブ済み習慣' }}
        />
      </Stack>
    </ThemeProvider>
  );
}

function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  completeHabit: (habitId: string) => void,
) {
  const data = response.notification.request.content.data as Record<string, unknown>;
  const { actionIdentifier } = response;

  if (actionIdentifier === NOTIF_ACTION_COMPLETE && data.habitId) {
    completeHabit(data.habitId as string);
  } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    if (data.type === 'mood') {
      router.push('/(tabs)/');
    } else if (data.type === 'weekly-report') {
      router.push('/(tabs)/stats');
    }
  }
}
