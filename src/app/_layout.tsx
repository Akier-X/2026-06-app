import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { checkPremium, initPurchases } from '@/lib/purchases';
import { useAppStore } from '@/store/useAppStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const setPremium = useAppStore((s) => s.setPremium);

  useEffect(() => {
    (async () => {
      try {
        await initPurchases();
        const premium = await checkPremium();
        if (premium !== null) setPremium(premium);
      } catch {
        // Purchases are unavailable (Expo Go / web) — keep local state.
      }
    })();
  }, [setPremium]);

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
      </Stack>
    </ThemeProvider>
  );
}
