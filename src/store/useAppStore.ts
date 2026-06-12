import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { todayKey } from '@/lib/dates';
import type { ChatMessage, Habit, MoodValue, UserProfile } from '@/types';

export const FREE_HABIT_LIMIT = 3;
export const FREE_DAILY_COACH_MESSAGES = 5;

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

  completeOnboarding: (name: string, goal: string) => void;
  addHabit: (name: string, emoji: string) => void;
  removeHabit: (id: string) => void;
  toggleCompletion: (habitId: string, key?: string) => void;
  setMood: (mood: MoodValue, key?: string) => void;
  appendChat: (message: ChatMessage) => void;
  /** Returns false when the free-tier daily message quota is exhausted. */
  consumeCoachMessage: () => boolean;
  coachMessagesLeftToday: () => number;
  setPremium: (value: boolean) => void;
  markMilestoneSeen: (key: string) => void;
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

      toggleCompletion: (habitId, key = todayKey()) =>
        set((s) => {
          const done = s.completions[key] ?? [];
          const next = done.includes(habitId)
            ? done.filter((id) => id !== habitId)
            : [...done, habitId];
          return { completions: { ...s.completions, [key]: next } };
        }),

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

      resetAll: () => set({ ...initialData }),
    }),
    {
      name: 'kokoro-coach-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
