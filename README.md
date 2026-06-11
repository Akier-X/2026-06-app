# ココロコーチ (Kokoro Coach) 🌱

AI習慣化・セルフケアコーチアプリ。サブスクリプション(月額/年額)で収益化する iOS アプリです。

- **技術スタック**: Expo (React Native + TypeScript) / Expo Router / Zustand / RevenueCat
- **AIコーチ**: Claude (Anthropic API) — `server/` のプロキシ経由で安全に利用
- **市場**: 日本市場ファースト(UIは日本語)

## 機能

| 機能 | 無料 | プレミアム |
|---|---|---|
| 習慣トラッキング(連続日数・達成率) | 3つまで | 無制限 |
| 毎日の気分チェックイン | ✅ | ✅ |
| AIコーチチャット | 5通/日 | 無制限 |
| 週間統計・気分の推移 | ✅ | ✅ |

価格(想定): 月額 ¥480 / 年額 ¥3,800(約34%おトク)。詳細は [docs/monetization.md](docs/monetization.md)。

## プロジェクト構成

```
src/
  app/                # 画面 (Expo Router)
    (tabs)/           # 今日 / コーチ / きろく / 設定
    onboarding.tsx    # 初回オンボーディング
    paywall.tsx       # サブスク購入ペイウォール
    add-habit.tsx     # 習慣追加モーダル
  components/ui.tsx   # 共通UIコンポーネント
  constants/theme.ts  # カラーテーマ
  lib/
    coach.ts          # AIコーチAPIクライアント
    purchases.ts      # RevenueCatラッパー (Expo Goではモック動作)
    dates.ts          # 日付・ストリーク計算
  store/useAppStore.ts # 永続化ストア (Zustand + AsyncStorage)
server/               # AIコーチ用プロキシ (Node + Anthropic SDK, Dockerfile付き)
docs/
  app-store-release.md # リリース実務手順
  monetization.md      # 収益化戦略
  store-listing.md     # App Store掲載文ドラフト(コピペ用)
  legal/               # 利用規約・プライバシーポリシー (GitHub Pagesで公開)
eas.json              # EASビルド設定 (dev / preview / production)
```

## 開発の始め方

```bash
npm install
npx expo start        # Expo Goで起動 (課金はモック、AIコーチはデモ応答)
```

### AIコーチを本物のClaudeに接続する

```bash
cd server
cp .env.example .env  # ANTHROPIC_API_KEY を設定
npm install
npm start             # http://localhost:8787
```

アプリ側で接続先を指定:

```bash
EXPO_PUBLIC_COACH_API_URL=http://<あなたのIP>:8787 npx expo start
```

### サブスクリプション(RevenueCat)

`react-native-purchases` はネイティブビルドが必要です(Expo Goではモック課金で動作)。

```bash
EXPO_PUBLIC_RC_IOS_KEY=appl_xxxx eas build --profile development --platform ios
```

セットアップ手順は [docs/app-store-release.md](docs/app-store-release.md) を参照。

## リリースまでのロードマップ

1. **動作確認** — Expo Goでオンボーディング → 習慣登録 → チェックイン → ペイウォールの流れを確認
2. **法務ページを公開** — GitHub Pages (Settings → Pages → `main` / `/docs`) を有効化するだけ。URLは `src/constants/legal.ts` に設定済み
3. **サーバーをデプロイ** — `server/`(Dockerfile付き)を Railway / Render / Fly.io 等へ(`ANTHROPIC_API_KEY` を設定)
4. **App Store Connect でサブスク商品を作成** — `docs/app-store-release.md` の手順どおり
5. **RevenueCat を設定** — Entitlement `premium` / Offering に monthly & annual を登録
6. **EAS Build → TestFlight → 審査提出** — `eas.json` 設定済み。掲載文は `docs/store-listing.md` からコピペ

## 注意事項(App Store審査)

- ペイウォールには自動更新の説明文・利用規約・プライバシーポリシーへのリンクを表示済み(審査ガイドライン 3.1.2)
- 「購入を復元」ボタンを設置済み(必須)
- AIコーチは医療行為を行わない旨をシステムプロンプトで制御(ヘルスケア系審査対策)
