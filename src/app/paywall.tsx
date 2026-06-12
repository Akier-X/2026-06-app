import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/ui';
import { Radius, Spacing, useThemeColors } from '@/constants/theme';
import {
  fetchPlans,
  purchasePlan,
  restorePurchases,
  type PlanOption,
} from '@/lib/purchases';
import { useAppStore } from '@/store/useAppStore';

const FEATURES = [
  { icon: 'infinite-outline' as const, text: '習慣を無制限に登録', sub: '無料は3個まで' },
  { icon: 'chatbubble-ellipses-outline' as const, text: 'AIコーチと無制限にチャット', sub: '無料は1日5回まで' },
  { icon: 'bar-chart-outline' as const, text: '気分×習慣の相関分析', sub: 'AIがあなただけのパターンを発見' },
  { icon: 'calendar-outline' as const, text: '曜日別パターン分析', sub: '過去4週間のデータを解析' },
  { icon: 'sparkles-outline' as const, text: '今後の新機能をすべて先行解放', sub: 'アップデートのたびにさらに便利に' },
];

export default function PaywallScreen() {
  const c = useThemeColors();
  const setPremium = useAppStore((s) => s.setPremium);

  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchPlans()
      .then((p) => {
        setPlans(p);
        const annual = p.find((x) => x.period === 'annual');
        setSelected(annual?.id ?? p[0]?.id ?? '');
      })
      .catch(() => setPlans([]));
  }, []);

  const onPurchase = async () => {
    const plan = plans.find((p) => p.id === selected);
    if (!plan) return;
    setBusy(true);
    try {
      const ok = await purchasePlan(plan);
      if (ok) {
        setPremium(true);
        Alert.alert('ようこそ!', 'プレミアムが有効になりました 🎉');
        router.back();
      }
    } catch (e: unknown) {
      const cancelled =
        typeof e === 'object' && e !== null && 'userCancelled' in e && (e as { userCancelled?: boolean }).userCancelled;
      if (!cancelled) {
        Alert.alert('エラー', '購入処理に失敗しました。時間をおいて再度お試しください。');
      }
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        setPremium(true);
        Alert.alert('復元しました', 'プレミアムが有効になりました。');
        router.back();
      } else {
        Alert.alert('購入が見つかりません', '復元できる購入履歴がありませんでした。');
      }
    } catch {
      Alert.alert('エラー', '購入の復元に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const annualPlan = plans.find((p) => p.period === 'annual');
  const monthlyPlan = plans.find((p) => p.period === 'monthly');

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}>

      {/* ヘッダー */}
      <Text style={styles.hero}>⭐️</Text>
      <Text style={[styles.title, { color: c.text }]}>ココロコーチ プレミアム</Text>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>
        習慣と気分を分析して、あなただけのパターンを発見。
      </Text>

      {/* 機能リスト */}
      <View style={[styles.featuresCard, { backgroundColor: c.card, borderColor: c.border }]}>
        {FEATURES.map((f, i) => (
          <View
            key={f.text}
            style={[
              styles.featureRow,
              i < FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
            ]}>
            <View style={[styles.featureIconWrap, { backgroundColor: c.primarySoft }]}>
              <Ionicons name={f.icon} size={18} color={c.primary} />
            </View>
            <View style={styles.featureBody}>
              <Text style={[styles.featureText, { color: c.text }]}>{f.text}</Text>
              <Text style={[styles.featureSub, { color: c.textSecondary }]}>{f.sub}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={c.success} />
          </View>
        ))}
      </View>

      {/* プラン選択 */}
      <View style={styles.plans}>
        {/* 年額（推奨） */}
        {annualPlan && (
          <Pressable
            onPress={() => setSelected(annualPlan.id)}
            style={[
              styles.plan,
              styles.planAnnual,
              {
                backgroundColor: selected === annualPlan.id ? c.primarySoft : c.card,
                borderColor: selected === annualPlan.id ? c.primary : c.border,
              },
            ]}>
            <View style={[styles.recommendBadge, { backgroundColor: c.primary }]}>
              <Text style={styles.recommendText}>7日間無料体験 · おすすめ</Text>
            </View>
            <View style={styles.planHeader}>
              <Text style={[styles.planTitle, { color: c.text }]}>{annualPlan.title}</Text>
              <View style={[styles.saveBadge, { backgroundColor: c.accent }]}>
                <Text style={styles.saveBadgeText}>34%おトク</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, { color: c.text }]}>{annualPlan.priceString}</Text>
            {annualPlan.monthlyEquivalent && (
              <Text style={[styles.planMonthly, { color: c.primary }]}>
                {annualPlan.monthlyEquivalent}
              </Text>
            )}
          </Pressable>
        )}

        {/* 月額 */}
        {monthlyPlan && (
          <Pressable
            onPress={() => setSelected(monthlyPlan.id)}
            style={[
              styles.plan,
              {
                backgroundColor: selected === monthlyPlan.id ? c.primarySoft : c.card,
                borderColor: selected === monthlyPlan.id ? c.primary : c.border,
              },
            ]}>
            <View style={styles.planHeader}>
              <Text style={[styles.planTitle, { color: c.text }]}>{monthlyPlan.title}</Text>
            </View>
            <Text style={[styles.planPrice, { color: c.text }]}>{monthlyPlan.priceString}</Text>
          </Pressable>
        )}
      </View>

      {/* CTA */}
      <PrimaryButton
        label={selected === annualPlan?.id ? '7日間無料で試す' : 'プレミアムをはじめる'}
        onPress={onPurchase}
        loading={busy}
        disabled={!selected}
        style={styles.cta}
      />

      <Pressable onPress={onRestore} disabled={busy}>
        <Text style={[styles.restore, { color: c.primary }]}>購入を復元する</Text>
      </Pressable>

      {/* 法務 */}
      <Text style={[styles.legal, { color: c.textSecondary }]}>
        お支払いはGoogleアカウント(Google Play)に請求されます。{'\n'}サブスクリプションは期間終了前に解約しない限り自動更新されます。{'\n'}購入後はGoogle Playのアカウント設定からいつでも管理・解約できます。
      </Text>
      <View style={styles.legalLinks}>
        <Pressable onPress={() => router.push('/legal?type=terms')}>
          <Text style={[styles.legalLink, { color: c.textSecondary }]}>利用規約</Text>
        </Pressable>
        <Text style={{ color: c.textSecondary }}> · </Text>
        <Pressable onPress={() => router.push('/legal?type=privacy')}>
          <Text style={[styles.legalLink, { color: c.textSecondary }]}>プライバシーポリシー</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, alignItems: 'stretch' },

  // ヘッダー
  hero: { fontSize: 48, textAlign: 'center', marginTop: Spacing.md },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: Spacing.sm },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: Spacing.xs, lineHeight: 20, marginBottom: Spacing.lg },

  // 機能リスト
  featuresCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBody: { flex: 1 },
  featureText: { fontSize: 14, fontWeight: '600' },
  featureSub: { fontSize: 11, marginTop: 1 },

  // プラン
  plans: { gap: Spacing.sm, marginBottom: Spacing.md },
  plan: {
    borderWidth: 2,
    borderRadius: Radius.md,
    padding: Spacing.md,
    position: 'relative',
  },
  planAnnual: { paddingTop: Spacing.lg + 4 },
  recommendBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 3,
    borderTopLeftRadius: Radius.md - 2,
    borderTopRightRadius: Radius.md - 2,
  },
  recommendText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  planTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  saveBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  saveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  planPrice: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  planMonthly: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  // CTA
  cta: { marginTop: Spacing.sm },
  restore: {
    textAlign: 'center',
    marginTop: Spacing.md,
    fontSize: 14,
    fontWeight: '600',
  },

  // 法務
  legal: { fontSize: 11, lineHeight: 16, marginTop: Spacing.lg },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  legalLink: { fontSize: 11, textDecorationLine: 'underline' },
});
