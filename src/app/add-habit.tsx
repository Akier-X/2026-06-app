import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton, SectionTitle } from '@/components/ui';
import { Radius, Spacing, useThemeColors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

const EMOJIS = ['🌱', '🚶', '💧', '📖', '🧘', '🏃', '📝', '😴', '🥗', '🧹', '☀️', '🎯'];

export default function AddHabitScreen() {
  const c = useThemeColors();
  const addHabit = useAppStore((s) => s.addHabit);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  const onSave = () => {
    addHabit(name.trim(), emoji);
    router.back();
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}>
      <SectionTitle>習慣の名前</SectionTitle>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="例: 10分散歩する"
        placeholderTextColor={c.textSecondary}
        autoFocus
        style={[
          styles.input,
          { backgroundColor: c.card, color: c.text, borderColor: c.border },
        ]}
      />

      <SectionTitle>アイコン</SectionTitle>
      <View style={styles.emojiGrid}>
        {EMOJIS.map((e) => {
          const selected = emoji === e;
          return (
            <Pressable
              key={e}
              onPress={() => setEmoji(e)}
              style={[
                styles.emojiCell,
                {
                  backgroundColor: selected ? c.primarySoft : c.card,
                  borderColor: selected ? c.primary : c.border,
                },
              ]}>
              <Text style={styles.emoji}>{e}</Text>
            </Pressable>
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
  content: { padding: Spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emojiCell: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  button: { marginTop: Spacing.xl },
});
