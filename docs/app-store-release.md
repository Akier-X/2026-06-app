# Google Play リリース手順

ココロコーチをサブスクリプション付きで Google Play に公開するまでの実務手順。

> **プラットフォーム**: Android-first（iOS対応は将来検討）

---

## 0. 前提

- Google Play Console アカウント（初回登録料 $25）
- [RevenueCat](https://www.revenuecat.com/) アカウント（無料枠: 月間トラッキング収益 $2,500 まで）
- [EAS](https://expo.dev/eas) アカウント（`npm i -g eas-cli && eas login`）

---

## 1. Google Play Console の準備

1. **アプリ作成**: Google Play Console → 「アプリを作成」
   - アプリ名: `ココロコーチ`
   - パッケージ名: `com.akierx.kokorocoach`（`app.json` の `android.package` と一致）
2. **サブスクリプション商品を作成**:
   - 定期購入グループ: `Premium`
   - 商品1: `kokoro_premium_monthly` — 月額 ¥480（1ヶ月）
   - 商品2: `kokoro_premium_annual` — 年額 ¥3,800（1年）
   - 各商品に7日間無料トライアル（年額のみ）を設定
3. **支払いプロファイル**: 銀行口座・税務情報を完了させる（未完了だとテスト購入も失敗する）
4. **Google Play Server Notifications**: RevenueCatのURLをリアルタイム通知欄に設定

---

## 2. RevenueCat の設定

1. プロジェクト作成 → Androidアプリを追加（Package: `com.akierx.kokorocoach`）
2. Google Play の **サービスアカウントキー (.json)** をアップロード
3. **Products**: 上記2商品をインポート
4. **Entitlement**: `premium` を作成し、両商品を紐付け（コード内 `PREMIUM_ENTITLEMENT` と一致）
5. **Offering**: `default` に `monthly` / `annual` パッケージとして登録
6. **Public API Key** (`goog_...`) を控える → ビルド時に `EXPO_PUBLIC_RC_ANDROID_KEY` として注入

---

## 3. 法務ページ（審査必須）

利用規約・プライバシーポリシーは **`docs/legal/terms.html` / `docs/legal/privacy.html` に作成済み**。

1. GitHub Pages で公開: Settings → Pages → Source を `main` ブランチ・`/docs` フォルダに設定
2. 公開URL（`https://akier-x.github.io/2026-06-app/legal/terms.html` 等）が `src/constants/legal.ts` に設定済み
3. Google Play Console の「アプリのコンテンツ」→「プライバシーポリシー」にURLを登録

---

## 4. サーバーのデプロイ（任意・フィードバック収集に推奨）

**AIコーチはデフォルトでローカルエンジンのためサーバーなしでもリリース可能。**
サーバーはユーザーフィードバックの収集先として推奨（未設定時はメール送信にフォールバック）。

`server/Dockerfile` 作成済み。Dockerが動くホスティング（Railway / Render / Fly.io等）にそのままデプロイできる。

```bash
# 例: Railway
railway init && railway up
railway variables set COACH_APP_TOKEN=<ランダム文字列> ADMIN_TOKEN=<別のランダム文字列>
# Claude接続を使う場合のみ: railway variables set ANTHROPIC_API_KEY=sk-ant-...
```

- 取得したURLをビルド時に `EXPO_PUBLIC_COACH_API_URL` として注入
- `COACH_APP_TOKEN` はアプリ側 `EXPO_PUBLIC_COACH_APP_TOKEN` に同じ値を設定
- フィードバックは `data/feedback.jsonl` に保存されるため、永続ボリュームを割り当てる
- 取得は `node scripts/fetch-feedback.mjs`（`ADMIN_TOKEN` 使用）。分析手順は `CLAUDE.md` 参照

---

## 5. AdMob の設定

広告ユニットは `src/constants/ads.ts` に管理。

- アプリID・バナー・リワードは**本番ID設定済み**
- インタースティシャルのみテストID → **リリース前に本番IDへ差し替えが必要**

詳細手順: `docs/admob-setup.md` 参照

---

## 6. ビルドと提出

`eas.json` は作成済み（development / preview / production の3プロファイル）。

```bash
# EASプロジェクトを紐付け
eas init

# 環境変数を EAS に登録 (production環境)
eas env:create --environment production --name EXPO_PUBLIC_RC_ANDROID_KEY --value goog_xxxx
eas env:create --environment production --name EXPO_PUBLIC_COACH_API_URL --value https://your-server.example.com
eas env:create --environment production --name EXPO_PUBLIC_COACH_APP_TOKEN --value <サーバーと同じ値>

# 本番ビルド
eas build --platform android --profile production

# Google Play に提出（内部テストトラック）
eas submit --platform android
```

内部テストトラックで以下を必ず確認:

- [ ] テストアカウントで月額/年額の購入が完了し、プレミアムが解放される
- [ ] 年額の「7日間無料体験」が正しく動作する
- [ ] 「購入を復元」が機能する
- [ ] AIコーチが応答する（ローカルエンジン: 機内モードでも動作するはず）
- [ ] 「ご意見・お問い合わせ」の送信が成功する（サーバー設定時）/ メールが開く（未設定時）
- [ ] AdMobの広告が表示される（本番ビルドのみ確認可能）

---

## 7. 審査チェックリスト（リジェクト頻出ポイント）

- [ ] ペイウォールに自動更新条件・価格・期間を明記（実装済み）
- [ ] 利用規約 / プライバシーポリシーのリンクがペイウォールにある（実装済み、URL差し替え必須）
- [ ] 復元ボタンがある（実装済み）
- [ ] インタースティシャル広告IDを本番IDに差し替えた（`src/constants/ads.ts`）
- [ ] コーチ応答について: 端末内ルールベースエンジンで生成され外部送信なし・危機的な入力には相談窓口を案内する旨を審査メモに記載（文面は `docs/store-listing.md`）
- [ ] 医療アプリではないこと（診断・治療をしない）を審査メモに明記
- [ ] デモアカウント不要（ログインなし設計）である旨を審査メモに記載

---

## 8. 公開後の運用

- RevenueCatダッシュボードでMRR / 解約率 / トライアル転換率を監視
- AdMobダッシュボードで広告収益・eCPM・インプレッションを確認
- 価格テスト・無料トライアル変更はGoogle Play Console + RevenueCat Offeringで実施可能
- ASO: 「習慣化」「セルフケア」「AIコーチ」「メンタルケア」等のキーワードを継続調整
- フィードバック収集: `node scripts/fetch-feedback.mjs` で定期的に集計し、次バージョン計画に反映
