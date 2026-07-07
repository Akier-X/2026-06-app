import {
  ShipporiMinchoB1_400Regular,
  ShipporiMinchoB1_600SemiBold,
  ShipporiMinchoB1_700Bold,
  ShipporiMinchoB1_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/shippori-mincho-b1';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

// フォント読み込みが終わるまでスプラッシュを保持する
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const [fontsLoaded, fontError] = useFonts({
    ShipporiMinchoB1_400Regular,
    ShipporiMinchoB1_600SemiBold,
    ShipporiMinchoB1_700Bold,
    ShipporiMinchoB1_800ExtraBold,
  });
  // フォント読み込みが失敗・ハングしてもアプリを白画面にしない。
  // 3秒で諦めてシステムフォントで描画する(未ロードのfontFamilyは各OSでフォールバックされる)。
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 3000);
    return () => clearTimeout(t);
  }, []);
  const fontsReady = fontsLoaded || !!fontError || fontTimeout;
  const setPremium = useAppStore((s) => s.setPremium);
  const checkTrialExpiry = useAppStore((s) => s.checkTrialExpiry);
  const completeHabit = useAppStore((s) => s.completeHabit);
  const habits = useAppStore((s) => s.habits);
  const completions = useAppStore((s) => s.completions);
  const moods = useAppStore((s) => s.moods);
  const profile = useAppStore((s) => s.profile);

  useEffect(() => {
    checkTrialExpiry();
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
  }, [setPremium, checkTrialExpiry]);

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

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="paywall"
          options={{ presentation: 'modal', headerShown: false }}
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
