import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import MilestoneModal, { MILESTONE_DAYS, type MilestoneData } from '@/components/MilestoneModal';
import { Card, SectionTitle } from '@/components/ui';
import { Radius, Spacing, useThemeColors } from '@/constants/theme';
import { calcStreak, todayKey } from '@/lib/dates';
import { FREE_HABIT_LIMIT, useAppStore } from '@/store/useAppStore';
import type { MoodValue } from '@/types';

const MOODS: { value: MoodValue; emoji: string }[] = [
  { value: 1, emoji: '😞' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '😄' },
];

export default function TodayScreen() {
  const c = useThemeColors();
  const profile = useAppStore((s) => s.profile);
  const habits = useAppStore((s) => s.habits);
  const completions = useAppStore((s) => s.completions);
  const moods = useAppStore((s) => s.moods);
  const isPremium = useAppStore((s) => s.isPremium);
  const seenMilestones = useAppStore((s) => s.seenMilestones);
  const toggleCompletion = useAppStore((s) => s.toggleCompletion);
  const markMilestoneSeen = useAppStore((s) => s.markMilestoneSeen);
  const setMood = useAppStore((s) => s.setMood);

  const [activeMilestone, setActiveMilestone] = useState<MilestoneData | null>(null);

  const today = todayKey();
  const doneToday = completions[today] ?? [];
  const todayMood = moods[today];

  const checkMilestone = useCallback(
    (habitId: string) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      const streak = calcStreak((key) => (completions[key] ?? []).includes(habitId));
      for (const days of MILESTONE_DAYS) {
        const milestoneKey = `${habitId}-${days}`;
        if (streak === days && !seenMilestones.includes(milestoneKey)) {
          setActiveMilestone({ key: milestoneKey, days, habitName: habit.name, habitEmoji: habit.emoji });
          return;
        }
      }
    },
    [habits, completions, seenMilestones],
  );

  const onToggle = (habitId: string) => {
    toggleCompletion(habitId);
    // Check milestone after toggle (streak recalculates with new state)
    setTimeout(() => checkMilestone(habitId), 50);
  };

  const onAddHabit = () => {
    if (!isPremium && habits.length >= FREE_HABIT_LIMIT) {
      router.push('/paywall');
    } else {
      router.push('/add-habit');
    }
  };

  return (
    <>
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}>
      <Text style={[styles.greeting, { color: c.text }]}>
        こんにちは、{profile.name || 'あなた'}さん 🌱
      </Text>
      {!!profile.goal && (
        <Text style={[styles.goal, { color: c.textSecondary }]}>目標: {profile.goal}</Text>
      )}

      <SectionTitle>今日の気分</SectionTitle>
      <Card>
        <View style={styles.moodRow}>
          {MOODS.map((m) => {
            const selected = todayMood === m.value;
            return (
              <Pressable
                key={m.value}
                onPress={() => setMood(m.value)}
                style={[
                  styles.moodButton,
                  {
                    backgroundColor: selected ? c.primarySoft : 'transparent',
                    borderColor: selected ? c.primary : 'transparent',
                  },
                ]}>
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionTitle>今日の習慣</SectionTitle>
      {habits.length === 0 && (
        <Card>
          <Text style={{ color: c.textSecondary }}>
            まだ習慣がありません。「+」から最初の習慣を追加しましょう。
          </Text>
        </Card>
      )}
      {habits.map((h) => {
        const done = doneToday.includes(h.id);
        const streak = calcStreak((key) => (completions[key] ?? []).includes(h.id));
        return (
          <Pressable key={h.id} onPress={() => onToggle(h.id)}>
            <Card style={styles.habitCard}>
              <Text style={styles.habitEmoji}>{h.emoji}</Text>
              <View style={styles.habitBody}>
                <Text
                  style={[
                    styles.habitName,
                    {
                      color: c.text,
                      textDecorationLine: done ? 'line-through' : 'none',
                      opacity: done ? 0.6 : 1,
                    },
                  ]}>
                  {h.name}
                </Text>
                {streak > 0 && (
                  <Text style={[styles.streak, { color: c.accent }]}>🔥 {streak}日連続</Text>
                )}
              </View>
              <Ionicons
                name={done ? 'checkmark-circle' : 'ellipse-outline'}
                size={28}
                color={done ? c.success : c.border}
              />
            </Card>
          </Pressable>
        );
      })}

      <Pressable
        onPress={onAddHabit}
        style={[styles.addButton, { borderColor: c.primary }]}>
        <Ionicons name="add" size={20} color={c.primary} />
        <Text style={{ color: c.primary, fontWeight: '700' }}>
          習慣を追加
          {!isPremium ? ` (${habits.length}/${FREE_HABIT_LIMIT})` : ''}
        </Text>
      </Pressable>
    </ScrollView>

    <MilestoneModal
      milestone={activeMilestone}
      onClose={() => {
        if (activeMilestone) markMilestoneSeen(activeMilestone.key);
        setActiveMilestone(null);
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  greeting: { fontSize: 22, fontWeight: '800', marginTop: Spacing.sm },
  goal: { fontSize: 13, marginTop: Spacing.xs },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodButton: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  moodEmoji: { fontSize: 26 },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  habitEmoji: { fontSize: 26 },
  habitBody: { flex: 1 },
  habitName: { fontSize: 16, fontWeight: '600' },
  streak: { fontSize: 12, marginTop: 2, fontWeight: '700' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 14,
    marginTop: Spacing.sm,
  },
});
