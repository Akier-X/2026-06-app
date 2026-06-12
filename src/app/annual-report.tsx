import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { calcStreak } from '@/lib/dates';
import { useAppStore } from '@/store/useAppStore';
import type { Habit } from '@/types';

const { width: SW } = Dimensions.get('window');
const SLIDE_COLORS = ['#3E8E75', '#4A8FD4', '#8B5CF6', '#E8A04C', '#C2406E', '#3E8E75'];
const MOOD_EMOJI = ['', '😞', '😕', '😐', '🙂', '😄'];

interface SlideData {
  color: string;
  emoji: string;
  label: string;
  numericValue?: number;
  textValue?: string;
  unit?: string;
  sub?: string;
}

function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target <= 0) { setCount(0); return; }
    const steps = Math.min(60, target);
    const increment = target / steps;
    const delay = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, delay);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <Text style={styles.slideValue}>{count.toLocaleString()}</Text>;
}

function Slide({ data, isActive }: { data: SlideData; isActive: boolean }) {
  return (
    <View style={[styles.slide, { width: SW, backgroundColor: data.color }]}>
      <Text style={styles.slideEmoji}>{data.emoji}</Text>
      <Text style={styles.slideLabel}>{data.label}</Text>
      {data.numericValue !== undefined && isActive ? (
        <CountUp target={data.numericValue} />
      ) : data.numericValue !== undefined ? (
        <Text style={styles.slideValue}>{data.numericValue.toLocaleString()}</Text>
      ) : (
        <Text style={styles.slideValue}>{data.textValue}</Text>
      )}
      {data.unit != null && <Text style={styles.slideUnit}>{data.unit}</Text>}
      {data.sub != null && <Text style={styles.slideSub}>{data.sub}</Text>}
    </View>
  );
}

export default function AnnualReportScreen() {
  const habits = useAppStore((s) => s.habits);
  const completions = useAppStore((s) => s.completions);
  const moods = useAppStore((s) => s.moods);

  const year = new Date().getFullYear();
  const yearPrefix = `${year}-`;
  const yearKeys = Object.keys(completions).filter((k) => k.startsWith(yearPrefix));

  const totalCompletions = yearKeys.reduce(
    (sum, key) =>
      sum + (completions[key] ?? []).filter((id) => habits.some((h) => h.id === id)).length,
    0,
  );

  let bestHabit: Habit | null = null;
  let bestHabitCount = 0;
  for (const habit of habits) {
    const cnt = yearKeys.filter((k) => (completions[k] ?? []).includes(habit.id)).length;
    if (cnt > bestHabitCount) { bestHabitCount = cnt; bestHabit = habit; }
  }

  const maxStreak = habits.reduce((max, h) => {
    const s = calcStreak((key) => (completions[key] ?? []).includes(h.id));
    return Math.max(max, s);
  }, 0);

  const yearMoods = yearKeys.map((k) => moods[k]).filter(Boolean) as number[];
  const avgMood =
    yearMoods.length === 0 ? 0 : yearMoods.reduce((a, b) => a + b, 0) / yearMoods.length;

  const slides: SlideData[] = [
    {
      color: SLIDE_COLORS[0],
      emoji: '🌿',
      label: `${year}年、お疲れ様でした！`,
      textValue: 'あなたの記録',
      sub: 'スワイプして振り返りましょう →',
    },
    {
      color: SLIDE_COLORS[1],
      emoji: '✅',
      label: '今年の総達成回数',
      numericValue: totalCompletions,
      unit: '回',
      sub: '積み重ねが大きな変化になります',
    },
    {
      color: SLIDE_COLORS[2],
      emoji: '🔥',
      label: '現在の最高連続記録',
      numericValue: maxStreak,
      unit: '日連続',
      sub: '毎日の積み重ねが最強の習慣',
    },
    {
      color: SLIDE_COLORS[3],
      emoji: bestHabit?.emoji ?? '⭐️',
      label: 'ベスト習慣',
      textValue: bestHabit ? bestHabit.name : 'まだデータなし',
      sub: bestHabit ? `今年 ${bestHabitCount}回達成！` : '習慣を記録しよう',
    },
    {
      color: SLIDE_COLORS[4],
      emoji: avgMood > 0 ? MOOD_EMOJI[Math.round(avgMood)] : '😐',
      label: '年間平均気分',
      textValue: avgMood > 0 ? `${avgMood.toFixed(1)} / 5` : '記録なし',
      sub: '気分を記録するとパターンが見えてきます',
    },
    {
      color: SLIDE_COLORS[5],
      emoji: '🎉',
      label: '来年も一緒に！',
      textValue: '継続は力なり',
      sub: '毎日の小さな行動が人生を変えます',
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  return (
    <View style={styles.container}>
      <Pressable style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
          setActiveIndex(idx);
        }}
        renderItem={({ item, index }) => (
          <Slide data={item} isActive={index === activeIndex} />
        )}
        keyExtractor={(_, i) => String(i)}
      />

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.35)' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  slideEmoji: { fontSize: 72, marginBottom: 4 },
  slideLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  slideValue: { color: '#fff', fontSize: 44, fontWeight: '900', textAlign: 'center' },
  slideUnit: { color: 'rgba(255,255,255,0.9)', fontSize: 20, fontWeight: '600' },
  slideSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  dots: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
