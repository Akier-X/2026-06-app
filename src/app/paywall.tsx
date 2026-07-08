import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, PrimaryButton } from '@/components/ui';
import { Radius, Shadows, Spacing, useThemeColors } from '@/constants/theme';
import { track } from '@/lib/analytics';
import {
  fetchPlans,
  purchasePlan,
  restorePurchases,
  type PlanOption,
} from '@/lib/purchases';
import { useAppStore } from '@/store/useAppStore';

const FEATURES = [
  { icon: 'infinite' as const, text: '習慣を無制限に登録', sub: '無料は3個まで' },
  { icon: 'chatbubble-ellipses' as const, text: 'AIコーチと無制限にチャット', sub: '無料は1日5回まで' },
  { icon: 'flower' as const, text: '花のテーマを解放', sub: '桜・菊・向日葵 — 今日の一輪と庭が着せ替わる' },
  { icon: 'analytics' as const, text: '気分×習慣の相関分析', sub: 'AIがあなただけのパターンを発見' },
  { icon: 'calendar' as const, text: '曜日別パターン分析', sub: '過去4週間のデータを解析' },
  { icon: 'sparkles' as const, text: '今後の新機能をすべて先行解放', sub: 'アップデートのたびにさらに便利に' },
];

export default function PaywallScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const setPremium = useAppStore((s) => s.setPremium);
  const { source } = useLocalSearchParams<{ source?: string }>();
  const paywallSource = source ?? 'unknown';

  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    track('paywall_view', { source: paywallSource });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        track('purchase_success', { plan: plan.period, source: paywallSource });
        Alert.alert('ようこそ!', 'プレミアムが有効になりました。');
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
        track('purchase_restore', { source: paywallSource });
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

  const PlanCard = ({
    plan,
    badge,
    saveLabel,
  }: {
    plan: PlanOption;
    badge?: string;
    saveLabel?: string;
  }) => {
    const isSelected = selected === plan.id;
    return (
      <PressableScale
        onPress={() => setSelected(plan.id)}
        style={[
          styles.plan,
          { backgroundColor: c.card, borderColor: isSelected ? c.primary : c.border },
          isSelected && Shadows.card,
          !!badge && styles.planWithBadge,
        ]}>
        {badge && (
          <View style={[styles.recommendBadge, { backgroundColor: c.primary }]}>
            <Text style={styles.recommendText}>{badge}</Text>
          </View>
        )}
        <View style={styles.planHeader}>
          <Ionicons
            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={isSelected ? c.primary : c.border}
          />
          <Text style={[styles.planTitle, { color: c.text }]}>{plan.title}</Text>
          {saveLabel && (
            <View style={[styles.saveBadge, { backgroundColor: c.accent }]}>
              <Text style={styles.saveBadgeText}>{saveLabel}</Text>
            </View>
          )}
        </View>
        <View style={styles.planPriceRow}>
          <Text style={[styles.planPrice, { color: c.text }]}>{plan.priceString}</Text>
          {plan.monthlyEquivalent && (
            <Text style={[styles.planMonthly, { color: c.primary }]}>
              {plan.monthlyEquivalent}
            </Text>
          )}
        </View>
      </PressableScale>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
    <ScrollView contentContainerStyle={styles.content}>

      {/* ヒーロー */}
      <LinearGradient
        colors={c.gradientWarm}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={[styles.heroCard, { paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.xl }]}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="sparkles" size={30} color="#FFE9C8" />
        </View>
        <Text style={styles.title}>ココロコーチ プレミアム</Text>
        <Text style={styles.subtitle}>
          続けた分だけ、あなたのパターンが見えてくる。{'\n'}セルフケアを次のレベルへ。
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* 機能リスト */}
        <View style={[styles.featuresCard, { backgroundColor: c.card }, Shadows.card]}>
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
          {annualPlan && (
            <PlanCard plan={annualPlan} badge="7日間無料体験 · おすすめ" saveLabel="34%おトク" />
          )}
          {monthlyPlan && <PlanCard plan={monthlyPlan} />}
        </View>

        {/* CTA */}
        <PrimaryButton
          label={selected === annualPlan?.id ? '7日間無料で試す' : 'プレミアムをはじめる'}
          onPress={onPurchase}
          loading={busy}
          disabled={!selected}
          style={styles.cta}
        />

        {/* 安心コピー */}
        <View style={styles.assureRow}>
          <Ionicons name="shield-checkmark" size={14} color={c.textSecondary} />
          <Text style={[styles.assureText, { color: c.textSecondary }]}>
            いつでも解約OK · 無料期間中の解約は料金がかかりません
          </Text>
        </View>

        <Pressable onPress={onRestore} disabled={busy}>
          <Text style={[styles.restore, { color: c.primary }]}>購入を復元する</Text>
        </Pressable>

        {/* 法務 */}
        <Text style={[styles.legal, { color: c.textTertiary }]}>
          お支払いはGoogleアカウント(Google Play)に請求されます。{'\n'}サブスクリプションは期間終了前に解約しない限り自動更新されます。{'\n'}購入後はGoogle Playのアカウント設定からいつでも管理・解約できます。
        </Text>
        <View style={styles.legalLinks}>
          <Pressable onPress={() => router.push('/legal?type=terms')}>
            <Text style={[styles.legalLink, { color: c.textTertiary }]}>利用規約</Text>
          </Pressable>
          <Text style={{ color: c.textTertiary }}> · </Text>
          <Pressable onPress={() => router.push('/legal?type=privacy')}>
            <Text style={[styles.legalLink, { color: c.textTertiary }]}>プライバシーポリシー</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>

    {/* 閉じるボタン */}
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      style={[styles.closeBtn, { top: insets.top > 0 ? insets.top + 4 : Spacing.md }]}>
      <Ionicons name="close" size={20} color="#fff" />
    </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.xl },

  // ヒーロー
  heroCard: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: Spacing.md, color: '#fff' },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.85)',
  },

  closeBtn: {
    position: 'absolute',
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { padding: Spacing.lg, marginTop: -Spacing.md },

  // 機能リスト
  featuresCard: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBody: { flex: 1 },
  featureText: { fontSize: 14, fontWeight: '700' },
  featureSub: { fontSize: 11, marginTop: 1 },

  // プラン
  plans: { gap: Spacing.sm, marginBottom: Spacing.md },
  plan: {
    borderWidth: 2,
    borderRadius: Radius.md,
    padding: Spacing.md,
    position: 'relative',
  },
  planWithBadge: { paddingTop: Spacing.lg + 8 },
  recommendBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 4,
    borderTopLeftRadius: Radius.md - 2,
    borderTopRightRadius: Radius.md - 2,
  },
  recommendText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  planTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  saveBadge: { borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  saveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginTop: 6,
    marginLeft: 22 + Spacing.sm,
  },
  planPrice: { fontSize: 19, fontWeight: '800' },
  planMonthly: { fontSize: 13, fontWeight: '700' },

  // CTA
  cta: { marginTop: Spacing.xs },
  assureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: Spacing.sm,
  },
  assureText: { fontSize: 11, fontWeight: '600' },
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
  },
  legalLink: { fontSize: 11, textDecorationLine: 'underline' },
});
