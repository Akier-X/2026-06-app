import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import AdBanner from '@/components/AdBanner';
import { Card, SectionTitle } from '@/components/ui';
import { Radius, Spacing, useThemeColors } from '@/constants/theme';
import {
  cancelMoodReminder,
  cancelWeeklyNotification,
  scheduleMoodReminder,
  scheduleWeeklyReportNotification,
} from '@/lib/notifications';
import { restorePurchases } from '@/lib/purchases';
import { generateWeeklyReport } from '@/lib/weeklyReport';
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
  const storeMoodReminderTime = useAppStore((s) => s.setMoodReminderTime);
  const storeWeeklyNotification = useAppStore((s) => s.setWeeklyNotification);

  const totalDaysWithData = Object.keys(completions).filter(
    (k) => (completions[k]?.length ?? 0) > 0 || moods[k],
  ).length;
  const showBanner = !isPremium && totalDaysWithData >= 7;

  const [restoring, setRestoring] = useState(false);
  const [referralInput, setReferralInput] = useState('');
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
          `ここロコーチで習慣管理を始めました！🌿\n` +
          `招待コードを使うと7日間プレミアムが無料で試せます。\n\n` +
          `招待コード: ${referralCode}\n\n` +
          `#ここロコーチ #習慣化`,
      });
    } catch { /* ignore */ }
  };

  const onRedeemCode = () => {
    const result = redeemReferralCode(referralInput);
    if (result === 'ok') {
      setReferralInput('');
      Alert.alert(
        '7日間プレミアム開始！',
        'プレミアムが有効になりました。すべての機能をお楽しみください 🎉',
      );
    } else if (result === 'already_redeemed') {
      Alert.alert('このコードは使用済みです', '別のコードをお試しください。');
    } else {
      Alert.alert('無効なコードです', 'コードの形式を確認してください（例: AB3F-7XK2）。');
    }
  };

  const onReset = () => {
    Alert.alert('データを初期化', 'すべての習慣・記録・チャット履歴を削除します。よろしいですか?', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除する', style: 'destructive', onPress: resetAll },
    ]);
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

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}>
      <SectionTitle>プラン</SectionTitle>
      <Card style={styles.planCard}>
        <Text style={styles.planEmoji}>{isPremium ? '⭐️' : '🌱'}</Text>
        <Text style={[styles.planTitle, { color: c.text }]}>
          {isPremium ? 'プレミアム会員' : '無料プラン'}
        </Text>
        <Text style={[styles.planBody, { color: c.textSecondary }]}>
          {isPremium
            ? 'すべての機能をご利用いただけます。いつもありがとうございます!'
            : 'プレミアムで習慣数・AIコーチが無制限になります。'}
        </Text>
      </Card>
      {!isPremium && (
        <Row icon="sparkles" label="プレミアムにアップグレード" onPress={() => router.push('/paywall')} />
      )}
      <Row
        icon="refresh"
        label={restoring ? '復元中...' : '購入を復元'}
        onPress={onRestore}
      />

      {/* Notification settings */}
      <SectionTitle>通知</SectionTitle>
      <Card style={styles.notifSection}>
        <View style={styles.notifRow}>
          <View style={styles.notifLabel}>
            <Text style={styles.notifEmoji}>😊</Text>
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
            <Text style={styles.notifEmoji}>📊</Text>
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

      <SectionTitle>きろく</SectionTitle>
      <Row
        icon="sparkles-outline"
        label={`${new Date().getFullYear()}年の年間レポート`}
        onPress={() => router.push('/annual-report')}
      />
      <Row
        icon="archive-outline"
        label="アーカイブ済み習慣"
        onPress={() => router.push('/archived-habits')}
      />

      {/* 友達を招待 */}
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
              style={[refStyles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
            />
            <Pressable
              onPress={onRedeemCode}
              disabled={!referralInput.trim()}
              style={[
                refStyles.redeemBtn,
                { backgroundColor: referralInput.trim() ? c.primary : c.cardPressed },
              ]}>
              <Text style={[refStyles.redeemBtnText, { color: referralInput.trim() ? '#fff' : c.textSecondary }]}>
                受け取る
              </Text>
            </Pressable>
          </View>
        )}
        {freeTrialUntil && (
          <Text style={[refStyles.trialBadge, { color: c.primary }]}>
            🎉 トライアル中 〜 {new Date(freeTrialUntil).toLocaleDateString('ja-JP')}
          </Text>
        )}
      </Card>

      <SectionTitle>このアプリについて</SectionTitle>
      <Row
        icon="mail-outline"
        label="ご意見・お問い合わせ"
        onPress={() => router.push('/feedback')}
      />
      <Row icon="document-text-outline" label="利用規約" onPress={() => router.push('/legal?type=terms')} />
      <Row
        icon="shield-checkmark-outline"
        label="プライバシーポリシー"
        onPress={() => router.push('/legal?type=privacy')}
      />

      <SectionTitle>データ</SectionTitle>
      <Row icon="trash-outline" label="データを初期化" onPress={onReset} danger />

      {/* バナー広告（無料・7日以上記録のユーザーのみ） */}
      {showBanner && <AdBanner />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  planCard: { alignItems: 'center', paddingVertical: Spacing.lg },
  planEmoji: { fontSize: 36 },
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
  notifEmoji: { fontSize: 22 },
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
