import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import AdBanner from '@/components/AdBanner';
import InkIcon from '@/components/art/InkIcon';
import { mixHex } from '@/components/art/seed';
import TreeArt from '@/components/art/TreeArt';
import { Card, SectionTitle } from '@/components/ui';
import { Fonts, Radius, Spacing, useThemeColors } from '@/constants/theme';
import { calcStreak, lastNDateKeys, todayKey } from '@/lib/dates';
import {
  deleteModel,
  downloadModel,
  isModelDownloaded,
  isNativeSupported,
  LLM_MODEL_SIZE_MB,
} from '@/lib/llm';
import {
  cancelMoodReminder,
  cancelWeeklyNotification,
  scheduleMoodReminder,
  scheduleWeeklyReportNotification,
} from '@/lib/notifications';
import { restorePurchases } from '@/lib/purchases';
import { generateWeeklyReport } from '@/lib/weeklyReport';
import { FREE_DAILY_COACH_MESSAGES, FREE_HABIT_LIMIT, useAppStore } from '@/store/useAppStore';

// ─── ここロコーチの木 レベルシステム ─────────────────────────────────────────
const TREE_LEVELS = [
  { min: 0,   max: 7,   name: '芽生え' },
  { min: 7,   max: 30,  name: '成長中' },
  { min: 30,  max: 60,  name: '根づき' },
  { min: 60,  max: 100, name: '開花' },
] as const;

function getTreeInfo(totalDays: number) {
  if (totalDays >= 100) {
    return { level: 5, name: '満開', progress: 1, daysToNext: 0, isMaxLevel: true };
  }
  for (let i = TREE_LEVELS.length - 1; i >= 0; i--) {
    const lv = TREE_LEVELS[i];
    if (totalDays >= lv.min) {
      return {
        level: i + 1,
        name: lv.name as string,
        progress: (totalDays - lv.min) / (lv.max - lv.min),
        daysToNext: lv.max - totalDays,
        isMaxLevel: false,
      };
    }
  }
  return { level: 1, name: '芽生え', progress: 0, daysToNext: 7, isMaxLevel: false };
}

// ─── TimePicker ───────────────────────────────────────────────────────────────
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
    <View style={tpStyles.row}>
      <View style={tpStyles.col}>
        <Pressable onPress={() => setH(h + 1)} style={tpStyles.btn}>
          <Ionicons name="chevron-up" size={22} color={c.primary} />
        </Pressable>
        <Text style={[tpStyles.num, { color: c.text }]}>{pad(h)}</Text>
        <Pressable onPress={() => setH(h - 1)} style={tpStyles.btn}>
          <Ionicons name="chevron-down" size={22} color={c.primary} />
        </Pressable>
      </View>
      <Text style={[tpStyles.colon, { color: c.text }]}>:</Text>
      <View style={tpStyles.col}>
        <Pressable onPress={() => setM(m + 5)} style={tpStyles.btn}>
          <Ionicons name="chevron-up" size={22} color={c.primary} />
        </Pressable>
        <Text style={[tpStyles.num, { color: c.text }]}>{pad(m - (m % 5))}</Text>
        <Pressable onPress={() => setM(m - 5)} style={tpStyles.btn}>
          <Ionicons name="chevron-down" size={22} color={c.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const tpStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, justifyContent: 'center' },
  col: { alignItems: 'center', gap: 2 },
  btn: { padding: 4 },
  num: { fontSize: 36, fontWeight: '800', minWidth: 48, textAlign: 'center' },
  colon: { fontSize: 36, fontWeight: '800' },
});

// ─── メイン画面 ───────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const c = useThemeColors();
  const isPremium = useAppStore((s) => s.isPremium);
  const freeTrialUntil = useAppStore((s) => s.freeTrialUntil);
  const referralCode = useAppStore((s) => s.referralCode);
  const redeemReferralCode = useAppStore((s) => s.redeemReferralCode);
  const setPremium = useAppStore((s) => s.setPremium);
  const resetAll = useAppStore((s) => s.resetAll);
  const profile = useAppStore((s) => s.profile);
  const habits = useAppStore((s) => s.habits);
  const completions = useAppStore((s) => s.completions);
  const moods = useAppStore((s) => s.moods);
  const chat = useAppStore((s) => s.chat);
  const coachUsage = useAppStore((s) => s.coachUsage);
  const storeMoodReminderTime = useAppStore((s) => s.setMoodReminderTime);
  const storeWeeklyNotification = useAppStore((s) => s.setWeeklyNotification);

  // ─── ここロコーチの木 ───
  const totalDaysWithData = Object.keys(completions).filter(
    (k) => (completions[k]?.length ?? 0) > 0 || moods[k],
  ).length;
  const tree = getTreeInfo(totalDaysWithData);

  // ─── 今週のサマリー ───
  const week = lastNDateKeys(7);
  const activeHabits = habits.filter((h) => !h.archived);
  const streak = calcStreak((key) => (completions[key]?.length ?? 0) > 0);
  const totalPossible = activeHabits.length * 7;
  const weeklyDone = week.reduce(
    (sum, key) =>
      sum + (completions[key] ?? []).filter((id) => activeHabits.some((h) => h.id === id)).length,
    0,
  );
  const habitRate = totalPossible === 0 ? null : Math.round((weeklyDone / totalPossible) * 100);
  const moodVals = week.map((k) => moods[k]).filter(Boolean) as number[];
  const avgMood =
    moodVals.length === 0 ? null : moodVals.reduce((a, b) => a + b, 0) / moodVals.length;
  const weekStart = new Date(Date.now() - 6 * 86400000);
  weekStart.setHours(0, 0, 0, 0);
  const aiChatCount = chat.filter(
    (m) => m.role === 'user' && new Date(m.createdAt) >= weekStart,
  ).length;

  // ─── 無料プラン使用量 ───
  const todayCoachUsed = coachUsage.date === todayKey() ? coachUsage.count : 0;
  const activeHabitsCount = activeHabits.length;

  const showBanner = !isPremium && totalDaysWithData >= 7;

  const [restoring, setRestoring] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [modelDownloaded, setModelDownloaded] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    isModelDownloaded().then(setModelDownloaded);
  }, []);

  const [moodReminderEnabled, setMoodReminderEnabled] = useState(!!profile.moodReminderTime);
  const [moodReminderTime, setMoodReminderTime] = useState(profile.moodReminderTime ?? '20:00');
  const [weeklyEnabled, setWeeklyEnabled] = useState(!!profile.weeklyNotificationEnabled);
  const [weeklyTime, setWeeklyTime] = useState(profile.weeklyNotificationTime ?? '09:00');

  const onRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        setPremium(true);
        Alert.alert('復元しました', 'プレミアムが有効になりました。');
      } else {
        Alert.alert('購入が見つかりません', '復元できる購入履歴がありませんでした。');
      }
    } catch {
      Alert.alert('エラー', '購入の復元に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setRestoring(false);
    }
  };

  const onShareReferral = async () => {
    try {
      await Share.share({
        message:
          `ここロコーチで、毎日の記録が一輪の花になる習慣づくりを始めました。\n` +
          `招待コードを使うと7日間プレミアムが無料で試せます。\n\n` +
          `招待コード: ${referralCode}\n\n` +
          `#ここロコーチ #こころの庭 #習慣化`,
      });
    } catch { /* ignore */ }
  };

  const onRedeemCode = () => {
    const result = redeemReferralCode(referralInput);
    if (result === 'ok') {
      setReferralInput('');
      Alert.alert(
        '7日間プレミアム開始！',
        'プレミアムが有効になりました。すべての機能をお楽しみください。',
      );
    } else if (result === 'already_redeemed') {
      Alert.alert('このコードは使用済みです', '別のコードをお試しください。');
    } else {
      Alert.alert('無効なコードです', 'コードの形式を確認してください（例: AB3F-7XK2）。');
    }
  };

  const onDownloadModel = () => {
    Alert.alert(
      'AIモデルをダウンロード',
      `約${LLM_MODEL_SIZE_MB}MBのLLMモデルをダウンロードします。Wi-Fi接続を推奨します。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ダウンロード',
          onPress: async () => {
            setDownloading(true);
            setDownloadProgress(0);
            try {
              await downloadModel((p) => setDownloadProgress(p));
              setModelDownloaded(true);
              Alert.alert('ダウンロード完了', 'AIコーチタブを開き直すと強化されたコーチが利用できます。');
            } catch (e) {
              Alert.alert('エラー', `ダウンロードに失敗しました: ${String(e)}`);
            } finally {
              setDownloading(false);
              setDownloadProgress(0);
            }
          },
        },
      ],
    );
  };

  const onDeleteModel = () => {
    Alert.alert(
      'モデルを削除',
      'ダウンロード済みのLLMモデルを削除します。削除後はルールベースの応答になります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            await deleteModel();
            setModelDownloaded(false);
          },
        },
      ],
    );
  };

  const onReset = () => {
    Alert.alert(
      'データを初期化',
      'すべての習慣・記録・チャット履歴を削除します。よろしいですか?',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除する', style: 'destructive', onPress: resetAll },
      ],
    );
  };

  const onToggleMoodReminder = async (enabled: boolean) => {
    setMoodReminderEnabled(enabled);
    if (enabled) {
      await scheduleMoodReminder(moodReminderTime).catch(() => {});
      storeMoodReminderTime(moodReminderTime);
    } else {
      await cancelMoodReminder().catch(() => {});
      storeMoodReminderTime(null);
    }
  };

  const onMoodTimeChange = async (time: string) => {
    setMoodReminderTime(time);
    if (moodReminderEnabled) {
      await scheduleMoodReminder(time).catch(() => {});
      storeMoodReminderTime(time);
    }
  };

  const scheduleWeekly = async (enabled: boolean, time: string) => {
    if (enabled) {
      const report = generateWeeklyReport(habits, completions, moods);
      await scheduleWeeklyReportNotification({
        rate: report.weeklyRate,
        bestHabitName: report.bestHabit?.habitName,
        time,
      }).catch(() => {});
    } else {
      await cancelWeeklyNotification().catch(() => {});
    }
  };

  const onToggleWeekly = async (enabled: boolean) => {
    setWeeklyEnabled(enabled);
    storeWeeklyNotification(enabled, weeklyTime);
    await scheduleWeekly(enabled, weeklyTime);
  };

  const onWeeklyTimeChange = async (time: string) => {
    setWeeklyTime(time);
    storeWeeklyNotification(weeklyEnabled, time);
    if (weeklyEnabled) await scheduleWeekly(true, time);
  };

  const Row = ({
    icon,
    label,
    onPress,
    danger,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    danger?: boolean;
  }) => (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <Ionicons name={icon} size={20} color={danger ? c.danger : c.primary} />
        <Text style={[styles.rowLabel, { color: danger ? c.danger : c.text }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
      </Card>
    </Pressable>
  );

  const PremiumLockRow = ({
    icon,
    label,
    targetRoute,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    targetRoute: string;
  }) => (
    <Pressable
      onPress={() =>
        isPremium ? router.push(targetRoute as never) : router.push('/paywall')
      }>
      <Card style={styles.row}>
        <Ionicons name={icon} size={20} color={c.primary} />
        <Text style={[styles.rowLabel, { color: c.text }]}>{label}</Text>
        {!isPremium && (
          <View style={[planStyles.proBadge, { backgroundColor: c.primarySoft }]}>
            <Ionicons name="lock-closed" size={10} color={c.primary} />
            <Text style={[planStyles.proBadgeText, { color: c.primary }]}>Pro</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
      </Card>
    </Pressable>
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}>

      {/* ───── ここロコーチの木 ───── */}
      <Card style={treeStyles.card}>
        <View style={treeStyles.header}>
          <TreeArt
            size={84}
            level={tree.level}
            trunkColor={mixHex(c.text, c.background, 0.25)}
            leafColor={c.primary}
            bloomColor={c.moodScale[4]}
            coreColor={c.bloomCore}
          />
          <View style={{ flex: 1 }}>
            <View style={treeStyles.titleRow}>
              <Text style={[treeStyles.title, { color: c.text }]}>ここロコーチの木</Text>
              <View style={[treeStyles.lvBadge, { backgroundColor: c.primarySoft }]}>
                <Text style={[treeStyles.lvText, { color: c.primary }]}>Lv.{tree.level}</Text>
              </View>
            </View>
            <Text style={[treeStyles.levelName, { color: c.textSecondary }]}>{tree.name}</Text>
          </View>
        </View>
        <View style={[treeStyles.bar, { backgroundColor: c.border }]}>
          <View
            style={[
              treeStyles.barFill,
              { backgroundColor: c.primary, width: `${Math.round(tree.progress * 100)}%` },
            ]}
          />
        </View>
        <Text style={[treeStyles.hint, { color: c.textSecondary }]}>
          {tree.isMaxLevel
            ? '最高レベルに到達。素晴らしい継続力です'
            : `あと${tree.daysToNext}日でLv.${tree.level + 1}（${TREE_LEVELS[tree.level]?.name ?? '満開'}）`}
        </Text>
      </Card>

      {/* ───── 今週のサマリー ───── */}
      <Card style={summaryStyles.card}>
        <Text style={[summaryStyles.heading, { color: c.text }]}>今週のサマリー</Text>
        <View style={summaryStyles.gridRow}>
          <View style={summaryStyles.cell}>
            <InkIcon name="ember" size={22} color={c.accent} strokeWidth={1.7} />
            <Text style={[summaryStyles.cellValue, { color: c.text }]}>{streak}日</Text>
            <Text style={[summaryStyles.cellLabel, { color: c.textSecondary }]}>継続中</Text>
          </View>
          <View style={[summaryStyles.divV, { backgroundColor: c.border }]} />
          <View style={summaryStyles.cell}>
            <InkIcon name="flag" size={22} color={c.primary} strokeWidth={1.7} />
            <Text style={[summaryStyles.cellValue, { color: c.text }]}>
              {habitRate === null ? '--' : `${habitRate}%`}
            </Text>
            <Text style={[summaryStyles.cellLabel, { color: c.textSecondary }]}>習慣達成率</Text>
          </View>
        </View>
        <View style={[summaryStyles.divH, { backgroundColor: c.border }]} />
        <View style={summaryStyles.gridRow}>
          <View style={summaryStyles.cell}>
            <InkIcon name="sunCloud" size={22} color={c.moodScale[3]} strokeWidth={1.7} />
            <Text style={[summaryStyles.cellValue, { color: c.text }]}>
              {avgMood === null ? '--' : avgMood.toFixed(1)}
            </Text>
            <Text style={[summaryStyles.cellLabel, { color: c.textSecondary }]}>気分スコア</Text>
          </View>
          <View style={[summaryStyles.divV, { backgroundColor: c.border }]} />
          <View style={summaryStyles.cell}>
            <InkIcon name="speechLeaf" size={22} color={c.primary} strokeWidth={1.7} />
            <Text style={[summaryStyles.cellValue, { color: c.text }]}>{aiChatCount}回</Text>
            <Text style={[summaryStyles.cellLabel, { color: c.textSecondary }]}>AI相談</Text>
          </View>
        </View>
      </Card>

      {/* ───── プラン ───── */}
      <SectionTitle>プラン</SectionTitle>
      {isPremium ? (
        <Card style={styles.planCard}>
          <InkIcon name="clearSun" size={34} color={c.bloomCore} strokeWidth={1.6} />
          <Text style={[styles.planTitle, { color: c.text }]}>プレミアム会員</Text>
          <Text style={[styles.planBody, { color: c.textSecondary }]}>
            すべての機能をご利用いただけます。いつもありがとうございます！
          </Text>
        </Card>
      ) : (
        <Card style={planStyles.usageCard}>
          <Text style={[planStyles.currentPlan, { color: c.textSecondary }]}>現在：無料プラン</Text>
          <View style={planStyles.usageItem}>
            <View style={planStyles.usageLabelRow}>
              <Text style={[planStyles.usageLabel, { color: c.text }]}>AIコーチ（本日）</Text>
              <Text
                style={[
                  planStyles.usageCount,
                  {
                    color:
                      todayCoachUsed >= FREE_DAILY_COACH_MESSAGES ? c.danger : c.textSecondary,
                  },
                ]}>
                {todayCoachUsed}/{FREE_DAILY_COACH_MESSAGES}回
              </Text>
            </View>
            <View style={[planStyles.bar, { backgroundColor: c.border }]}>
              <View
                style={[
                  planStyles.barFill,
                  {
                    backgroundColor:
                      todayCoachUsed >= FREE_DAILY_COACH_MESSAGES ? c.danger : c.primary,
                    width: `${Math.min(100, Math.round((todayCoachUsed / FREE_DAILY_COACH_MESSAGES) * 100))}%`,
                  },
                ]}
              />
            </View>
          </View>
          <View style={planStyles.usageItem}>
            <View style={planStyles.usageLabelRow}>
              <Text style={[planStyles.usageLabel, { color: c.text }]}>習慣数</Text>
              <Text
                style={[
                  planStyles.usageCount,
                  {
                    color: activeHabitsCount >= FREE_HABIT_LIMIT ? c.danger : c.textSecondary,
                  },
                ]}>
                {activeHabitsCount}/{FREE_HABIT_LIMIT}個
              </Text>
            </View>
            <View style={[planStyles.bar, { backgroundColor: c.border }]}>
              <View
                style={[
                  planStyles.barFill,
                  {
                    backgroundColor:
                      activeHabitsCount >= FREE_HABIT_LIMIT ? c.danger : c.primary,
                    width: `${Math.min(100, Math.round((activeHabitsCount / FREE_HABIT_LIMIT) * 100))}%`,
                  },
                ]}
              />
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/paywall')}
            style={[planStyles.upgradeBtn, { backgroundColor: c.primary }]}>
            <Ionicons name="sparkles" size={15} color="#fff" />
            <Text style={planStyles.upgradeBtnText}>プレミアムで無制限にする</Text>
          </Pressable>
        </Card>
      )}

      {/* ───── 通知 ───── */}
      <SectionTitle>通知</SectionTitle>
      <Card style={styles.notifSection}>
        <View style={styles.notifRow}>
          <View style={styles.notifLabel}>
            <InkIcon name="sunCloud" size={22} color={c.moodScale[3]} strokeWidth={1.7} />
            <View>
              <Text style={[styles.notifTitle, { color: c.text }]}>気分チェック通知</Text>
              <Text style={[styles.notifSub, { color: c.textSecondary }]}>
                1日1回、気分を記録するリマインダー
              </Text>
            </View>
          </View>
          <Switch
            value={moodReminderEnabled}
            onValueChange={onToggleMoodReminder}
            trackColor={{ false: c.border, true: c.primarySoft }}
            thumbColor={moodReminderEnabled ? c.primary : c.textSecondary}
          />
        </View>
        {moodReminderEnabled && (
          <View style={[styles.timePickerContainer, { borderTopColor: c.border }]}>
            <Text style={[styles.timePickerLabel, { color: c.textSecondary }]}>通知時刻</Text>
            <TimePicker value={moodReminderTime} onChange={onMoodTimeChange} />
          </View>
        )}
      </Card>

      <Card style={[styles.notifSection, { marginTop: Spacing.sm }]}>
        <View style={styles.notifRow}>
          <View style={styles.notifLabel}>
            <InkIcon name="journal" size={22} color={c.primary} strokeWidth={1.7} />
            <View>
              <Text style={[styles.notifTitle, { color: c.text }]}>週次レポート通知</Text>
              <Text style={[styles.notifSub, { color: c.textSecondary }]}>
                毎週日曜日に週の振り返りをお届け
              </Text>
            </View>
          </View>
          <Switch
            value={weeklyEnabled}
            onValueChange={onToggleWeekly}
            trackColor={{ false: c.border, true: c.primarySoft }}
            thumbColor={weeklyEnabled ? c.primary : c.textSecondary}
          />
        </View>
        {weeklyEnabled && (
          <View style={[styles.timePickerContainer, { borderTopColor: c.border }]}>
            <Text style={[styles.timePickerLabel, { color: c.textSecondary }]}>通知時刻（日曜）</Text>
            <TimePicker value={weeklyTime} onChange={onWeeklyTimeChange} />
          </View>
        )}
      </Card>

      <Text style={[styles.notifHint, { color: c.textSecondary }]}>
        習慣ごとのリマインダーは、習慣カードを長押しして設定できます
      </Text>

      {/* ───── レポート ───── */}
      <SectionTitle>レポート</SectionTitle>
      <Row
        icon="bar-chart-outline"
        label="週間・月間の振り返り"
        onPress={() => router.push('/stats' as never)}
      />
      <PremiumLockRow
        icon="sparkles-outline"
        label={`${new Date().getFullYear()}年の年間レポート`}
        targetRoute="/annual-report"
      />

      {/* ───── AI分析 ───── */}
      <SectionTitle>AI分析</SectionTitle>
      <Row
        icon="trending-up-outline"
        label="最近の傾向を見る"
        onPress={() => router.push('/stats' as never)}
      />
      <PremiumLockRow icon="pulse-outline" label="ストレス分析" targetRoute="/stats" />
      <PremiumLockRow icon="heart-outline" label="幸福度推移" targetRoute="/stats" />

      {/* ───── AIコーチ強化（ローカルLLM） ───── */}
      {isNativeSupported() && (
        <>
          <SectionTitle>AIコーチを強化</SectionTitle>
          <Card style={llmStyles.card}>
            <View style={llmStyles.header}>
              <Ionicons name="hardware-chip-outline" size={24} color={c.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[llmStyles.title, { color: c.text }]}>ローカルLLMモデル</Text>
                <Text style={[llmStyles.sub, { color: c.textSecondary }]}>
                  端末上でAIを動かし、より自然なコーチング返答を実現します（約{LLM_MODEL_SIZE_MB}MB）
                </Text>
              </View>
            </View>
            {downloading ? (
              <View style={llmStyles.progressWrap}>
                <View style={[llmStyles.progressBg, { backgroundColor: c.border }]}>
                  <View
                    style={[
                      llmStyles.progressFill,
                      { backgroundColor: c.primary, width: `${Math.round(downloadProgress * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={[llmStyles.progressText, { color: c.textSecondary }]}>
                  {Math.round(downloadProgress * 100)}% ダウンロード中...
                </Text>
              </View>
            ) : modelDownloaded ? (
              <View style={llmStyles.statusRow}>
                <Text style={[llmStyles.statusText, { color: '#1A6650' }]}>✓ ダウンロード済み（使用中）</Text>
                <Pressable onPress={onDeleteModel}>
                  <Text style={[llmStyles.deleteText, { color: c.danger }]}>削除</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={onDownloadModel}
                style={[llmStyles.dlBtn, { backgroundColor: c.primary }]}>
                <Ionicons name="cloud-download-outline" size={16} color="#fff" />
                <Text style={llmStyles.dlBtnText}>ダウンロード（約{LLM_MODEL_SIZE_MB}MB）</Text>
              </Pressable>
            )}
          </Card>
        </>
      )}

      {/* ───── 友達を招待 ───── */}
      <SectionTitle>友達を招待</SectionTitle>
      <Card style={refStyles.section}>
        <View style={refStyles.codeRow}>
          <Text style={[refStyles.codeLabel, { color: c.textSecondary }]}>あなたの招待コード</Text>
          <Text style={[refStyles.code, { color: c.primary }]}>{referralCode}</Text>
        </View>
        <Pressable
          onPress={onShareReferral}
          style={[refStyles.shareBtn, { backgroundColor: c.primary }]}>
          <Ionicons name="share-outline" size={16} color="#fff" />
          <Text style={refStyles.shareBtnText}>コードをシェアする</Text>
        </Pressable>

        <View style={[refStyles.divider, { backgroundColor: c.border }]} />

        <Text style={[refStyles.redeemLabel, { color: c.textSecondary }]}>
          友達のコードを持っていますか？7日間プレミアムが無料で試せます。
        </Text>
        {isPremium && !freeTrialUntil ? (
          <Text style={[refStyles.alreadyPremium, { color: c.primary }]}>
            ✓ プレミアム会員のためトライアル対象外です
          </Text>
        ) : (
          <View style={refStyles.inputRow}>
            <TextInput
              value={referralInput}
              onChangeText={setReferralInput}
              placeholder="例: AB3F-7XK2"
              placeholderTextColor={c.textSecondary}
              autoCapitalize="characters"
              style={[
                refStyles.input,
                { color: c.text, borderColor: c.border, backgroundColor: c.background },
              ]}
            />
            <Pressable
              onPress={onRedeemCode}
              disabled={!referralInput.trim()}
              style={[
                refStyles.redeemBtn,
                { backgroundColor: referralInput.trim() ? c.primary : c.cardPressed },
              ]}>
              <Text
                style={[
                  refStyles.redeemBtnText,
                  { color: referralInput.trim() ? '#fff' : c.textSecondary },
                ]}>
                受け取る
              </Text>
            </Pressable>
          </View>
        )}
        {freeTrialUntil && (
          <Text style={[refStyles.trialBadge, { color: c.primary }]}>
            トライアル中 〜 {new Date(freeTrialUntil).toLocaleDateString('ja-JP')}
          </Text>
        )}
      </Card>

      {/* ───── アプリ設定 ───── */}
      <SectionTitle>アプリ設定</SectionTitle>
      <Row
        icon="archive-outline"
        label="アーカイブ済み習慣"
        onPress={() => router.push('/archived-habits')}
      />
      <Row
        icon="refresh"
        label={restoring ? '復元中...' : '購入を復元'}
        onPress={onRestore}
      />

      {/* ───── サポート ───── */}
      <SectionTitle>サポート</SectionTitle>
      <Row
        icon="mail-outline"
        label="ご意見・お問い合わせ"
        onPress={() => router.push('/feedback')}
      />
      <Row
        icon="document-text-outline"
        label="利用規約"
        onPress={() => router.push('/legal?type=terms')}
      />
      <Row
        icon="shield-checkmark-outline"
        label="プライバシーポリシー"
        onPress={() => router.push('/legal?type=privacy')}
      />

      {/* ───── データ ───── */}
      <SectionTitle>データ</SectionTitle>
      <Row icon="trash-outline" label="データを初期化" onPress={onReset} danger />

      {showBanner && <AdBanner />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  planCard: { alignItems: 'center', paddingVertical: Spacing.lg },
  planTitle: { fontSize: 18, fontWeight: '800', marginTop: Spacing.sm },
  planBody: { fontSize: 13, textAlign: 'center', marginTop: Spacing.xs, lineHeight: 19 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: 14,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  notifSection: { marginBottom: Spacing.xs, padding: 0, overflow: 'hidden' },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  notifLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700' },
  notifSub: { fontSize: 12, marginTop: 2 },
  timePickerContainer: {
    borderTopWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timePickerLabel: { fontSize: 12 },
  notifHint: { fontSize: 12, marginBottom: Spacing.md, lineHeight: 17 },
});

const treeStyles = StyleSheet.create({
  card: { marginBottom: Spacing.sm, gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: 16, fontFamily: Fonts.display, letterSpacing: 0.5 },
  lvBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  lvText: { fontSize: 12, fontWeight: '800' },
  levelName: { fontSize: 13, marginTop: 2 },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  hint: { fontSize: 12 },
});

const summaryStyles = StyleSheet.create({
  card: { marginBottom: Spacing.md, padding: 0, overflow: 'hidden' },
  heading: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  gridRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  divV: { width: 1 },
  divH: { height: 1 },
  cellValue: { fontSize: 21, fontFamily: Fonts.display, marginTop: 4, letterSpacing: 0.5 },
  cellLabel: { fontSize: 12, marginTop: 2 },
});

const planStyles = StyleSheet.create({
  usageCard: { gap: Spacing.sm },
  currentPlan: { fontSize: 13, fontWeight: '600' },
  usageItem: { gap: 6 },
  usageLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usageLabel: { fontSize: 14, fontWeight: '600' },
  usageCount: { fontSize: 13, fontWeight: '700' },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  proBadgeText: { fontSize: 11, fontWeight: '700' },
});

const llmStyles = StyleSheet.create({
  card: { gap: Spacing.sm },
  header: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  title: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  progressWrap: { gap: 6 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12, textAlign: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusText: { fontSize: 13, fontWeight: '600' },
  deleteText: { fontSize: 13, fontWeight: '600' },
  dlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 11,
    borderRadius: Radius.full,
  },
  dlBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

const refStyles = StyleSheet.create({
  section: { gap: Spacing.sm },
  codeRow: { alignItems: 'center', gap: 4 },
  codeLabel: { fontSize: 12 },
  code: { fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 11,
    borderRadius: Radius.full,
  },
  shareBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  divider: { height: 1, marginVertical: Spacing.xs },
  redeemLabel: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  inputRow: { flexDirection: 'row', gap: Spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  redeemBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    justifyContent: 'center',
  },
  redeemBtnText: { fontSize: 14, fontWeight: '700' },
  alreadyPremium: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  trialBadge: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
