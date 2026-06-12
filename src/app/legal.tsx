import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing, useThemeColors } from '@/constants/theme';

const TERMS_CONTENT = {
  title: 'ココロコーチ 利用規約',
  updated: '最終更新日: 2026年6月11日',
  sections: [
    {
      heading: null,
      body: '本利用規約(以下「本規約」)は、本アプリ「ココロコーチ」(以下「本アプリ」)の利用条件を定めるものです。ユーザーは本アプリを利用することにより、本規約に同意したものとみなされます。',
    },
    {
      heading: '第1条(サービス内容)',
      body: '本アプリは、習慣トラッキング、気分記録、およびAIによるセルフケア支援チャット(以下「AIコーチ」)を提供します。',
    },
    {
      heading: '第2条(AIコーチに関する重要事項)',
      body: 'AIコーチの応答は人工知能により自動生成されるものであり、その正確性・完全性を保証するものではありません。本アプリは医療機器ではなく、医療行為、診断、治療、カウンセリングを提供するものではありません。心身の不調がある場合は、医師等の専門家にご相談ください。',
    },
    {
      heading: '第3条(サブスクリプション)',
      items: [
        'プレミアム機能は、自動更新サブスクリプション(月額または年額)として提供されます。',
        '料金はご利用のGoogleアカウント(Google Play)に請求されます。',
        'サブスクリプションは、現在の期間が終了する前に解約しない限り自動的に更新されます。',
        '解約・管理は、購入後にGoogle Playのアカウント設定からいつでも行えます。',
        '適用される法令に定めがある場合を除き、支払い済みの料金は返金されません。',
      ],
    },
    {
      heading: '第4条(禁止事項)',
      body: 'ユーザーは、法令または公序良俗に違反する行為、本アプリの運営を妨害する行為、リバースエンジニアリング、AIコーチへの不正な入力により有害な出力を引き出そうとする行為をしてはなりません。',
    },
    {
      heading: '第5条(知的財産権)',
      body: '本アプリに関する知的財産権は、運営者または正当な権利者に帰属します。',
    },
    {
      heading: '第6条(免責事項)',
      body: '運営者は、本アプリの利用により生じた損害について、運営者の故意または重過失による場合を除き、責任を負いません。本アプリの提供は予告なく変更・中断・終了することがあります。',
    },
    {
      heading: '第7条(規約の変更)',
      body: '運営者は、必要と判断した場合、本規約を変更できるものとします。重要な変更がある場合は、アプリ内等で告知します。',
    },
    {
      heading: '第8条(準拠法・裁判管轄)',
      body: '本規約は日本法に準拠し、本アプリに関する紛争については、運営者の所在地を管轄する裁判所を専属的合意管轄とします。',
    },
  ],
};

const PRIVACY_CONTENT = {
  title: 'ココロコーチ プライバシーポリシー',
  updated: '最終更新日: 2026年6月11日',
  sections: [
    {
      heading: null,
      body: '本アプリ「ココロコーチ」における利用者情報の取り扱いについて説明します。',
    },
    {
      heading: '1. 取得する情報と保存場所',
      table: [
        { info: 'ニックネーム・目標・習慣・気分の記録', storage: '端末内のみ', purpose: 'アプリ機能の提供' },
        { info: 'コーチ機能とのチャット内容', storage: '端末内のみ(外部送信なし)', purpose: 'コーチ応答の生成(端末内で処理)' },
        { info: 'お問い合わせ・ご意見の内容(任意で返信先メールアドレス)', storage: '当社サーバー', purpose: 'お問い合わせ対応・アプリの改善' },
        { info: '購入情報(匿名ID)', storage: 'RevenueCat / Google', purpose: 'サブスクリプションの管理' },
      ],
    },
    {
      heading: '2. アカウント登録について',
      body: '本アプリの利用にアカウント登録は不要です。お問い合わせ時に任意で入力いただく返信先メールアドレスを除き、氏名・メールアドレス等の連絡先情報を取得することはありません。',
    },
    {
      heading: '3. コーチ機能について',
      body: 'コーチ機能の応答は端末内で生成され、チャット内容が外部に送信されることはありません。',
    },
    {
      heading: '4. 第三者サービス',
      items: [
        'RevenueCat(課金管理): revenuecat.com/privacy にプライバシーポリシーを公開',
        'Google Play(決済処理)',
      ],
    },
    {
      heading: '5. データの削除',
      body: '端末内のデータは、アプリ内「設定 → データを初期化」またはアプリの削除によりいつでも削除できます。',
    },
    {
      heading: '6. 児童のプライバシー',
      body: '本アプリは13歳未満の児童を対象としていません。',
    },
    {
      heading: '7. ポリシーの変更',
      body: '本ポリシーを変更する場合は、本ページにて告知します。',
    },
  ],
};

type Section = {
  heading: string | null;
  body?: string;
  items?: string[];
  table?: { info: string; storage: string; purpose: string }[];
};

function LegalSection({ section, colors }: { section: Section; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={styles.section}>
      {section.heading && (
        <Text style={[styles.heading, { color: colors.text }]}>{section.heading}</Text>
      )}
      {section.body && (
        <Text style={[styles.body, { color: colors.text }]}>{section.body}</Text>
      )}
      {section.items?.map((item, i) => (
        <View key={i} style={styles.listItem}>
          <Text style={[styles.bullet, { color: colors.text }]}>{i + 1}. </Text>
          <Text style={[styles.body, { color: colors.text, flex: 1 }]}>{item}</Text>
        </View>
      ))}
      {section.table?.map((row, i) => (
        <View key={i} style={[styles.tableRow, { borderColor: colors.textSecondary + '40' }]}>
          <Text style={[styles.tableCell, styles.tableCellBold, { color: colors.text }]}>{row.info}</Text>
          <Text style={[styles.tableCell, { color: colors.textSecondary }]}>保存: {row.storage}</Text>
          <Text style={[styles.tableCell, { color: colors.textSecondary }]}>目的: {row.purpose}</Text>
        </View>
      ))}
    </View>
  );
}

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const c = useThemeColors();
  const content = type === 'privacy' ? PRIVACY_CONTENT : TERMS_CONTENT;

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: c.text }]}>{content.title}</Text>
      <Text style={[styles.updated, { color: c.textSecondary }]}>{content.updated}</Text>
      {content.sections.map((section, i) => (
        <LegalSection key={i} section={section as Section} colors={c} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: Spacing.xs },
  updated: { fontSize: 12, marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  heading: { fontSize: 15, fontWeight: '700', marginBottom: Spacing.xs },
  body: { fontSize: 14, lineHeight: 22 },
  listItem: { flexDirection: 'row', marginBottom: 4 },
  bullet: { fontSize: 14, lineHeight: 22 },
  tableRow: {
    borderWidth: 1,
    borderRadius: 6,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tableCell: { fontSize: 13, lineHeight: 20 },
  tableCellBold: { fontWeight: '600', marginBottom: 2 },
});
