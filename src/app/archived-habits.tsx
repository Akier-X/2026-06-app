import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, SectionTitle } from '@/components/ui';
import { Spacing, useThemeColors } from '@/constants/theme';
import { cancelHabitReminder } from '@/lib/notifications';
import { useAppStore } from '@/store/useAppStore';

export default function ArchivedHabitsScreen() {
  const c = useThemeColors();
  const habits = useAppStore((s) => s.habits);
  const unarchiveHabit = useAppStore((s) => s.unarchiveHabit);
  const removeHabit = useAppStore((s) => s.removeHabit);

  const archived = habits.filter((h) => h.archived);

  const onDelete = (id: string, name: string) => {
    Alert.alert(`「${name}」を削除`, 'この習慣と関連する記録はすべて削除されます。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          await cancelHabitReminder(id);
          removeHabit(id);
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <SectionTitle>アーカイブ済み習慣</SectionTitle>

      {archived.length === 0 ? (
        <Card>
          <Text style={[styles.empty, { color: c.textSecondary }]}>
            アーカイブされた習慣はありません。{'\n'}
            習慣カードを長押し → 習慣の設定 → アーカイブ で非表示にできます。
          </Text>
        </Card>
      ) : (
        archived.map((h) => (
          <Card key={h.id} style={styles.habitRow}>
            <Text style={styles.emoji}>{h.emoji}</Text>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
              {h.name}
            </Text>
            <Pressable
              onPress={() => unarchiveHabit(h.id)}
              style={[styles.actionBtn, { backgroundColor: c.primarySoft }]}>
              <Text style={[styles.actionText, { color: c.primary }]}>復元</Text>
            </Pressable>
            <Pressable
              onPress={() => onDelete(h.id, h.name)}
              style={[styles.actionBtn, { backgroundColor: '#FDEAEA' }]}>
              <Text style={[styles.actionText, { color: c.danger }]}>削除</Text>
            </Pressable>
          </Card>
        ))
      )}

      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={[styles.backText, { color: c.textSecondary }]}>← 戻る</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  empty: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  emoji: { fontSize: 22 },
  name: { flex: 1, fontSize: 14, fontWeight: '600' },
  actionBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionText: { fontSize: 12, fontWeight: '700' },
  backBtn: { marginTop: Spacing.lg, alignSelf: 'center' },
  backText: { fontSize: 14 },
});
