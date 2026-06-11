import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/ui';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { Radius, Spacing, useThemeColors } from '@/constants/theme';
import {
  fetchPlans,
  purchasePlan,
  restorePurchases,
  type PlanOption,
} from '@/lib/purchases';
import { useAppStore } from '@/store/useAppStore';

const FEATURES = [
  { emoji: '♾️', text: '習慣を無制限に登録' },
  { emoji: '💬', text: 'AIコーチと無制限にチャット' },
  { emoji: '📊', text: '詳細な統計とふりかえり' },
  { emoji: '🌙', text: '今後の新機能もすべて利用可能' },
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
      // RevenueCat throws with userCancelled=true when the user closes the sheet.
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

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}>
      <Text style={styles.hero}>⭐️</Text>
      <Text style={[styles.title, { color: c.text }]}>ココロコーチ プレミアム</Text>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>
        習慣づくりを、もっと自由に。
      </Text>

      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.text} style={styles.featureRow}>
            <Text style={styles.featureEmoji}>{f.emoji}</Text>
            <Text style={[styles.featureText, { color: c.text }]}>{f.text}</Text>
          </View>
        ))}
      </View>

      {plans.map((p) => {
        const isSelected = selected === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => setSelected(p.id)}
            style={[
              styles.plan,
              {
                backgroundColor: isSelected ? c.primarySoft : c.card,
                borderColor: isSelected ? c.primary : c.border,
              },
            ]}>
            <View style={styles.planHeader}>
              <Text style={[styles.planTitle, { color: c.text }]}>{p.title}</Text>
              {p.period === 'annual' && (
                <View style={[styles.badge, { backgroundColor: c.accent }]}>
                  <Text style={styles.badgeText}>34%おトク</Text>
                </View>
              )}
            </View>
            <Text style={[styles.planPrice, { color: c.textSecondary }]}>{p.priceString}</Text>
          </Pressable>
        );
      })}

      <PrimaryButton
        label="プレミアムをはじめる"
        onPress={onPurchase}
        loading={busy}
        disabled={!selected}
        style={styles.cta}
      />

      <Pressable onPress={onRestore} disabled={busy}>
        <Text style={[styles.restore, { color: c.primary }]}>購入を復元する</Text>
      </Pressable>

      <Text style={[styles.legal, { color: c.textSecondary }]}>
        お支払いはApple IDアカウントに請求されます。サブスクリプションは期間終了の24時間前までに解約しない限り自動更新され、更新料金は期間終了前の24時間以内に請求されます。購入後はApp Storeのアカウント設定からいつでも管理・解約できます。
      </Text>
      <View style={styles.legalLinks}>
        <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
          <Text style={[styles.legalLink, { color: c.textSecondary }]}>利用規約</Text>
        </Pressable>
        <Text style={{ color: c.textSecondary }}> · </Text>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
          <Text style={[styles.legalLink, { color: c.textSecondary }]}>プライバシーポリシー</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, alignItems: 'stretch' },
  hero: { fontSize: 48, textAlign: 'center', marginTop: Spacing.md },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: Spacing.sm },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: Spacing.xs },
  features: { marginVertical: Spacing.lg, gap: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featureEmoji: { fontSize: 20 },
  featureText: { fontSize: 15, fontWeight: '600' },
  plan: {
    borderWidth: 2,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  planTitle: { fontSize: 16, fontWeight: '700' },
  badge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  planPrice: { fontSize: 14, marginTop: Spacing.xs },
  cta: { marginTop: Spacing.md },
  restore: {
    textAlign: 'center',
    marginTop: Spacing.md,
    fontSize: 14,
    fontWeight: '600',
  },
  legal: { fontSize: 11, lineHeight: 16, marginTop: Spacing.lg },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  legalLink: { fontSize: 11, textDecorationLine: 'underline' },
});
