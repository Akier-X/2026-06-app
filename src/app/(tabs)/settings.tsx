import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Card, SectionTitle } from '@/components/ui';
import { Spacing, useThemeColors } from '@/constants/theme';
import { restorePurchases } from '@/lib/purchases';
import { useAppStore } from '@/store/useAppStore';

// TODO: 公開前に必ず実URLへ差し替える(App Store審査で必須)
const TERMS_URL = 'https://example.com/kokoro-coach/terms';
const PRIVACY_URL = 'https://example.com/kokoro-coach/privacy';

export default function SettingsScreen() {
  const c = useThemeColors();
  const isPremium = useAppStore((s) => s.isPremium);
  const setPremium = useAppStore((s) => s.setPremium);
  const resetAll = useAppStore((s) => s.resetAll);
  const [restoring, setRestoring] = useState(false);

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

  const onReset = () => {
    Alert.alert('データを初期化', 'すべての習慣・記録・チャット履歴を削除します。よろしいですか?', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除する', style: 'destructive', onPress: resetAll },
    ]);
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

      <SectionTitle>このアプリについて</SectionTitle>
      <Row icon="document-text-outline" label="利用規約" onPress={() => Linking.openURL(TERMS_URL)} />
      <Row
        icon="shield-checkmark-outline"
        label="プライバシーポリシー"
        onPress={() => Linking.openURL(PRIVACY_URL)}
      />

      <SectionTitle>データ</SectionTitle>
      <Row icon="trash-outline" label="データを初期化" onPress={onReset} danger />
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
});
