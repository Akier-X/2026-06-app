import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Bloom from '@/components/art/Bloom';
import { PressableScale, PrimaryButton } from '@/components/ui';
import { Fonts, Radius, Shadows, Spacing, useThemeColors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

const GOALS = [
  { id: 'health', emoji: '💪', label: '健康的な生活リズムをつくる' },
  { id: 'mind', emoji: '🧘', label: 'ストレスを減らして心を整える' },
  { id: 'focus', emoji: '🎯', label: '集中力・生産性を高める' },
  { id: 'sleep', emoji: '😴', label: '睡眠の質を改善する' },
] as const;

const SUGGESTED_HABITS: Record<string, { name: string; emoji: string }[]> = {
  health: [
    { name: '10分散歩する', emoji: '🚶' },
    { name: '水を1.5L飲む', emoji: '💧' },
    { name: '野菜を食べる', emoji: '🥗' },
  ],
  mind: [
    { name: '3分間の深呼吸', emoji: '🌬️' },
    { name: '感謝を1つ書き出す', emoji: '📝' },
    { name: '寝る前にスマホを置く', emoji: '📵' },
  ],
  focus: [
    { name: '朝一番に最重要タスク', emoji: '🚀' },
    { name: '25分集中タイム', emoji: '⏱️' },
    { name: '机の上を片付ける', emoji: '🧹' },
  ],
  sleep: [
    { name: '23時までに布団へ', emoji: '🛏️' },
    { name: '寝る1時間前はノースクリーン', emoji: '🌙' },
    { name: '朝日を浴びる', emoji: '☀️' },
  ],
};

const VALUE_PROPS = [
  { icon: 'checkmark-circle' as const, text: '1日10秒、タップするだけの習慣記録' },
  { icon: 'sparkles' as const, text: 'AIが気分と行動のパターンを分析' },
  { icon: 'chatbubble-ellipses' as const, text: '落ち込んだ日はAIコーチに相談' },
];

const TOTAL_STEPS = 3;

export default function Onboarding() {
  const c = useThemeColors();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goalId, setGoalId] = useState<string>('');
  const [selectedHabits, setSelectedHabits] = useState<Set<number>>(new Set([0, 1]));

  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const addHabit = useAppStore((s) => s.addHabit);

  const suggestions = SUGGESTED_HABITS[goalId] ?? [];

  const finish = () => {
    const goalLabel = GOALS.find((g) => g.id === goalId)?.label ?? '';
    completeOnboarding(name.trim() || 'あなた', goalLabel);
    suggestions.forEach((h, i) => {
      if (selectedHabits.has(i)) addHabit(h.name, h.emoji);
    });
    router.replace('/(tabs)');
  };

  const OptionCard = ({
    emoji,
    label,
    selected,
    onPress,
  }: {
    emoji: string;
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <PressableScale
      onPress={onPress}
      style={[
        styles.option,
        { backgroundColor: c.card, borderColor: selected ? c.primary : 'transparent' },
        Shadows.card,
      ]}>
      <View style={[styles.optionEmojiWrap, { backgroundColor: selected ? c.primarySoft : c.cardPressed }]}>
        <Text style={styles.optionEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.optionLabel, { color: c.text }]}>{label}</Text>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selected ? c.primary : c.border}
      />
    </PressableScale>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* 進捗バー + 戻る */}
        <View style={styles.topBar}>
          {step > 0 ? (
            <Pressable onPress={() => setStep(step - 1)} hitSlop={8} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={c.textSecondary} />
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
          <View style={styles.progressTrackWrap}>
            <View style={[styles.progressTrack, { backgroundColor: c.cardPressed }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: c.primary, width: `${((step + 1) / TOTAL_STEPS) * 100}%` },
                ]}
              />
            </View>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <View>
              <LinearGradient
                colors={c.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroCircle, Shadows.raised]}>
                <Bloom
                  size={64}
                  seedKey="kokoro-welcome"
                  petals={7}
                  color="#F2E7CF"
                  coreColor="#E3B54F"
                />
              </LinearGradient>
              <Text style={[styles.title, { color: c.text }]}>ココロコーチへ{'\n'}ようこそ</Text>
              <View style={styles.valueProps}>
                {VALUE_PROPS.map((v) => (
                  <View key={v.text} style={styles.valueRow}>
                    <Ionicons name={v.icon} size={18} color={c.primary} />
                    <Text style={[styles.valueText, { color: c.textSecondary }]}>{v.text}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.label, { color: c.textSecondary }]}>
                ニックネームを教えてください
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="例: ゆうき"
                placeholderTextColor={c.textTertiary}
                style={[
                  styles.input,
                  { backgroundColor: c.card, color: c.text },
                  Shadows.card,
                ]}
              />
              <PrimaryButton label="次へ" onPress={() => setStep(1)} style={styles.button} />
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={[styles.title, { color: c.text }]}>いちばんの目標は?</Text>
              <Text style={[styles.body, { color: c.textSecondary }]}>
                AIコーチがあなたに合わせたアドバイスをします。
              </Text>
              {GOALS.map((g) => (
                <OptionCard
                  key={g.id}
                  emoji={g.emoji}
                  label={g.label}
                  selected={goalId === g.id}
                  onPress={() => setGoalId(g.id)}
                />
              ))}
              <PrimaryButton
                label="次へ"
                onPress={() => setStep(2)}
                disabled={!goalId}
                style={styles.button}
              />
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={[styles.title, { color: c.text }]}>最初の習慣を選びましょう</Text>
              <Text style={[styles.body, { color: c.textSecondary }]}>
                あとから自由に追加・変更できます。
              </Text>
              {suggestions.map((h, i) => (
                <OptionCard
                  key={h.name}
                  emoji={h.emoji}
                  label={h.name}
                  selected={selectedHabits.has(i)}
                  onPress={() => {
                    const next = new Set(selectedHabits);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    setSelectedHabits(next);
                  }}
                />
              ))}
              <PrimaryButton label="はじめる" onPress={finish} style={styles.button} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  progressTrackWrap: { flex: 1, paddingHorizontal: Spacing.sm },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  heroCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: { fontSize: 26, fontFamily: Fonts.display, marginBottom: Spacing.sm, lineHeight: 38, letterSpacing: 0.5 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: Spacing.lg },

  valueProps: { gap: Spacing.sm, marginBottom: Spacing.xl, marginTop: Spacing.sm },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  valueText: { fontSize: 14, lineHeight: 20, flex: 1 },

  label: { fontSize: 13, fontWeight: '700', marginBottom: Spacing.sm },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  optionEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: { fontSize: 22 },
  optionLabel: { fontSize: 15, fontWeight: '700', flex: 1 },

  button: { marginTop: Spacing.lg },
});
