# AdMob 設定手順

本番リリース前に、テストIDを実際のAdMob IDに差し替える手順です。

---

## 1. AdMobアカウント作成

1. [admob.google.com](https://admob.google.com) にアクセス
2. Googleアカウントでサインイン → 「始める」

---

## 2. アプリを登録

1. 左メニュー「アプリ」→「アプリを追加」
2. 「Google Playで公開していますか？」→「いいえ」（初回は未公開のため）
3. プラットフォーム: **Android** を選択
4. アプリ名: `ココロコーチ`
5. 「アプリを追加」→ **アプリID** をコピー（`ca-app-pub-XXXX~XXXX` 形式）

---

## 3. 広告ユニットを作成

### バナー広告（きろくタブ）

1. 左メニュー「アプリ」→「ココロコーチ」→「広告ユニット」→「追加」
2. 「バナー」を選択
3. 名前: `stats_banner`
4. 作成 → **広告ユニットID** をコピー（`ca-app-pub-XXXX/XXXX` 形式）

### リワード広告（月次レポート解放）

1. 同じく「広告ユニット」→「追加」
2. 「リワード」を選択
3. 名前: `monthly_report_reward`
4. 作成 → **広告ユニットID** をコピー

---

## 4. IDを設定ファイルに記入

`src/constants/ads.ts` を開き、テストIDを本番IDに差し替える:

```typescript
export const ADS = {
  ANDROID_APP_ID: 'ca-app-pub-XXXX~XXXX',   // ← アプリID
  BANNER_ANDROID: 'ca-app-pub-XXXX/XXXX',    // ← バナー広告ユニットID
  REWARDED_ANDROID: 'ca-app-pub-XXXX/XXXX',  // ← リワード広告ユニットID
} as const;
```

`app.json` の `androidAppId` も同じアプリIDに差し替える:

```json
["react-native-google-mobile-ads", { "androidAppId": "ca-app-pub-XXXX~XXXX" }]
```

---

## 5. ビルド

```bash
npx expo prebuild --platform android
npx expo run:android
# または
eas build --platform android
```

> **注意**: AdMob広告はExpo Goでは表示されません（開発ビルドが必要）。  
> テスト中はテストIDのまま進め、ストア申請直前に本番IDに差し替えます。

---

## テストID（現在使用中）

| 用途 | ID |
|---|---|
| Android App ID | `ca-app-pub-3940256099942544~3347511713` |
| バナー | `ca-app-pub-3940256099942544/6300978111` |
| リワード | `ca-app-pub-3940256099942544/5224354917` |

これらはGoogleが提供する公式テスト用IDです。本番ビルドでは必ず差し替えてください。
