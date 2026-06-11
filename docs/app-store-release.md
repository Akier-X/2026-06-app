# App Store リリース手順

ココロコーチをサブスクリプション付きでApp Storeに公開するまでの実務手順。

## 0. 前提

- Apple Developer Program(年額 ¥12,800 程度)に加入済み
- [RevenueCat](https://www.revenuecat.com/) アカウント(無料枠: 月間トラッキング収益 $2,500 まで)
- [EAS](https://expo.dev/eas) アカウント(`npm i -g eas-cli && eas login`)

## 1. App Store Connect の準備

1. **App ID作成**: Certificates, Identifiers & Profiles で `com.akierx.kokorocoach` を登録(`app.json` の `bundleIdentifier` と一致させる)
2. **アプリ作成**: App Store Connect → マイアプリ → 新規アプリ(プライマリ言語: 日本語)
3. **サブスクリプション商品を作成**:
   - サブスクリプショングループ: `Premium`
   - 商品1: `kokoro_premium_monthly` — 月額 ¥480
   - 商品2: `kokoro_premium_annual` — 年額 ¥3,800
   - 各商品にローカライズ(表示名・説明)と審査用メモを設定
4. **App Store Server Notifications**: RevenueCatのURLを設定(RevenueCatダッシュボードに表示される)
5. **Paid Apps契約**: 契約/税金/口座情報をすべて完了させる(未完了だとサンドボックス購入も失敗する)

## 2. RevenueCat の設定

1. プロジェクト作成 → iOSアプリを追加(Bundle ID: `com.akierx.kokorocoach`)
2. App Store Connect の **In-App Purchase Key (.p8)** をアップロード
3. **Products**: 上記2商品をインポート
4. **Entitlement**: `premium` を作成し、両商品を紐付け(コード内 `PREMIUM_ENTITLEMENT` と一致)
5. **Offering**: `default` に `monthly` / `annual` パッケージとして登録
6. **Public API Key** (`appl_...`) を控える → ビルド時に `EXPO_PUBLIC_RC_IOS_KEY` として注入

## 3. 法務ページ(審査必須)

- 利用規約(EULA)とプライバシーポリシーをWebに公開(GitHub Pages / Notion公開ページでも可)
- 差し替え箇所: `src/app/paywall.tsx` と `src/app/(tabs)/settings.tsx` の `TERMS_URL` / `PRIVACY_URL`
- App Store Connect の「Appのプライバシー」でデータ収集を申告
  - チャット内容を外部サーバー(自前プロキシ→Anthropic)へ送信するため「ユーザーコンテンツ」の申告が必要

## 4. サーバーのデプロイ

```bash
# 例: Railway
railway init && railway up
railway variables set ANTHROPIC_API_KEY=sk-ant-... COACH_APP_TOKEN=<ランダム文字列>
```

- 取得したURLをビルド時に `EXPO_PUBLIC_COACH_API_URL` として注入
- 本番では `COACH_APP_TOKEN` を設定し、`src/lib/coach.ts` のfetchにヘッダーを追加することを推奨
- Anthropicの利用料が原価になるため、無料ユーザーの回数制限(実装済み: 5通/日)は必ず維持する

## 5. ビルドと提出

```bash
# eas.json を生成
eas build:configure

# 環境変数を EAS に登録
eas env:create --name EXPO_PUBLIC_RC_IOS_KEY --value appl_xxxx
eas env:create --name EXPO_PUBLIC_COACH_API_URL --value https://your-server.example.com

# 本番ビルド & 提出
eas build --platform ios --profile production
eas submit --platform ios
```

TestFlightで以下を必ず確認:

- [ ] サンドボックスアカウントで月額/年額の購入が完了し、プレミアムが解放される
- [ ] 「購入を復元」が機能する
- [ ] AIコーチが応答する(本番サーバー経由)
- [ ] 機内モードでもクラッシュしない(チャットはエラーメッセージ表示)

## 6. 審査チェックリスト(リジェクト頻出ポイント)

- [ ] ペイウォールに自動更新条件・価格・期間を明記(実装済み)
- [ ] 利用規約 / プライバシーポリシーのリンクがペイウォールにある(実装済み、URL差し替え必須)
- [ ] 復元ボタンがある(実装済み)
- [ ] AI生成コンテンツについて: 不適切な内容を返さない仕組み(システムプロンプト + Anthropicのセーフティ)を審査メモに記載
- [ ] 医療アプリではないこと(診断・治療をしない)を審査メモに明記
- [ ] デモアカウント不要(ログインなし設計)である旨を審査メモに記載

## 7. 公開後の運用

- RevenueCatダッシュボードでMRR / 解約率 / トライアル転換率を監視
- 価格テスト・無料トライアル(7日)の追加はApp Store Connect + RevenueCat Offeringで実施可能
- ASO: 「習慣化」「セルフケア」「AIコーチ」「メンタルケア」等のキーワードを継続調整
