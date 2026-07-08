import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as StoreReview from 'expo-store-review';

import Bloom from '@/components/art/Bloom';
import InkIcon, { MOOD_ICONS } from '@/components/art/InkIcon';
import { mixHex } from '@/components/art/seed';
import BloomShareModal, { type BloomShareData } from '@/components/BloomShareModal';
import MilestoneModal, { MILESTONE_DAYS, type MilestoneData } from '@/components/MilestoneModal';
import ProgressRing from '@/components/ProgressRing';
import { PressableScale, SectionTitle } from '@/components/ui';
import { Fonts, Radius, Shadows, Spacing, useThemeColors } from '@/constants/theme';
import { calcStreak, todayKey } from '@/lib/dates';
import { hapticSelect, hapticSuccess } from '@/lib/haptics';
import { FREE_HABIT_LIMIT, useAppStore } from '@/store/useAppStore';
import type { Habit, MoodValue } from '@/types';

// 気分は「心の空模様」— 雨からはじまり、快晴でおわる
const MOODS: { value: MoodValue; label: string }[] = [
  { value: 1, label: 'つらい' },
  { value: 2, label: 'いまいち' },
  { value: 3, label: 'ふつう' },
  { value: 4, label: 'いい感じ' },
  { value: 5, label: '最高' },
];

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'おはようございます';
  if (h >= 11 && h < 17) return 'こんにちは';
  return 'こんばんは';
}

function todayLabel(): string {
  const d = new Date();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

function heroMessage(done: number, total: number): string {
  if (total === 0) return '最初の習慣を植えると、今日の一輪が咲きはじめます';
  if (done === 0) return 'まだつぼみ。ひとつ済ませると花びらがひらきます';
  if (done < total) return `花びらが${done}枚ひらきました。あと${total - done}個で満開`;
  return '今日の一輪、満開です。おつかれさまでした';
}

/** 完了チェックがぽんっと弾むアニメーション付きの習慣カード */
function HabitRow({
  habit,
  done,
  streak,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  streak: number;
  onToggle: () => void;
}) {
  const c = useThemeColors();
  const pop = useRef(new Animated.Value(1)).current;
  const prevDone = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current) {
      pop.setValue(0.3);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 14 }).start();
    }
    prevDone.current = done;
  }, [done, pop]);

  return (
    <PressableScale
      haptic={false}
      onPress={onToggle}
      onLongPress={() => router.push(`/habit-settings?habitId=${habit.id}`)}
      style={[
        styles.habitCard,
        { backgroundColor: done ? c.primarySoft : c.card },
        Shadows.card,
      ]}>
      <View style={[styles.habitEmojiWrap, { backgroundColor: done ? c.card : c.primarySoft }]}>
        <Text style={styles.habitEmoji}>{habit.emoji}</Text>
      </View>
      <View style={styles.habitBody}>
        <Text
          style={[
            styles.habitName,
            { color: c.text, opacity: done ? 0.55 : 1 },
            done && { textDecorationLine: 'line-through' },
          ]}>
          {habit.name}
        </Text>
        <View style={styles.habitMeta}>
          {streak > 0 && (
            <View style={styles.metaItem}>
              <InkIcon name="ember" size={13} color={c.accent} strokeWidth={1.9} />
              <Text style={[styles.streak, { color: c.accent }]}>{streak}日連続</Text>
            </View>
          )}
          {habit.reminderTime && (
            <View style={styles.metaItem}>
              <InkIcon name="bell" size={12} color={c.textTertiary} strokeWidth={1.7} />
              <Text style={[styles.reminderBadge, { color: c.textTertiary }]}>
                {habit.reminderTime}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={30}
          color={done ? c.success : c.border}
        />
      </Animated.View>
    </PressableScale>
  );
}

export default function TodayScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const profile = useAppStore((s) => s.profile);
  const habits = useAppStore((s) => s.habits);
  const completions = useAppStore((s) => s.completions);
  const moods = useAppStore((s) => s.moods);
  const isPremium = useAppStore((s) => s.isPremium);
  const bloomTheme = useAppStore((s) => s.bloomTheme);
  const seenMilestones = useAppStore((s) => s.seenMilestones);
  const toggleCompletion = useAppStore((s) => s.toggleCompletion);
  const markMilestoneSeen = useAppStore((s) => s.markMilestoneSeen);
  const setMood = useAppStore((s) => s.setMood);

  const [activeMilestone, setActiveMilestone] = useState<MilestoneData | null>(null);
  const [shareData, setShareData] = useState<BloomShareData | null>(null);

  const today = todayKey();
  const doneToday = completions[today] ?? [];
  const todayMood = moods[today];
  const activeHabits = habits.filter((h) => !h.archived);
  const doneCount = activeHabits.filter((h) => doneToday.includes(h.id)).length;
  const progress = activeHabits.length === 0 ? 0 : doneCount / activeHabits.length;
  const dayStreak = calcStreak((key) => (completions[key]?.length ?? 0) > 0);

  // 花びらが増えた瞬間、ふわっと咲くアニメーション
  const bloomPop = useRef(new Animated.Value(1)).current;
  const prevDoneCount = useRef(doneCount);
  useEffect(() => {
    if (doneCount > prevDoneCount.current) {
      bloomPop.setValue(0.82);
      Animated.spring(bloomPop, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 12 }).start();
    }
    prevDoneCount.current = doneCount;
  }, [doneCount, bloomPop]);

  const bloomColor =
    todayMood && todayMood > 0
      ? c.moodScale[todayMood - 1]
      : mixHex(c.primary, c.bloomCore, 0.35);

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
    const willComplete = !doneToday.includes(habitId);
    if (willComplete) hapticSuccess();
    toggleCompletion(habitId);
    // Check milestone after toggle (streak recalculates with new state)
    setTimeout(() => checkMilestone(habitId), 50);
  };

  const onAddHabit = () => {
    if (!isPremium && activeHabits.length >= FREE_HABIT_LIMIT) {
      router.push('/paywall?source=habit-limit');
    } else {
      router.push('/add-habit');
    }
  };

  const openShare = () => {
    if (activeHabits.length === 0) return;
    setShareData({
      dateKey: today,
      done: doneCount,
      total: activeHabits.length,
      mood: todayMood,
      streak: dayStreak,
    });
  };

  return (
    <>
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}>

      {/* ヘッダー：日付・挨拶・継続日数 */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.date, { color: c.textSecondary }]}>{todayLabel()}</Text>
          <Text style={[styles.greeting, { color: c.text }]}>
            {greetingByHour()}、{profile.name || 'あなた'}さん
          </Text>
        </View>
        {dayStreak > 0 && (
          <View style={[styles.streakChip, { backgroundColor: c.accentSoft }]}>
            <InkIcon name="ember" size={15} color={c.accent} strokeWidth={1.9} />
            <Text style={[styles.streakChipText, { color: c.accent }]}>{dayStreak}日目</Text>
          </View>
        )}
      </View>

      {/* ヒーロー：今日の一輪 */}
      <PressableScale
        haptic={false}
        onPress={openShare}
        style={[styles.hero, { backgroundColor: c.card }, Shadows.raised]}>
        <Animated.View style={{ transform: [{ scale: bloomPop }] }}>
          <ProgressRing
            progress={progress}
            size={148}
            strokeWidth={4}
            color={c.accent}
            trackColor={c.cardPressed}>
            <Bloom
              size={116}
              seedKey={today}
              petals={doneCount}
              color={bloomColor}
              coreColor={c.bloomCore}
              progress={progress}
              theme={bloomTheme}
            />
          </ProgressRing>
        </Animated.View>
        <Text style={[styles.heroTitle, { color: c.text }]}>今日の一輪</Text>
        <Text style={[styles.heroCount, { color: c.text }]}>
          {doneCount}
          <Text style={[styles.heroTotal, { color: c.textTertiary }]}> / {activeHabits.length}</Text>
        </Text>
        <Text style={[styles.heroMessage, { color: c.textSecondary }]}>
          {heroMessage(doneCount, activeHabits.length)}
        </Text>
        {activeHabits.length > 0 && (
          <View style={styles.heroShareRow}>
            <InkIcon name="share" size={14} color={c.primary} strokeWidth={1.9} />
            <Text style={[styles.heroShareText, { color: c.primary }]}>一輪をシェア</Text>
          </View>
        )}
        {!!profile.goal && (
          <View style={styles.heroGoalRow}>
            <InkIcon name="flag" size={12} color={c.textTertiary} strokeWidth={1.7} />
            <Text style={[styles.heroGoal, { color: c.textTertiary }]} numberOfLines={1}>
              {profile.goal}
            </Text>
          </View>
        )}
      </PressableScale>

      {/* 今日の気分 = 心の空模様 */}
      <SectionTitle>きょうの空模様</SectionTitle>
      <View style={[styles.moodCard, { backgroundColor: c.card }, Shadows.card]}>
        <View style={styles.moodRow}>
          {MOODS.map((m, i) => {
            const selected = todayMood === m.value;
            const moodColor = c.moodScale[i];
            return (
              <PressableScale
                key={m.value}
                haptic={false}
                onPress={() => {
                  hapticSelect();
                  setMood(m.value);
                }}
                scaleTo={0.9}
                style={[
                  styles.moodButton,
                  selected && { backgroundColor: mixHex(moodColor, c.card, 0.84) },
                ]}>
                <InkIcon
                  name={MOOD_ICONS[i]}
                  size={27}
                  color={selected || !todayMood ? moodColor : c.textTertiary}
                  strokeWidth={selected ? 2 : 1.7}
                />
                <Text
                  style={[
                    styles.moodLabel,
                    { color: selected ? c.text : c.textTertiary },
                    selected && { fontWeight: '700' },
                  ]}>
                  {m.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      {/* 今日の習慣 */}
      <SectionTitle>今日の習慣</SectionTitle>
      {activeHabits.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: c.card }, Shadows.card]}>
          <InkIcon name="sprout" size={36} color={c.primary} strokeWidth={1.6} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>
            まだ習慣がありません。{'\n'}小さな習慣から始めましょう。
          </Text>
        </View>
      )}
      {activeHabits.map((h) => (
        <HabitRow
          key={h.id}
          habit={h}
          done={doneToday.includes(h.id)}
          streak={calcStreak((key) => (completions[key] ?? []).includes(h.id))}
          onToggle={() => onToggle(h.id)}
        />
      ))}

      <PressableScale
        onPress={onAddHabit}
        style={[styles.addButton, { borderColor: c.primary, backgroundColor: c.primarySoft }]}>
        <Ionicons name="add-circle" size={20} color={c.primary} />
        <Text style={{ color: c.primary, fontWeight: '700', fontSize: 15 }}>
          習慣を追加
          {!isPremium ? ` (${activeHabits.length}/${FREE_HABIT_LIMIT})` : ''}
        </Text>
      </PressableScale>
    </ScrollView>

    <BloomShareModal data={shareData} onClose={() => setShareData(null)} />

    <MilestoneModal
      milestone={activeMilestone}
      onClose={() => {
        if (activeMilestone) {
          markMilestoneSeen(activeMilestone.key);
          // 7日・30日達成時にレビューを依頼
          if (activeMilestone.days === 7 || activeMilestone.days === 30) {
            StoreReview.isAvailableAsync().then((available) => {
              if (available) StoreReview.requestReview();
            });
          }
        }
        setActiveMilestone(null);
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  date: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  greeting: { fontSize: 21, fontFamily: Fonts.display, marginTop: 4, letterSpacing: 0.3 },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  streakChipText: { fontSize: 14, fontWeight: '800' },

  hero: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: 4,
  },
  heroTitle: { fontSize: 17, fontFamily: Fonts.display, letterSpacing: 4, marginTop: Spacing.sm },
  heroCount: { fontSize: 24, fontFamily: Fonts.display, letterSpacing: 1 },
  heroTotal: { fontSize: 15, fontFamily: Fonts.displayMedium },
  heroMessage: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  heroShareRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  heroShareText: { fontSize: 12, fontWeight: '700' },
  heroGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, maxWidth: '90%' },
  heroGoal: { fontSize: 11, flexShrink: 1 },

  moodCard: { borderRadius: Radius.md, padding: Spacing.sm },
  moodRow: { flexDirection: 'row', gap: 4 },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.sm,
    paddingVertical: 10,
  },
  moodLabel: { fontSize: 9.5, fontWeight: '600' },

  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  habitEmojiWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitEmoji: { fontSize: 24 },
  habitBody: { flex: 1 },
  habitName: { fontSize: 16, fontWeight: '700' },
  habitMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 3 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streak: { fontSize: 12, fontWeight: '700' },
  reminderBadge: { fontSize: 11 },

  emptyCard: {
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 15,
    marginTop: Spacing.sm,
  },
});
