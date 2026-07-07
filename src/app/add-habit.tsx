import { router } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PressableScale, PrimaryButton, SectionTitle } from '@/components/ui';
import { Radius, Shadows, Spacing, useThemeColors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

const EMOJIS = ['🌱', '🚶', '💧', '📖', '🧘', '🏃', '📝', '😴', '🥗', '🧹', '☀️', '🎯'];

const TEMPLATES: { name: string; emoji: string }[] = [
  { name: '10分散歩する', emoji: '🚶' },
  { name: '水を1.5L飲む', emoji: '💧' },
  { name: '3分間の深呼吸', emoji: '🧘' },
  { name: '5ページ読書する', emoji: '📖' },
  { name: '23時までに布団へ', emoji: '😴' },
  { name: '朝日を浴びる', emoji: '☀️' },
];

export default function AddHabitScreen() {
  const c = useThemeColors();
  const addHabit = useAppStore((s) => s.addHabit);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  const onSave = () => {
    addHabit(name.trim(), emoji);
    router.back();
  };

  const applyTemplate = (t: { name: string; emoji: string }) => {
    setName(t.name);
    setEmoji(t.emoji);
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">

      <SectionTitle>人気の習慣からえらぶ</SectionTitle>
      <View style={styles.templateWrap}>
        {TEMPLATES.map((t) => {
          const active = name === t.name;
          return (
            <PressableScale
              key={t.name}
              onPress={() => applyTemplate(t)}
              style={[
                styles.templateChip,
                { backgroundColor: active ? c.primarySoft : c.card, borderColor: active ? c.primary : 'transparent' },
                Shadows.card,
              ]}>
              <Text style={styles.templateEmoji}>{t.emoji}</Text>
              <Text style={[styles.templateText, { color: active ? c.primary : c.text }]}>
                {t.name}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <SectionTitle>じぶんで入力する</SectionTitle>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="例: 10分散歩する"
        placeholderTextColor={c.textTertiary}
        style={[
          styles.input,
          { backgroundColor: c.card, color: c.text },
          Shadows.card,
        ]}
      />

      <SectionTitle>アイコン</SectionTitle>
      <View style={styles.emojiGrid}>
        {EMOJIS.map((e) => {
          const selected = emoji === e;
          return (
            <PressableScale
              key={e}
              scaleTo={0.88}
              onPress={() => setEmoji(e)}
              style={[
                styles.emojiCell,
                { backgroundColor: selected ? c.primarySoft : c.card, borderColor: selected ? c.primary : 'transparent' },
                Shadows.card,
              ]}>
              <Text style={styles.emoji}>{e}</Text>
            </PressableScale>
          );
        })}
      </View>

      <PrimaryButton
        label="追加する"
        onPress={onSave}
        disabled={!name.trim()}
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },

  templateWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  templateEmoji: { fontSize: 15 },
  templateText: { fontSize: 13, fontWeight: '600' },

  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
  },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiCell: {
    width: 54,
    height: 54,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },

  button: { marginTop: Spacing.xl },
});
