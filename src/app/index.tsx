import { Platform } from 'react-native';
import { Redirect } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';

// On web, Zustand hydrates async, causing a redirect flash. Read localStorage
// synchronously to determine the correct initial route without waiting.
function getWebOnboardingDone(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage?.getItem('kokoro-coach-store');
    if (!raw) return false;
    return JSON.parse(raw)?.state?.profile?.onboardingDone === true;
  } catch {
    return false;
  }
}

const webOnboardingDone = getWebOnboardingDone();

export default function Index() {
  const onboardingDone = useAppStore((s) => s.profile.onboardingDone);
  return <Redirect href={onboardingDone || webOnboardingDone ? '/(tabs)' : '/onboarding'} />;
}
