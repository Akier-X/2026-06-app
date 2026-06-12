import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { todayKey } from '@/lib/dates';
import type { ChatMessage, Habit, MoodValue, UserProfile } from '@/types';

export const FREE_HABIT_LIMIT = 3;
export const FREE_DAILY_COACH_MESSAGES = 5;

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const pick = () => chars[Math.floor(Math.random() * chars.length)];
  return `${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}`;
}

interface AppState {
  profile: UserProfile;
  habits: Habit[];
  /** dateKey -> completed habit ids */
  completions: Record<string, string[]>;
  /** dateKey -> mood (1-5) */
  moods: Record<string, MoodValue>;
  chat: ChatMessage[];
  coachUsage: { date: string; count: number };
  isPremium: boolean;
  seenMilestones: string[];
  /** 紹介コード（このユーザーが友達に渡すコード） */
  referralCode: string;
  /** 招待コードによる無料トライアル期限（ISO date string, null = トライアルなし） */
  freeTrialUntil: string | null;
  /** このデバイスで使用済みの招待コード一覧 */
  redeemedCodes: string[];

  completeOnboarding: (name: string, goal: string) => void;
  addHabit: (name: string, emoji: string) => void;
  removeHabit: (id: string) => void;
  archiveHabit: (id: string) => void;
  unarchiveHabit: (id: string) => void;
  toggleCompletion: (habitId: string, key?: string) => void;
  completeHabit: (habitId: string, key?: string) => void;
  updateHabitReminder: (habitId: string, time: string | null) => void;
  setMoodReminderTime: (time: string | null) => void;
  setWeeklyNotification: (enabled: boolean, time?: string) => void;
  setMood: (mood: MoodValue, key?: string) => void;
  appendChat: (message: ChatMessage) => void;
  /** Returns false when the free-tier daily message quota is exhausted. */
  consumeCoachMessage: () => boolean;
  coachMessagesLeftToday: () => number;
  setPremium: (value: boolean) => void;
  markMilestoneSeen: (key: string) => void;
  /** 招待コードを使用してトライアルを開始する */
  redeemReferralCode: (code: string) => 'ok' | 'already_redeemed' | 'invalid';
  /** アプリ起動時にトライアル有効期限を確認し、切れていれば解除する */
  checkTrialExpiry: () => void;
  resetAll: () => void;
}

const initialData = {
  profile: { name: '', goal: '', onboardingDone: false },
  habits: [] as Habit[],
  completions: {} as Record<string, string[]>,
  moods: {} as Record<string, MoodValue>,
  chat: [] as ChatMessage[],
  coachUsage: { date: '', count: 0 },
  isPremium: false,
  seenMilestones: [] as string[],
  referralCode: generateReferralCode(),
  freeTrialUntil: null as string | null,
  redeemedCodes: [] as string[],
};

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialData,

      completeOnboarding: (name, goal) =>
        set({ profile: { name, goal, onboardingDone: true } }),

      addHabit: (name, emoji) =>
        set((s) => ({
          habits: [
            ...s.habits,
            { id: newId(), name, emoji, createdAt: new Date().toISOString() },
          ],
        })),

      removeHabit: (id) =>
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      archiveHabit: (id) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, archived: true } : h)),
        })),

      unarchiveHabit: (id) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, archived: false } : h)),
        })),

      toggleCompletion: (habitId, key = todayKey()) =>
        set((s) => {
          const done = s.completions[key] ?? [];
          const next = done.includes(habitId)
            ? done.filter((id) => id !== habitId)
            : [...done, habitId];
          return { completions: { ...s.completions, [key]: next } };
        }),

      completeHabit: (habitId, key = todayKey()) =>
        set((s) => {
          const done = s.completions[key] ?? [];
          if (done.includes(habitId)) return s;
          return { completions: { ...s.completions, [key]: [...done, habitId] } };
        }),

      updateHabitReminder: (habitId, time) =>
        set((s) => ({
          habits: s.habits.map((h) =>
            h.id === habitId
              ? { ...h, reminderTime: time ?? undefined }
              : h,
          ),
        })),

      setMoodReminderTime: (time) =>
        set((s) => ({
          profile: { ...s.profile, moodReminderTime: time ?? undefined },
        })),

      setWeeklyNotification: (enabled, time) =>
        set((s) => ({
          profile: {
            ...s.profile,
            weeklyNotificationEnabled: enabled,
            ...(time !== undefined ? { weeklyNotificationTime: time } : {}),
          },
        })),

      setMood: (mood, key = todayKey()) =>
        set((s) => ({ moods: { ...s.moods, [key]: mood } })),

      appendChat: (message) => set((s) => ({ chat: [...s.chat, message] })),

      consumeCoachMessage: () => {
        const s = get();
        const today = todayKey();
        const count = s.coachUsage.date === today ? s.coachUsage.count : 0;
        if (!s.isPremium && count >= FREE_DAILY_COACH_MESSAGES) {
          return false;
        }
        set({ coachUsage: { date: today, count: count + 1 } });
        return true;
      },

      coachMessagesLeftToday: () => {
        const s = get();
        if (s.isPremium) return Number.POSITIVE_INFINITY;
        const count = s.coachUsage.date === todayKey() ? s.coachUsage.count : 0;
        return Math.max(0, FREE_DAILY_COACH_MESSAGES - count);
      },

      setPremium: (value) => set({ isPremium: value }),

      markMilestoneSeen: (key) =>
        set((s) => ({ seenMilestones: [...s.seenMilestones, key] })),

      redeemReferralCode: (code) => {
        const s = get();
        const normalized = code.trim().toUpperCase();
        if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(normalized)) return 'invalid';
        if (s.redeemedCodes.includes(normalized)) return 'already_redeemed';
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);
        set({
          isPremium: true,
          freeTrialUntil: trialEnd.toISOString(),
          redeemedCodes: [...s.redeemedCodes, normalized],
        });
        return 'ok';
      },

      checkTrialExpiry: () => {
        const s = get();
        if (!s.freeTrialUntil) return;
        if (new Date(s.freeTrialUntil) <= new Date()) {
          set({ isPremium: false, freeTrialUntil: null });
        }
      },

      resetAll: () => set({ ...initialData, referralCode: get().referralCode }),
    }),
    {
      name: 'kokoro-coach-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
