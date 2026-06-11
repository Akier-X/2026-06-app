import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, SectionTitle } from '@/components/ui';
import { Spacing, useThemeColors } from '@/constants/theme';
import { calcStreak, lastNDateKeys, weekdayLabel } from '@/lib/dates';
import { useAppStore } from '@/store/useAppStore';

const MOOD_EMOJI = ['', '😞', '😕', '😐', '🙂', '😄'];

export default function StatsScreen() {
  const c = useThemeColors();
  const habits = useAppStore((s) => s.habits);
  const completions = useAppStore((s) => s.completions);
  const moods = useAppStore((s) => s.moods);

  const week = lastNDateKeys(7);
  const total = habits.length;

  const weeklyRates = week.map((key) => {
    const done = (completions[key] ?? []).filter((id) =>
      habits.some((h) => h.id === id),
    ).length;
    return total === 0 ? 0 : done / total;
  });

  const weeklyDone = week.reduce(
    (sum, key) =>
      sum + (completions[key] ?? []).filter((id) => habits.some((h) => h.id === id)).length,
    0,
  );

  const bestStreak = habits.reduce((best, h) => {
    const s = calcStreak((key) => (completions[key] ?? []).includes(h.id));
    return Math.max(best, s);
  }, 0);

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}>
      <SectionTitle>今週のサマリー</SectionTitle>
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: c.primary }]}>{weeklyDone}</Text>
          <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>達成回数</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: c.accent }]}>🔥{bestStreak}</Text>
          <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>最長連続日数</Text>
        </Card>
      </View>

      <SectionTitle>週間達成率</SectionTitle>
      <Card>
        <View style={styles.chart}>
          {week.map((key, i) => (
            <View key={key} style={styles.chartCol}>
              <View style={[styles.barTrack, { backgroundColor: c.cardPressed }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: c.primary,
                      height: `${Math.round(weeklyRates[i] * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.chartLabel, { color: c.textSecondary }]}>
                {weekdayLabel(key)}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle>気分の移り変わり</SectionTitle>
      <Card>
        <View style={styles.moodRow}>
          {week.map((key) => (
            <View key={key} style={styles.moodCol}>
              <Text style={styles.moodEmoji}>
                {moods[key] ? MOOD_EMOJI[moods[key]] : '·'}
              </Text>
              <Text style={[styles.chartLabel, { color: c.textSecondary }]}>
                {weekdayLabel(key)}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {total === 0 && (
        <Text style={[styles.hint, { color: c.textSecondary }]}>
          習慣を追加すると、ここに記録が表示されます。
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  summaryCard: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 28, fontWeight: '800' },
  summaryLabel: { fontSize: 12, marginTop: Spacing.xs },
  chart: { flexDirection: 'row', justifyContent: 'space-between', height: 140 },
  chartCol: { alignItems: 'center', flex: 1, gap: Spacing.xs },
  barTrack: {
    flex: 1,
    width: 18,
    borderRadius: 9,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: { width: '100%', borderRadius: 9 },
  chartLabel: { fontSize: 11 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodCol: { alignItems: 'center', flex: 1, gap: Spacing.xs },
  moodEmoji: { fontSize: 22 },
  hint: { marginTop: Spacing.lg, textAlign: 'center', fontSize: 13 },
});
