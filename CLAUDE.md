# ココロコーチ — Claude Code向けガイド

AI習慣化・セルフケアコーチのiOSアプリ(Expo / React Native / TypeScript)。
サブスク収益化(RevenueCat、月額¥480 / 年額¥3,800)。日本市場向け・UIは日本語。

## コマンド

```bash
npm install            # 依存関係
npx expo start         # 開発起動 (Expo Go: 課金モック・AIコーチはローカルエンジン)
npx tsc --noEmit       # 型チェック (CIでも実行)
cd server && npm start # フィードバック収集/AIプロキシサーバー (任意)
```

## 構成の要点

- 画面: `src/app/` (Expo Router)。タブ4つ + モーダル(paywall / add-habit / feedback)
- 状態: `src/store/useAppStore.ts` (Zustand + AsyncStorage永続化)。フリーミアム制限もここ
  - 無料制限: 習慣 `FREE_HABIT_LIMIT`=3 / AIコーチ `FREE_DAILY_COACH_MESSAGES`=5通/日
- 課金: `src/lib/purchases.ts`。Expo Go/Webではモック。Entitlement名は `premium`
- AIコーチ: `src/lib/coach.ts`。**デフォルトはAPIキー不要のローカルエンジン**(`src/lib/localCoach.ts`)。
  `EXPO_PUBLIC_COACH_API_URL` を設定した場合のみ `server/` 経由でClaudeを使う(任意)
- 法務URL: `src/constants/legal.ts` に集約

## フィードバック駆動アップデート(次回セッションの定型タスク)

ユーザーの問い合わせ・意見はアプリ内「設定 → ご意見・お問い合わせ」から
サーバーの `data/feedback.jsonl` に構造化保存される(カテゴリ: bug / idea / question / other)。

次回アップデートを計画するときの手順:

1. フィードバックを取得:
   `COACH_API_URL=... ADMIN_TOKEN=... node scripts/fetch-feedback.mjs`
   → `feedback-export/feedback.jsonl` と `summary.md` が生成される
2. `feedback-export/feedback.jsonl` を読み、以下に分類する:
   - **bug**: 再現手順を推定し、修正PRの候補に(最優先)
   - **idea**: 重複をまとめて要望数順にランキング。収益(転換率・継続率)への寄与で優先度付け
   - **question**: FAQ化やUI改善のヒントとして扱う
3. 上位項目を実装計画にまとめてユーザーに提示してから着手する
4. `feedback-export/` はgitignore済み(個人情報を含みうるためコミットしない)

## 規約

- コミットメッセージ・UI文言は日本語
- 型チェック(`npx tsc --noEmit`)が通ることを確認してからコミット
- 法務ページ(`docs/legal/*.html`)を変更したら「最終更新日」を更新
- リリース作業は `docs/app-store-release.md` の手順に従う
