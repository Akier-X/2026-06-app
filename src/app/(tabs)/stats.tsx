import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { captureRef as captureViewRef } from 'react-native-view-shot';

import AdBanner from '@/components/AdBanner';
import Bloom from '@/components/art/Bloom';
import Garden, { type GardenDay } from '@/components/art/Garden';
import InkIcon, { MOOD_ICONS } from '@/components/art/InkIcon';
import InsightShareModal from '@/components/InsightShareModal';
import { Card, PressableScale, SectionTitle } from '@/components/ui';
import { Fonts, Radius, Shadows, Spacing, useThemeColors } from '@/constants/theme';
import { lastNDateKeys, weekdayLabel } from '@/lib/dates';
import { checkInterstitialAllowed, showInterstitialAd, showRewardedAd } from '@/lib/ads';
import { generateMonthlyReport } from '@/lib/monthlyReport';
import { generateWeeklyReport } from '@/lib/weeklyReport';
import { shareImageFromRef } from '@/lib/shareUtils';
import { useAppStore } from '@/store/useAppStore';

type Period = 'week' | 'month';

/** 気分値(1〜5)を空模様アイコンで表す */
function MoodGlyph({ value, size = 16 }: { value: number; size?: number }) {
  const c = useThemeColors();
  const v = Math.round(value);
  if (v < 1) return null;
  return (
    <InkIcon name={MOOD_ICONS[v - 1]} size={size} color={c.moodScale[v - 1]} strokeWidth={1.7} />
  );
}

function MoodDots({ value }: { value: number }) {
  const c = useThemeColors();
  return (
    <View style={styles.moodDots}>
      {[1, 2, 3, 4, 5].map((v) => (
        <View
          key={v}
          style={[styles.dot, { backgroundColor: v <= Math.round(value) ? c.primary : c.border }]}
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

function PeriodToggle({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const c = useThemeColors();
  return (
    <View style={[styles.toggleContainer, { backgroundColor: c.cardPressed }]}>
      {(['week', 'month'] as Period[]).map((p) => (
        <Pressable
          key={p}
          onPress={() => onChange(p)}
          style={[styles.toggleBtn, period === p && { backgroundColor: c.card }]}>
          <Text style={[styles.toggleText, { color: period === p ? c.primary : c.textSecondary }]}>
            {p === 'week' ? '週間' : '月間'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function StatsScreen() {
  const c = useThemeColors();
  const habits = useAppStore((s) => s.habits);
  const completions = useAppStore((s) => s.completions);
  const moods = useAppStore((s) => s.moods);
  const isPremium = useAppStore((s) => s.isPremium);

  const [period, setPeriod] = useState<Period>('week');
  const [monthlyUnlocked, setMonthlyUnlocked] = useState(false);
  const [loadingAd, setLoadingAd] = useState(false);
  const [detailUnlocked, setDetailUnlocked] = useState(false);
  const [loadingDetailAd, setLoadingDetailAd] = useState(false);
  const [shareInsight, setShareInsight] = useState<string | null>(null);
  const gardenRef = useRef<View>(null);

  // ユーザー成熟度チェック（7日以上記録があるユーザーのみバナー・インタースティシャルを表示）
  const allDays = { ...completions };
  const totalDaysWithData = Object.keys(allDays).filter(
    (k) => (completions[k]?.length ?? 0) > 0 || moods[k],
  ).length;
  const isNewUser = totalDaysWithData < 7;

  const total = habits.length;
  const week = lastNDateKeys(7);
  const month = lastNDateKeys(30);

  // データ充足チェック（3日以上の記録があれば分析可能）
  const activeDaysWeek = week.filter((k) => (completions[k]?.length ?? 0) > 0 || moods[k]).length;
  const activeDaysMonth = month.filter((k) => (completions[k]?.length ?? 0) > 0 || moods[k]).length;
  const activeDays = period === 'week' ? activeDaysWeek : activeDaysMonth;
  const minDays = 3;
  const hasEnoughData = activeDays >= minDays;
  const daysUntilAnalysis = Math.max(0, minDays - activeDays);

  const onWatchAd = () => {
    setLoadingAd(true);
    showRewardedAd({
      onRewarded: () => { setMonthlyUnlocked(true); setLoadingAd(false); },
      onFailed: () => {
        setLoadingAd(false);
        Alert.alert('広告を読み込めませんでした', '時間をおいて再度お試しください。');
      },
    });
  };

  const onWatchAdForDetail = () => {
    setLoadingDetailAd(true);
    showRewardedAd({
      onRewarded: () => { setDetailUnlocked(true); setLoadingDetailAd(false); },
      onFailed: () => {
        setLoadingDetailAd(false);
        Alert.alert('広告を読み込めませんでした', '時間をおいて再度お試しください。');
      },
    });
  };

  const onAnnualReport = async () => {
    if (!isPremium && !isNewUser) {
      const allowed = await checkInterstitialAllowed();
      if (allowed) {
        showInterstitialAd({
          onClosed: () => router.push('/annual-report'),
          onFailed: () => router.push('/annual-report'),
        });
        return;
      }
    }
    router.push('/annual-report');
  };

  const weeklyReport = generateWeeklyReport(habits, completions, moods);
  const monthlyReport = generateMonthlyReport(habits, completions, moods);

  const activeReport = period === 'week' ? weeklyReport : monthlyReport;
  const activeDone = period === 'week' ? weeklyReport.weeklyDone : monthlyReport.monthlyDone;
  const activeRate = period === 'week' ? weeklyReport.weeklyRate : monthlyReport.monthlyRate;
  const activeMood = period === 'week' ? weeklyReport.avgMood : monthlyReport.avgMood;

  const weeklyRates = week.map((key) => {
    const done = (completions[key] ?? []).filter((id) => habits.some((h) => h.id === id)).length;
    return total === 0 ? 0 : done / total;
  });

  // こころの庭: 1日 = 1輪。達成数が花びらに、気分が色になる
  const toGardenDay = (key: string): GardenDay => ({
    key,
    petals: (completions[key] ?? []).filter((id) => habits.some((h) => h.id === id)).length,
    mood: moods[key] ?? 0,
    label: weekdayLabel(key),
  });
  const weekGarden = week.map(toGardenDay);
  const monthGarden = month.map(toGardenDay);

  const onShareGarden = async () => {
    await shareImageFromRef(
      () => captureViewRef(gardenRef, { format: 'png', quality: 1.0 }),
      `この一週間で咲いた花たち\n\n#ここロコーチ #こころの庭 #習慣化`,
    );
  };

  const moodLabel = activeMood === 0 ? 'データなし' : activeMood.toFixed(1);

  return (
    <>
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}>

      <PeriodToggle period={period} onChange={setPeriod} />

      {/* 月間レポート：無料ユーザー向けゲート */}
      {period === 'month' && !isPremium && !monthlyUnlocked && (
        <View style={[styles.monthGate, { backgroundColor: c.card }, Shadows.card]}>
          <InkIcon name="journal" size={40} color={c.primary} strokeWidth={1.5} />
          <Text style={[styles.gateTitle, { color: c.text }]}>月次レポート</Text>
          <Text style={[styles.gateSub, { color: c.textSecondary }]}>
            30日間のデータを深く分析します
          </Text>
          <Pressable
            onPress={onWatchAd}
            disabled={loadingAd}
            style={[styles.gateAdBtn, { backgroundColor: c.primary }]}>
            <Text style={styles.gateAdBtnText}>
              {loadingAd ? '読み込み中...' : '広告を見て無料で解放'}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/paywall')}>
            <Text style={[styles.gateUpgrade, { color: c.primary }]}>
              プレミアムでいつでも見る →
            </Text>
          </Pressable>
        </View>
      )}

      {/* データ不足 / 習慣なし の空状態 */}
      {(period === 'week' || isPremium || monthlyUnlocked) && (
        <>
          {total === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: c.card }, Shadows.card]}>
              <InkIcon name="sprout" size={40} color={c.primary} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: c.text }]}>習慣を追加しましょう</Text>
              <Text style={[styles.emptySub, { color: c.textSecondary }]}>
                「今日」タブから習慣を追加すると分析が始まります
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/')}
                style={[styles.emptyBtn, { borderColor: c.primary }]}>
                <Text style={[styles.emptyBtnText, { color: c.primary }]}>習慣を追加する</Text>
              </Pressable>
            </View>
          ) : !hasEnoughData ? (
            <View style={[styles.emptyState, { backgroundColor: c.card }, Shadows.card]}>
              <InkIcon name="sunCloud" size={40} color={c.primary} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: c.text }]}>分析の準備中</Text>
              <View style={styles.progressDots}>
                {Array.from({ length: minDays }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.progressDot,
                      { backgroundColor: i < activeDays ? c.primary : c.border },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.progressCount, { color: c.textSecondary }]}>
                {activeDays}/{minDays}日記録済み
              </Text>
              <Text style={[styles.emptySub, { color: c.textSecondary }]}>
                あと{daysUntilAnalysis}日記録すると最初のレポートが届きます
              </Text>
              <View style={[styles.milestoneList, { borderTopColor: c.border }]}>
                <View style={styles.milestoneRow}>
                  <Text style={[styles.milestoneIcon, { color: activeDays >= 3 ? c.primary : c.textSecondary }]}>
                    {activeDays >= 3 ? '✓' : '○'}
                  </Text>
                  <Text style={[styles.milestoneTxt, { color: activeDays >= 3 ? c.primary : c.textSecondary }]}>
                    3日 → 週次レポート開始
                  </Text>
                </View>
                <View style={styles.milestoneRow}>
                  <Text style={[styles.milestoneIcon, { color: totalDaysWithData >= 7 ? c.primary : c.textSecondary }]}>
                    {totalDaysWithData >= 7 ? '✓' : '○'}
                  </Text>
                  <Text style={[styles.milestoneTxt, { color: totalDaysWithData >= 7 ? c.primary : c.textSecondary }]}>
                    7日 → インサイト・詳細分析
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/(tabs)/')}
                style={[styles.emptyBtn, { borderColor: c.primary }]}>
                <Text style={[styles.emptyBtnText, { color: c.primary }]}>今日の記録へ →</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}

      {/* レポート（データ十分 かつ 月間は解放済みの場合のみ表示） */}
      {(hasEnoughData && total > 0) && (period === 'week' || isPremium || monthlyUnlocked) && (
        <>
      {/* こころの庭: 記録した日々が花畑になる */}
      <SectionTitle>{period === 'week' ? '今週の庭' : '今月の庭'}</SectionTitle>
      <View ref={gardenRef} collapsable={false}>
        <Card style={styles.gardenCard}>
          {period === 'week' ? (
            <Garden days={weekGarden} height={96} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ width: monthGarden.length * 30 }}>
                <Garden days={monthGarden} height={88} showLabels={false} />
              </View>
            </ScrollView>
          )}
          <View style={styles.gardenFooter}>
            <Text style={[styles.gardenHint, { color: c.textTertiary }]}>
              1日ごとに一輪。達成が花びらに、気分が色になります
            </Text>
            <Pressable onPress={onShareGarden} style={styles.gardenShareBtn} hitSlop={8}>
              <InkIcon name="share" size={15} color={c.primary} strokeWidth={1.9} />
              <Text style={[styles.gardenShareTxt, { color: c.primary }]}>庭をシェア</Text>
            </Pressable>
          </View>
        </Card>
      </View>

      <SectionTitle>{period === 'week' ? '今週のふりかえり' : '今月のふりかえり'}</SectionTitle>

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: c.primary }]}>{activeDone}</Text>
          <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>達成回数</Text>
          {activeDone > 0 && (
            <Text style={[styles.summaryRate, { color: c.textSecondary }]}>
              {Math.round(activeRate * 100)}%
            </Text>
          )}
        </Card>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryValueRow}>
            {activeMood > 0 && <MoodGlyph value={activeMood} size={22} />}
            <Text style={[styles.summaryValue, { color: c.accent }]}>{moodLabel}</Text>
          </View>
          <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>平均気分</Text>
          {activeMood > 0 && <MoodDots value={activeMood} />}
        </Card>
      </View>

      {activeReport.topInsight && (
        <Card style={[styles.insightCard, { borderLeftColor: c.primary }]}>
          <InkIcon name="clearSun" size={18} color={c.bloomCore} strokeWidth={1.7} />
          <View style={styles.insightBody}>
            <Text style={[styles.insightText, { color: c.text }]}>{activeReport.topInsight}</Text>
            <Pressable
              onPress={() => setShareInsight(activeReport.topInsight!)}
              style={styles.insightShareBtn}>
              <Ionicons name="share-outline" size={16} color={c.primary} />
              <Text style={[styles.insightShareTxt, { color: c.primary }]}>シェア</Text>
            </Pressable>
          </View>
        </Card>
      )}

      {activeReport.bestHabit && (
        <Card style={styles.habitRow}>
          <Text style={styles.habitPerformEmoji}>{activeReport.bestHabit.habitEmoji}</Text>
          <View style={styles.habitPerformBody}>
            <Text style={[styles.habitPerformName, { color: c.text }]}>
              {activeReport.bestHabit.habitName}
            </Text>
            <Text style={[styles.habitPerformSub, { color: c.textSecondary }]}>
              {period === 'week' ? '今週' : '今月'}の達成率{' '}
              {Math.round(activeReport.bestHabit.weekRate * 100)}%
              {activeReport.bestHabit.streak >= 2 ? `・${activeReport.bestHabit.streak}日連続` : ''}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: c.primarySoft }]}>
            <Text style={[styles.badgeText, { color: c.primary }]}>ベスト</Text>
          </View>
        </Card>
      )}

      {/* 詳細分析 */}
      <SectionTitle>詳細分析</SectionTitle>
      <View style={styles.premiumSection}>
        <View style={[styles.premiumContent, !isPremium && !detailUnlocked && styles.blurred]}>
          {activeReport.dayPatterns.length > 0 && (
            <Card style={styles.dayPatternCard}>
              <Text style={[styles.analysisTitle, { color: c.text }]}>
                曜日別パターン{period === 'week' ? '（過去4週）' : '（今月）'}
              </Text>
              <View style={styles.dayPatternRow}>
                {activeReport.dayPatterns.slice(0, 7).map((dp) => (
                  <View key={dp.dayLabel} style={styles.dayCol}>
                    <View style={styles.dayMood}>
                      {dp.avgMood > 0 ? (
                        <MoodGlyph value={dp.avgMood} size={14} />
                      ) : (
                        <Text style={{ color: c.textTertiary, fontSize: 12 }}>·</Text>
                      )}
                    </View>
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

          {activeReport.moodHabitCorrelation || activeReport.lowMoodDayWarning ? (
            <Card style={styles.correlationCard}>
              <Text style={[styles.analysisTitle, { color: c.text }]}>見つかったパターン</Text>
              {activeReport.moodHabitCorrelation && (
                <Pressable
                  style={styles.correlationRow}
                  onPress={() => setShareInsight(activeReport.moodHabitCorrelation!)}>
                  <Ionicons name="trending-up" size={15} color={c.primary} style={styles.corrIcon} />
                  <Text style={[styles.corrText, { color: c.text }]}>
                    {activeReport.moodHabitCorrelation}
                  </Text>
                  <Ionicons name="share-outline" size={14} color={c.primary} />
                </Pressable>
              )}
              {activeReport.lowMoodDayWarning && (
                <Pressable
                  style={styles.correlationRow}
                  onPress={() => setShareInsight(activeReport.lowMoodDayWarning!)}>
                  <InkIcon name="drizzle" size={15} color={c.moodScale[1]} strokeWidth={1.7} />
                  <Text style={[styles.corrText, { color: c.text }]}>
                    {activeReport.lowMoodDayWarning}
                  </Text>
                  <Ionicons name="share-outline" size={14} color={c.primary} />
                </Pressable>
              )}
            </Card>
          ) : (
            <Card>
              <Text style={[styles.analysisTitle, { color: c.text }]}>見つかったパターン</Text>
              <Text style={[styles.noDataText, { color: c.textSecondary }]}>
                気分と習慣を2週間以上記録すると、あなただけのパターンが見えてきます。
              </Text>
            </Card>
          )}
        </View>
        {!isPremium && !detailUnlocked && (
          <View style={[styles.lockOverlay, { backgroundColor: c.card + 'E8' }]}>
            <Ionicons name="lock-closed" size={20} color={c.primary} />
            <Text style={[styles.lockText, { color: c.text }]}>
              気分×習慣の相関分析、曜日パターンを確認できます
            </Text>
            <Pressable
              onPress={onWatchAdForDetail}
              disabled={loadingDetailAd}
              style={[styles.gateAdBtn, { backgroundColor: c.primary }]}>
              <Text style={styles.gateAdBtnText}>
                {loadingDetailAd ? '読み込み中...' : '広告を見て解放'}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/paywall')}>
              <Text style={[styles.lockSub, { color: c.primary }]}>プレミアムにアップグレード →</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* グラフ */}
      {period === 'week' ? (
        <>
          <SectionTitle>週間達成率</SectionTitle>
          <Card>
            <View style={styles.chart}>
              {week.map((key, i) => (
                <View key={key} style={styles.chartCol}>
                  <View style={[styles.barTrack, { backgroundColor: c.cardPressed }]}>
                    <View
                      style={[
                        styles.barFill,
                        { backgroundColor: c.primary, height: `${Math.round(weeklyRates[i] * 100)}%` },
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

          <SectionTitle>空模様のうつろい</SectionTitle>
          <Card>
            <View style={styles.moodRow}>
              {week.map((key) => (
                <View key={key} style={styles.moodCol}>
                  {moods[key] ? (
                    <MoodGlyph value={moods[key]} size={22} />
                  ) : (
                    <Text style={{ color: c.textTertiary, fontSize: 16 }}>·</Text>
                  )}
                  <Text style={[styles.chartLabel, { color: c.textSecondary }]}>
                    {weekdayLabel(key)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      ) : (
        <>
          <SectionTitle>週別達成率（4週）</SectionTitle>
          <Card>
            <View style={styles.weekBreakRow}>
              {monthlyReport.weekBreakdown.map((wb) => (
                <View key={wb.label} style={styles.weekBreakCol}>
                  <View style={[styles.wbBarTrack, { backgroundColor: c.cardPressed }]}>
                    <View
                      style={[
                        styles.wbBarFill,
                        { backgroundColor: c.primary, height: `${Math.round(wb.rate * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={[styles.wbLabel, { color: c.textSecondary }]}>{wb.label}</Text>
                  <Text style={[styles.wbRate, { color: c.text }]}>
                    {Math.round(wb.rate * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <SectionTitle>空模様のうつろい（30日）</SectionTitle>
          <Card>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.moodRow30}>
                {month.map((key) => (
                  <View key={key} style={styles.moodCol30}>
                    {moods[key] ? (
                      <MoodGlyph value={moods[key]} size={15} />
                    ) : (
                      <Text style={{ color: c.textTertiary, fontSize: 12 }}>·</Text>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>
        </>
      )}

      {/* 年間レポート */}
      <SectionTitle>年間レポート</SectionTitle>
      <PressableScale onPress={onAnnualReport} style={Shadows.raised}>
        <LinearGradient
          colors={c.gradientWarm}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.annualBtn}>
          <Bloom
            size={40}
            seedKey={`annual-${new Date().getFullYear()}`}
            petals={9}
            color="#F2E7CF"
            coreColor="#E3B54F"
          />
          <View style={styles.annualBody}>
            <Text style={styles.annualTitle}>{new Date().getFullYear()}年のふりかえり</Text>
            <Text style={styles.annualSub}>一年の庭を眺める</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </PressableScale>
        </>
      )}

      {/* バナー広告（無料・7日以上記録のユーザーのみ） */}
      {!isPremium && !isNewUser && <AdBanner />}
    </ScrollView>

    <InsightShareModal
      insight={shareInsight}
      onClose={() => setShareInsight(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },

  toggleContainer: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.sm },
  toggleText: { fontSize: 14, fontWeight: '700' },

  gardenCard: { paddingBottom: Spacing.sm },
  gardenFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  gardenHint: { fontSize: 10.5, flex: 1, lineHeight: 15 },
  gardenShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gardenShareTxt: { fontSize: 12, fontWeight: '700' },

  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  summaryCard: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  summaryValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: 25, fontFamily: Fonts.display, letterSpacing: 0.5 },
  summaryLabel: { fontSize: 12 },
  summaryRate: { fontSize: 11 },
  moodDots: { flexDirection: 'row', gap: 3, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    borderLeftWidth: 3,
  },
  insightBody: { flex: 1, gap: 6 },
  insightText: { fontSize: 13, lineHeight: 20 },
  insightShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  insightShareTxt: { fontSize: 12, fontWeight: '700' },

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

  dayPatternCard: { marginBottom: Spacing.sm },
  analysisTitle: { fontSize: 13, fontWeight: '700', marginBottom: Spacing.sm },
  dayPatternRow: { flexDirection: 'row', justifyContent: 'space-between', height: 100 },
  dayCol: { alignItems: 'center', flex: 1, gap: Spacing.xs },
  dayMood: { height: 16, alignItems: 'center', justifyContent: 'center' },
  dayBarTrack: { flex: 1, width: 14, borderRadius: 7, overflow: 'hidden', justifyContent: 'flex-end' },
  dayBarFill: { width: '100%', borderRadius: 7 },
  dayLabel: { fontSize: 11 },

  correlationCard: { marginBottom: Spacing.sm },
  correlationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  corrIcon: { marginTop: 2 },
  corrText: { flex: 1, fontSize: 13, lineHeight: 20 },
  noDataText: { fontSize: 13, lineHeight: 20, marginTop: Spacing.xs },

  chart: { flexDirection: 'row', justifyContent: 'space-between', height: 140 },
  chartCol: { alignItems: 'center', flex: 1, gap: Spacing.xs },
  barTrack: { flex: 1, width: 18, borderRadius: 9, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 9 },
  chartLabel: { fontSize: 11 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodCol: { alignItems: 'center', flex: 1, gap: Spacing.xs },

  weekBreakRow: { flexDirection: 'row', justifyContent: 'space-around', height: 130 },
  weekBreakCol: { alignItems: 'center', flex: 1, gap: Spacing.xs },
  wbBarTrack: { flex: 1, width: 24, borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end' },
  wbBarFill: { width: '100%', borderRadius: 12 },
  wbLabel: { fontSize: 11 },
  wbRate: { fontSize: 12, fontWeight: '700' },

  moodRow30: { flexDirection: 'row', gap: 3, paddingVertical: 4 },
  moodCol30: { alignItems: 'center', width: 20, height: 18, justifyContent: 'center' },

  // 月次ゲート
  monthGate: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  gateTitle: { fontSize: 18, fontWeight: '800' },
  gateSub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  gateAdBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  gateAdBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  gateUpgrade: { fontSize: 13, fontWeight: '600', marginTop: Spacing.xs },

  // 初週進捗
  progressDots: { flexDirection: 'row', gap: 8, marginTop: 4 },
  progressDot: { width: 14, height: 14, borderRadius: 7 },
  progressCount: { fontSize: 12, fontWeight: '700' },
  milestoneList: { width: '100%', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 4, gap: 6 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  milestoneIcon: { fontSize: 12, fontWeight: '700', width: 14, textAlign: 'center' },
  milestoneTxt: { fontSize: 12 },

  // 空状態
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    marginTop: Spacing.xs,
  },
  emptyBtnText: { fontWeight: '700', fontSize: 13 },

  annualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  annualBody: { flex: 1 },
  annualTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  annualSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  hint: { marginTop: Spacing.lg, textAlign: 'center', fontSize: 13 },
});
