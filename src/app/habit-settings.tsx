import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { PrimaryButton, SectionTitle } from '@/components/ui';
import { Radius, Spacing, useThemeColors } from '@/constants/theme';
import { cancelHabitReminder, scheduleHabitReminder } from '@/lib/notifications';
import { useAppStore } from '@/store/useAppStore';

function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (t: string) => void;
}) {
  const c = useThemeColors();
  const [h, m] = value.split(':').map(Number);

  const pad = (n: number) => String(n).padStart(2, '0');
  const setH = (next: number) => onChange(`${pad((next + 24) % 24)}:${pad(m)}`);
  const setM = (next: number) => onChange(`${pad(h)}:${pad((next + 60) % 60)}`);

  return (
    <View style={styles.pickerRow}>
      {/* Hour */}
      <View style={styles.pickerColumn}>
        <Pressable onPress={() => setH(h + 1)} style={styles.arrowButton}>
          <Ionicons name="chevron-up" size={28} color={c.primary} />
        </Pressable>
        <Text style={[styles.pickerNumber, { color: c.text }]}>{pad(h)}</Text>
        <Pressable onPress={() => setH(h - 1)} style={styles.arrowButton}>
          <Ionicons name="chevron-down" size={28} color={c.primary} />
        </Pressable>
      </View>

      <Text style={[styles.pickerColon, { color: c.text }]}>:</Text>

      {/* Minute (5-minute steps) */}
      <View style={styles.pickerColumn}>
        <Pressable onPress={() => setM(m + 5)} style={styles.arrowButton}>
          <Ionicons name="chevron-up" size={28} color={c.primary} />
        </Pressable>
        <Text style={[styles.pickerNumber, { color: c.text }]}>{pad(m - (m % 5))}</Text>
        <Pressable onPress={() => setM(m - 5)} style={styles.arrowButton}>
          <Ionicons name="chevron-down" size={28} color={c.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export default function HabitSettingsScreen() {
  const c = useThemeColors();
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const habit = useAppStore((s) => s.habits.find((h) => h.id === habitId));
  const updateHabitReminder = useAppStore((s) => s.updateHabitReminder);
  const removeHabit = useAppStore((s) => s.removeHabit);
  const archiveHabit = useAppStore((s) => s.archiveHabit);

  const [reminderEnabled, setReminderEnabled] = useState(!!habit?.reminderTime);
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime ?? '08:00');

  if (!habit) {
    router.back();
    return null;
  }

  const onSave = async () => {
    if (reminderEnabled) {
      const normalizedTime = normalizeTime(reminderTime);
      updateHabitReminder(habit.id, normalizedTime);
      await scheduleHabitReminder({ ...habit, reminderTime: normalizedTime });
    } else {
      updateHabitReminder(habit.id, null);
      await cancelHabitReminder(habit.id);
    }
    router.back();
  };

  const onArchive = () => {
    Alert.alert(
      `「${habit.name}」をアーカイブ`,
      '今日タブから非表示になります。設定 → アーカイブ済み習慣 から復元できます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'アーカイブ',
          onPress: () => {
            archiveHabit(habit.id);
            router.back();
          },
        },
      ],
    );
  };

  const onDelete = () => {
    Alert.alert(
      `「${habit.name}」を削除`,
      'この習慣と関連する記録はすべて削除されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            await cancelHabitReminder(habit.id);
            removeHabit(habit.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}>

      {/* Habit header */}
      <View style={[styles.header, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={styles.headerEmoji}>{habit.emoji}</Text>
        <Text style={[styles.headerName, { color: c.text }]}>{habit.name}</Text>
      </View>

      {/* Reminder toggle */}
      <SectionTitle>リマインダー通知</SectionTitle>
      <View style={[styles.toggleRow, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.toggleLabel}>
          <Ionicons name="notifications-outline" size={20} color={c.primary} />
          <Text style={[styles.toggleText, { color: c.text }]}>毎日通知する</Text>
        </View>
        <Switch
          value={reminderEnabled}
          onValueChange={setReminderEnabled}
          trackColor={{ false: c.border, true: c.primarySoft }}
          thumbColor={reminderEnabled ? c.primary : c.textSecondary}
        />
      </View>

      {reminderEnabled && (
        <>
          <Text style={[styles.pickerLabel, { color: c.textSecondary }]}>
            通知時刻
          </Text>
          <View style={[styles.pickerCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <TimePicker value={reminderTime} onChange={setReminderTime} />
          </View>
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            [✅ 達成] ボタンで通知から直接記録できます
          </Text>
        </>
      )}

      <PrimaryButton label="保存する" onPress={onSave} style={styles.saveButton} />

      {/* Archive */}
      <Pressable onPress={onArchive} style={styles.archiveButton}>
        <Ionicons name="archive-outline" size={18} color={c.textSecondary} />
        <Text style={[styles.archiveText, { color: c.textSecondary }]}>この習慣をアーカイブ（非表示に）</Text>
      </Pressable>

      {/* Delete */}
      <Pressable onPress={onDelete} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={18} color={c.danger} />
        <Text style={[styles.deleteText, { color: c.danger }]}>この習慣を削除</Text>
      </Pressable>
    </ScrollView>
  );
}

function normalizeTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hh = String(Math.min(Math.max(h, 0), 23)).padStart(2, '0');
  const mm = String(Math.round(Math.min(Math.max(m, 0), 59) / 5) * 5 % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  headerEmoji: { fontSize: 32 },
  headerName: { fontSize: 18, fontWeight: '700', flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  toggleLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  toggleText: { fontSize: 15, fontWeight: '600' },
  pickerLabel: { fontSize: 13, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  pickerCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  pickerColumn: { alignItems: 'center', gap: 4 },
  arrowButton: { padding: 6 },
  pickerNumber: { fontSize: 48, fontWeight: '800', minWidth: 60, textAlign: 'center' },
  pickerColon: { fontSize: 48, fontWeight: '800', marginTop: -8 },
  hint: { fontSize: 12, lineHeight: 18, marginBottom: Spacing.md },
  saveButton: { marginTop: Spacing.sm },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  archiveText: { fontSize: 14, fontWeight: '500' },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  deleteText: { fontSize: 15, fontWeight: '600' },
});
