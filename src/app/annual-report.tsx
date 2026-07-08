import { router } from 'expo-router';
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { captureRef as captureViewRef } from 'react-native-view-shot';

import Bloom from '@/components/art/Bloom';
import InkIcon, { MOOD_ICONS } from '@/components/art/InkIcon';
import { Fonts } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { calcStreak } from '@/lib/dates';
import { shareImageFromRef } from '@/lib/shareUtils';
import { useAppStore } from '@/store/useAppStore';
import type { Habit } from '@/types';

const { width: SW } = Dimensions.get('window');
const SLIDE_COUNT = 6;
const BAR_MAX = SW - 20 - 64;

// 夜の庭をめぐるような、和の深色
const PALETTE = [
  { bg: '#1E3B2C', deco: 'rgba(255,255,255,0.08)' }, // 深緑
  { bg: '#22405C', deco: 'rgba(255,255,255,0.08)' }, // 藍
  { bg: '#5C2733', deco: 'rgba(255,255,255,0.08)' }, // 蘇芳
  { bg: '#6B4A1F', deco: 'rgba(255,255,255,0.08)' }, // 琥珀
  { bg: '#3A2E4F', deco: 'rgba(255,255,255,0.08)' }, // 茄子紺
  { bg: '#1E3B2C', deco: 'rgba(255,255,255,0.08)' },
];

interface SlideData {
  palIdx: number;
  eyebrow: string;
  /** 生成アートや線画。emojiより優先 */
  art?: ReactNode;
  emoji?: string;
  numericValue?: number;
  textValue?: string;
  unit?: string;
  sub: string;
  withShare?: boolean;
}

function CountUp({ target, active }: { target: number; active: boolean }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    if (target <= 0) { setVal(0); return; }
    const steps = Math.min(target, 60);
    const inc = target / steps;
    const delay = 1200 / steps;
    let cur = 0;
    const timer = setInterval(() => {
      cur += inc;
      if (cur >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(cur));
    }, delay);
    return () => clearInterval(timer);
  }, [target, active]);
  return <Text style={styles.mainValue}>{val.toLocaleString()}</Text>;
}

function Slide({
  data,
  isActive,
  onShare,
  slideRef,
}: {
  data: SlideData;
  isActive: boolean;
  onShare: () => void;
  slideRef?: RefObject<View | null>;
}) {
  const { bg, deco } = PALETTE[data.palIdx];
  const fade = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(32)).current;
  const emojiScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!isActive) return;
    fade.setValue(0);
    ty.setValue(32);
    emojiScale.setValue(0.5);
    Animated.sequence([
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(ty, { toValue: 0, friction: 7, tension: 55, useNativeDriver: true }),
        Animated.spring(emojiScale, { toValue: 1, friction: 5, tension: 45, useNativeDriver: true }),
      ]),
    ]).start();
  }, [isActive]);

  return (
    <View ref={slideRef} style={[styles.slide, { width: SW, backgroundColor: bg }]}>
      <View style={[styles.decoCircle, styles.decoTop, { backgroundColor: deco }]} />
      <View style={[styles.decoCircle, styles.decoBottom, { backgroundColor: deco }]} />
      <Animated.View
        style={[styles.slideInner, { opacity: fade, transform: [{ translateY: ty }] }]}>
        <Text style={styles.eyebrow}>{data.eyebrow.toUpperCase()}</Text>
        <Animated.View style={[styles.artWrap, { transform: [{ scale: emojiScale }] }]}>
          {data.art ?? <Text style={styles.slideEmoji}>{data.emoji}</Text>}
        </Animated.View>
        {data.numericValue !== undefined ? (
          <CountUp target={data.numericValue} active={isActive} />
        ) : (
          <Text style={styles.mainValue}>{data.textValue}</Text>
        )}
        {data.unit != null && <Text style={styles.unitText}>{data.unit}</Text>}
        <Text style={styles.subText}>{data.sub}</Text>
        {data.withShare && (
          <Pressable onPress={onShare} style={styles.shareBtn}>
            <InkIcon name="share" size={17} color="#fff" strokeWidth={2} />
            <Text style={styles.shareBtnText}>友達にシェアする</Text>
          </Pressable>
        )}
      </Animated.View>
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
      palIdx: 0,
      eyebrow: `${year}年 振り返り`,
      art: (
        <Bloom size={104} seedKey={`year-${year}`} petals={11} color="#E9DFC8" coreColor="#E3B54F" />
      ),
      textValue: 'あなたの一年の庭',
      sub: 'スワイプして振り返りましょう →',
    },
    {
      palIdx: 1,
      eyebrow: '今年の総達成回数',
      art: (
        <Bloom
          size={104}
          seedKey={`year-${year}-done`}
          petals={Math.min(13, Math.max(1, totalCompletions))}
          color="#BFD3E3"
          coreColor="#E3B54F"
        />
      ),
      numericValue: totalCompletions,
      unit: '回',
      sub: totalCompletions > 0
        ? '積み重ねた一歩一歩が、大きな変化になります'
        : '習慣の記録を始めよう',
    },
    {
      palIdx: 2,
      eyebrow: '最長ストリーク',
      art: <InkIcon name="ember" size={92} color="#F0D9CB" strokeWidth={1.4} />,
      numericValue: maxStreak,
      unit: '日連続',
      sub: maxStreak >= 7
        ? '素晴らしい！毎日の積み重ねが最強の習慣をつくります'
        : maxStreak > 0
          ? '毎日続けることが、最大の成果に繋がります'
          : 'まず3日続けることを目標にしよう',
    },
    {
      palIdx: 3,
      eyebrow: 'ベスト習慣',
      emoji: bestHabit?.emoji ?? undefined,
      art: bestHabit ? undefined : (
        <InkIcon name="sprout" size={92} color="#EBDDBF" strokeWidth={1.4} />
      ),
      textValue: bestHabit ? bestHabit.name : 'まだデータなし',
      sub: bestHabit
        ? `今年 ${bestHabitCount}回達成！ 素晴らしい継続力です`
        : '習慣を記録してみよう',
    },
    {
      palIdx: 4,
      eyebrow: '年間平均気分',
      art: (
        <InkIcon
          name={avgMood > 0 ? MOOD_ICONS[Math.round(avgMood) - 1] : 'cloud'}
          size={92}
          color="#D9D3E8"
          strokeWidth={1.4}
        />
      ),
      textValue: avgMood > 0 ? `${avgMood.toFixed(1)} / 5.0` : '記録なし',
      sub: avgMood >= 3.5
        ? '今年は心の空模様が晴れの多い一年でした'
        : avgMood > 0
          ? '気分と習慣のつながりをチェックしよう'
          : '毎日の気分を記録するとパターンが見えます',
    },
    {
      palIdx: 5,
      eyebrow: '来年も一緒に',
      art: (
        <Bloom size={104} seedKey={`year-${year}-next`} petals={13} color="#E9C9B8" coreColor="#E3B54F" />
      ),
      textValue: '継続は力なり',
      sub: '小さな行動の積み重ねが、あなたを変えます',
      withShare: true,
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const lastSlideRef = useRef<View>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: BAR_MAX * (activeIndex + 1) / SLIDE_COUNT,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [activeIndex]);

  const handleShare = async () => {
    track('share', { kind: 'annual' });
    const fallback =
      `ここロコーチで${year}年の習慣を振り返りました。\n` +
      `達成回数: ${totalCompletions}回\n` +
      `最長連続: ${maxStreak}日` +
      (bestHabit ? `\nベスト習慣: ${bestHabit.name}` : '') +
      (avgMood > 0 ? `\n平均気分: ${avgMood.toFixed(1)}/5.0` : '') +
      `\n\n#ここロコーチ #こころの庭 #習慣化`;
    await shareImageFromRef(
      () => captureViewRef(lastSlideRef, { format: 'png', quality: 1.0 }),
      fallback,
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressAnim }]} />
      </View>
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
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SW));
        }}
        renderItem={({ item, index }) => (
          <Slide
            data={item}
            isActive={index === activeIndex}
            onShare={handleShare}
            slideRef={index === SLIDE_COUNT - 1 ? lastSlideRef : undefined}
          />
        )}
        keyExtractor={(_, i) => String(i)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  progressTrack: {
    position: 'absolute',
    top: 52,
    left: 20,
    width: BAR_MAX,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    zIndex: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 2,
  },

  closeBtn: {
    position: 'absolute',
    top: 44,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  decoCircle: {
    position: 'absolute',
    width: SW * 0.85,
    height: SW * 0.85,
    borderRadius: SW * 0.425,
  },
  decoTop: { top: -SW * 0.28, right: -SW * 0.22 },
  decoBottom: { bottom: -SW * 0.22, left: -SW * 0.18 },

  slideInner: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textAlign: 'center',
    marginBottom: 4,
  },
  artWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 96 },
  slideEmoji: { fontSize: 80, lineHeight: 96 },
  mainValue: {
    color: '#fff',
    fontSize: 48,
    fontFamily: Fonts.display,
    textAlign: 'center',
    lineHeight: 62,
    marginTop: 2,
    letterSpacing: 1,
  },
  unitText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -6,
  },
  subText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
    alignSelf: 'stretch',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 50,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
