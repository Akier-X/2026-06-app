import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, SectionTitle } from '@/components/ui';
import { Radius, Spacing, useThemeColors } from '@/constants/theme';
import { lastNDateKeys, weekdayLabel } from '@/lib/dates';
import { generateWeeklyReport } from '@/lib/weeklyReport';
import { useAppStore } from '@/store/useAppStore';

const MOOD_EMOJI = ['', '😞', '😕', '😐', '🙂', '😄'];

function MoodDots({ value }: { value: number }) {
  const c = useThemeColors();
  return (
    <View style={styles.moodDots}>
      {[1, 2, 3, 4, 5].map((v) => (
        <View
          key={v}
          style={[
            styles.dot,
            { backgroundColor: v <= Math.round(value) ? c.primary : c.border },
          ]}
        />
      ))}
    </View>
  );
}

function PremiumLock({ label }: { label: string }) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={() => router.push('/paywall')}
      style={[styles.lockOverlay, { backgroundColor: c.card + 'E8' }]}>
      <Ionicons name="lock-closed" size={20} color={c.primary} />
      <Text style={[styles.lockText, { color: c.text }]}>{label}</Text>
      <Text style={[styles.lockSub, { color: c.primary }]}>プレミアムで解放 →</Text>
    </Pressable>
  );
}

export default function StatsScreen() {
  const c = useThemeColors();
  const habits = useAppStore((s) => s.habits);
  const completions = useAppStore((s) => s.completions);
  const moods = useAppStore((s) => s.moods);
  const isPremium = useAppStore((s) => s.isPremium);

  const week = lastNDateKeys(7);
  const total = habits.length;
  const report = generateWeeklyReport(habits, completions, moods);

  const weeklyRates = week.map((key) => {
    const done = (completions[key] ?? []).filter((id) =>
      habits.some((h) => h.id === id),
    ).length;
    return total === 0 ? 0 : done / total;
  });

  const moodLabel = report.avgMood === 0
    ? 'データなし'
    : MOOD_EMOJI[Math.round(report.avgMood)] + ' ' + report.avgMood.toFixed(1);

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}>

      {/* ── 週次AIレポート ── */}
      <SectionTitle>今週のAIレポート</SectionTitle>

      {/* 基本サマリー（無料でも見える） */}
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: c.primary }]}>{report.weeklyDone}</Text>
          <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>達成回数</Text>
          {report.totalPossible > 0 && (
            <Text style={[styles.summaryRate, { color: c.textSecondary }]}>
              {Math.round(report.weeklyRate * 100)}%
            </Text>
          )}
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: c.accent }]}>{moodLabel}</Text>
          <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>平均気分</Text>
          {report.avgMood > 0 && <MoodDots value={report.avgMood} />}
        </Card>
      </View>

      {/* トップインサイト（無料でも1件） */}
      {report.topInsight && (
        <Card style={[styles.insightCard, { borderLeftColor: c.primary }]}>
          <Text style={styles.insightIcon}>💡</Text>
          <Text style={[styles.insightText, { color: c.text }]}>{report.topInsight}</Text>
        </Card>
      )}

      {/* 習慣別パフォーマンス（無料でも見える） */}
      {report.bestHabit && (
        <Card style={styles.habitRow}>
          <Text style={styles.habitPerformEmoji}>{report.bestHabit.habitEmoji}</Text>
          <View style={styles.habitPerformBody}>
            <Text style={[styles.habitPerformName, { color: c.text }]}>
              {report.bestHabit.habitName}
            </Text>
            <Text style={[styles.habitPerformSub, { color: c.textSecondary }]}>
              今週の達成率 {Math.round(report.bestHabit.weekRate * 100)}%
              {report.bestHabit.streak >= 2 ? `  🔥 ${report.bestHabit.streak}日連続` : ''}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: c.primarySoft }]}>
            <Text style={[styles.badgeText, { color: c.primary }]}>ベスト</Text>
          </View>
        </Card>
      )}

      {/* ── プレミアム解析（ソフトロック） ── */}
      <SectionTitle>詳細分析</SectionTitle>
      <View style={styles.premiumSection}>
        {/* コンテンツ（常にレンダリング、ロック時はぼかし） */}
        <View style={[styles.premiumContent, !isPremium && styles.blurred]}>
          {/* 曜日パターン */}
          {report.dayPatterns.length > 0 && (
            <Card style={styles.dayPatternCard}>
              <Text style={[styles.analysisTitle, { color: c.text }]}>曜日別パターン（過去4週）</Text>
              <View style={styles.dayPatternRow}>
                {report.dayPatterns.slice(0, 7).map((dp) => (
                  <View key={dp.dayLabel} style={styles.dayCol}>
                    <Text style={[styles.dayMoodEmoji]}>
                      {dp.avgMood > 0 ? MOOD_EMOJI[Math.round(dp.avgMood)] : '·'}
                    </Text>
                    <View style={[styles.dayBarTrack, { backgroundColor: c.cardPressed }]}>
                      <View
                        style={[
                          styles.dayBarFill,
                          {
                            backgroundColor: c.primary,
                            height: `${Math.round(dp.completionRate * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.dayLabel, { color: c.textSecondary }]}>
                      {dp.dayLabel}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* 気分×習慣の相関 */}
          {(report.moodHabitCorrelation || report.lowMoodDayWarning) && (
            <Card style={styles.correlationCard}>
              <Text style={[styles.analysisTitle, { color: c.text }]}>AIが発見したパターン</Text>
              {report.moodHabitCorrelation && (
                <View style={styles.correlationRow}>
                  <Text style={styles.corrIcon}>📈</Text>
                  <Text style={[styles.corrText, { color: c.text }]}>
                    {report.moodHabitCorrelation}
                  </Text>
                </View>
              )}
              {report.lowMoodDayWarning && (
                <View style={styles.correlationRow}>
                  <Text style={styles.corrIcon}>⚠️</Text>
                  <Text style={[styles.corrText, { color: c.text }]}>
                    {report.lowMoodDayWarning}
                  </Text>
                </View>
              )}
            </Card>
          )}

          {/* データが少ない場合のプレースホルダー */}
          {!report.moodHabitCorrelation && !report.lowMoodDayWarning && (
            <Card>
              <Text style={[styles.analysisTitle, { color: c.text }]}>AIが発見したパターン</Text>
              <Text style={[styles.noDataText, { color: c.textSecondary }]}>
                気分と習慣を2週間以上記録すると、あなただけのパターンが見えてきます。
              </Text>
            </Card>
          )}
        </View>

        {/* ロックオーバーレイ */}
        {!isPremium && (
          <PremiumLock label="気分×習慣の相関分析、曜日パターンを確認できます" />
        )}
      </View>

      {/* ── 週間達成率グラフ ── */}
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

      {/* ── 気分の移り変わり ── */}
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

  // サマリー
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  summaryCard: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  summaryValue: { fontSize: 26, fontWeight: '800' },
  summaryLabel: { fontSize: 12 },
  summaryRate: { fontSize: 11 },
  moodDots: { flexDirection: 'row', gap: 3, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // インサイトカード
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    borderLeftWidth: 3,
  },
  insightIcon: { fontSize: 16 },
  insightText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // 習慣別パフォーマンス
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  habitPerformEmoji: { fontSize: 24 },
  habitPerformBody: { flex: 1 },
  habitPerformName: { fontSize: 14, fontWeight: '700' },
  habitPerformSub: { fontSize: 12, marginTop: 2 },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // プレミアムセクション
  premiumSection: { position: 'relative' },
  premiumContent: {},
  blurred: { opacity: 0.25 },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
  },
  lockText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  lockSub: { fontSize: 13, fontWeight: '700' },

  // 曜日パターン
  dayPatternCard: { marginBottom: Spacing.sm },
  analysisTitle: { fontSize: 13, fontWeight: '700', marginBottom: Spacing.sm },
  dayPatternRow: { flexDirection: 'row', justifyContent: 'space-between', height: 100 },
  dayCol: { alignItems: 'center', flex: 1, gap: Spacing.xs },
  dayMoodEmoji: { fontSize: 14 },
  dayBarTrack: { flex: 1, width: 14, borderRadius: 7, overflow: 'hidden', justifyContent: 'flex-end' },
  dayBarFill: { width: '100%', borderRadius: 7 },
  dayLabel: { fontSize: 11 },

  // 相関
  correlationCard: { marginBottom: Spacing.sm },
  correlationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginTop: Spacing.xs },
  corrIcon: { fontSize: 14 },
  corrText: { flex: 1, fontSize: 13, lineHeight: 20 },
  noDataText: { fontSize: 13, lineHeight: 20, marginTop: Spacing.xs },

  // 既存グラフ
  chart: { flexDirection: 'row', justifyContent: 'space-between', height: 140 },
  chartCol: { alignItems: 'center', flex: 1, gap: Spacing.xs },
  barTrack: { flex: 1, width: 18, borderRadius: 9, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 9 },
  chartLabel: { fontSize: 11 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodCol: { alignItems: 'center', flex: 1, gap: Spacing.xs },
  moodEmoji: { fontSize: 22 },
  hint: { marginTop: Spacing.lg, textAlign: 'center', fontSize: 13 },
});
