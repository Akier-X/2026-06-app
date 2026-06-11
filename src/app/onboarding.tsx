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

import { PrimaryButton } from '@/components/ui';
import { Radius, Spacing, useThemeColors } from '@/constants/theme';
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          {step === 0 && (
            <View>
              <Text style={[styles.hero, { color: c.primary }]}>🌱</Text>
              <Text style={[styles.title, { color: c.text }]}>ココロコーチへようこそ</Text>
              <Text style={[styles.body, { color: c.textSecondary }]}>
                AIコーチと一緒に、小さな習慣を積み重ねて{'\n'}心と暮らしを整えるアプリです。
              </Text>
              <Text style={[styles.label, { color: c.textSecondary }]}>
                ニックネームを教えてください
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="例: ゆうき"
                placeholderTextColor={c.textSecondary}
                style={[
                  styles.input,
                  { backgroundColor: c.card, color: c.text, borderColor: c.border },
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
              {GOALS.map((g) => {
                const selected = goalId === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGoalId(g.id)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: selected ? c.primarySoft : c.card,
                        borderColor: selected ? c.primary : c.border,
                      },
                    ]}>
                    <Text style={styles.optionEmoji}>{g.emoji}</Text>
                    <Text style={[styles.optionLabel, { color: c.text }]}>{g.label}</Text>
                  </Pressable>
                );
              })}
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
              {suggestions.map((h, i) => {
                const selected = selectedHabits.has(i);
                return (
                  <Pressable
                    key={h.name}
                    onPress={() => {
                      const next = new Set(selectedHabits);
                      if (selected) next.delete(i);
                      else next.add(i);
                      setSelectedHabits(next);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor: selected ? c.primarySoft : c.card,
                        borderColor: selected ? c.primary : c.border,
                      },
                    ]}>
                    <Text style={styles.optionEmoji}>{h.emoji}</Text>
                    <Text style={[styles.optionLabel, { color: c.text }]}>{h.name}</Text>
                    <Text style={{ color: selected ? c.primary : c.textSecondary }}>
                      {selected ? '✓' : ''}
                    </Text>
                  </Pressable>
                );
              })}
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
  content: { padding: Spacing.lg, paddingTop: Spacing.xl * 2 },
  hero: { fontSize: 56, marginBottom: Spacing.md },
  title: { fontSize: 26, fontWeight: '800', marginBottom: Spacing.sm },
  body: { fontSize: 15, lineHeight: 22, marginBottom: Spacing.lg },
  label: { fontSize: 13, fontWeight: '700', marginBottom: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
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
  optionEmoji: { fontSize: 24 },
  optionLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  button: { marginTop: Spacing.lg },
});
