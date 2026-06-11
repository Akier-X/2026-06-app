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

利用規約・プライバシーポリシーは **`docs/legal/terms.html` / `docs/legal/privacy.html` に作成済み**。

1. GitHubリポジトリの Settings → Pages → Source を「Deploy from a branch」/ ブランチ `main`・フォルダ `/docs` に設定
2. 公開URL(`https://akier-x.github.io/2026-06-app/legal/terms.html` 等)が `src/constants/legal.ts` に設定済み。リポジトリ名やドメインを変える場合はここを更新
3. App Store Connect の「Appのプライバシー」でデータ収集を申告(申告内容のドラフトは `docs/store-listing.md` 参照)

## 4. サーバーのデプロイ(任意・フィードバック収集に推奨)

**AIコーチはデフォルトでローカルエンジンのためサーバーなしでもリリース可能。**
サーバーはユーザーフィードバックの収集先として推奨(未設定時はメール送信にフォールバック)。

`server/Dockerfile` 作成済み。Dockerが動くホスティング(Railway / Render / Fly.io等)にそのままデプロイできる。

```bash
# 例: Railway
railway init && railway up
railway variables set COACH_APP_TOKEN=<ランダム文字列> ADMIN_TOKEN=<別のランダム文字列>
# Claude接続を使う場合のみ: railway variables set ANTHROPIC_API_KEY=sk-ant-...
```

- 取得したURLをビルド時に `EXPO_PUBLIC_COACH_API_URL` として注入
- `COACH_APP_TOKEN` はアプリ側 `EXPO_PUBLIC_COACH_APP_TOKEN` に同じ値を設定(クライアント実装済み)
- フィードバックは `data/feedback.jsonl` に保存されるため、永続ボリュームを割り当てる
- 取得は `node scripts/fetch-feedback.mjs`(`ADMIN_TOKEN` 使用)。分析手順は `CLAUDE.md` 参照
- Claude接続を有効化する場合のみAPI原価が発生。無料ユーザーの回数制限(5通/日)は必ず維持する

## 5. ビルドと提出

`eas.json` は作成済み(development / preview / production の3プロファイル)。

```bash
# EASプロジェクトを紐付け (app.jsonにprojectIdが書き込まれる)
eas init

# 環境変数を EAS に登録 (production環境)
eas env:create --environment production --name EXPO_PUBLIC_RC_IOS_KEY --value appl_xxxx
eas env:create --environment production --name EXPO_PUBLIC_COACH_API_URL --value https://your-server.example.com
eas env:create --environment production --name EXPO_PUBLIC_COACH_APP_TOKEN --value <サーバーと同じ値>

# 本番ビルド & 提出
eas build --platform ios --profile production
eas submit --platform ios   # eas.json の ascAppId を事前に設定
```

TestFlightで以下を必ず確認:

- [ ] サンドボックスアカウントで月額/年額の購入が完了し、プレミアムが解放される
- [ ] 「購入を復元」が機能する
- [ ] AIコーチが応答する(ローカルエンジン: 機内モードでも動作するはず)
- [ ] 「ご意見・お問い合わせ」の送信が成功する(サーバー設定時)/ メールが開く(未設定時)

## 6. 審査チェックリスト(リジェクト頻出ポイント)

- [ ] ペイウォールに自動更新条件・価格・期間を明記(実装済み)
- [ ] 利用規約 / プライバシーポリシーのリンクがペイウォールにある(実装済み、URL差し替え必須)
- [ ] 復元ボタンがある(実装済み)
- [ ] コーチ応答について: 端末内ルールベースエンジンで生成され外部送信なし・危機的な入力には相談窓口を案内する旨を審査メモに記載(文面は `docs/store-listing.md`)
- [ ] 医療アプリではないこと(診断・治療をしない)を審査メモに明記
- [ ] デモアカウント不要(ログインなし設計)である旨を審査メモに記載

## 7. 公開後の運用

- RevenueCatダッシュボードでMRR / 解約率 / トライアル転換率を監視
- 価格テスト・無料トライアル(7日)の追加はApp Store Connect + RevenueCat Offeringで実施可能
- ASO: 「習慣化」「セルフケア」「AIコーチ」「メンタルケア」等のキーワードを継続調整
