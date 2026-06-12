# /update-docs — ドキュメント整合性チェック & 更新

ソースコードを正とし、`/docs` 以下のドキュメントと `APP.md` を最新状態に同期する。

## 実行手順

### 1. 現状把握（コードを読む）

以下のファイルを必ず確認してから更新に入る:

```bash
# フリーミアム制限
grep -n "FREE_HABIT_LIMIT\|FREE_DAILY_COACH_MESSAGES" src/store/useAppStore.ts

# 広告ID
cat src/constants/ads.ts

# RevenueCat エンティトルメント名
grep -n "PREMIUM_ENTITLEMENT\|RC_API_KEY" src/lib/purchases.ts

# ペイウォールの現在の価格・特典表示
cat src/app/paywall.tsx

# アプリID / パッケージ名
cat app.json
```

### 2. ドキュメントの更新対象

| ファイル | 確認ポイント |
| --- | --- |
| `docs/monetization.md` | 価格・フリーミアム制限・収益の柱・ロードマップ |
| `docs/admob-setup.md` | 広告ユニット数・配置場所・本番ID設定状態 |
| `docs/store-listing.md` | 機能リスト・プレミアム説明・スクリーンショット計画 |
| `docs/app-store-release.md` | リリース手順・プラットフォーム（Android-first）・チェックリスト |
| `APP.md` | v1.0チェックリスト・v1.1計画・更新履歴 |

### 3. APP.md 更新履歴の追記ルール

実装をコミットしたら、`APP.md` の `## 更新履歴` に以下の形式で追記する:

```markdown
### YYYY-MM-DD（第N回アップデート）— 変更の一言要約

変更の目的・背景（1〜2文）

1. **`変更ファイル`** → 変更内容
2. ...
```

更新履歴は**新しいものを上**に追記する。

### 4. よくある陳腐化パターン

- 「将来実装予定」と書いてあるが実は実装済み → 現在形に更新
- テストIDのまま運用記録されている → 本番ID設定済みなら反映
- iOS向け手順が混在している（このアプリはAndroid-first）→ Google Play向けに修正
- 機能リストに新機能が漏れている（年間レポート・詳細分析・アーカイブ等）

### 5. 完了後

```bash
npx tsc --noEmit  # 型エラーがないことを確認（コード変更した場合）
git add docs/ APP.md
git commit -m "docs: ドキュメントをコードの現状に同期"
```
