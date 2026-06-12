# EAS Build ガイド — ここロコーチ

## なぜ EAS Build が必要か

| 機能 | Expo Go | EAS Build (dev/preview/production) |
|------|---------|-------------------------------------|
| 通常の UI・ロジック | ✅ | ✅ |
| 通知（expo-notifications） | ✅ | ✅ |
| RevenueCat 課金 | ❌ モック | ✅ 実動作 |
| **画像シェア（react-native-view-shot）** | ❌ エラー → テキストフォールバック | ✅ PNG キャプチャ可 |
| AdMob 広告 | ❌ モック | ✅ |

`react-native-view-shot` はカスタムネイティブモジュールを含むため、**Expo Go では動作しない**。
SNS への画像シェア（年間レポート・マイルストーン・インサイトカード）を実際にテストするには EAS Build が必要。

---

## 前提条件

```bash
# Node.js 18+ が必要
node -v

# EAS CLI をグローバルインストール
npm install -g eas-cli

# バージョン確認
eas --version
```

Expo アカウントを作成してログイン:
```bash
eas login
# → メールアドレス + パスワードを入力
```

プロジェクトを Expo に紐付け（初回のみ）:
```bash
eas init
# → app.json の "extra.eas.projectId" に UUID が書き込まれる
```

---

## ビルドプロファイル

`eas.json` に3つのプロファイルを定義している:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

| プロファイル | 用途 | 特徴 |
|-------------|------|------|
| `development` | 開発・デバッグ | `expo-dev-client` 込み。ホットリロード可 |
| `preview` | 内部テスト（自分の実機） | 署名済み APK。Google Play 不要 |
| `production` | Google Play へのリリース | AAB 形式・キーストア必須 |

---

## Android ビルド手順

### 1. Preview ビルド（実機テスト用・最速）

```bash
# ルートディレクトリで実行
eas build --platform android --profile preview
```

- ビルド完了後、**QR コード付きの URL** が表示される
- Android 端末でその URL を開いて APK をインストール
- 画像シェア・RevenueCat・広告がすべて実際に動作する

所要時間: 約 5〜15 分（Expo のクラウドビルド）

### 2. Development ビルド（ホットリロード込み）

```bash
eas build --platform android --profile development
```

インストール後、`npx expo start --dev-client` を実行してアプリを起動。
ソースを変更するとホットリロードが効く（ネイティブモジュールが使える状態で）。

### 3. Production ビルド（Google Play 用）

```bash
eas build --platform android --profile production
```

- AAB（Android App Bundle）が生成される
- 初回は EAS が自動でキーストアを生成・管理してくれる（`eas credentials` で確認可能）
- ビルド後、Google Play Console の「内部テスト → 制作 → 本番」に順次提出

---

## キーストア管理

EAS はキーストアをクラウドで管理する（推奨）:

```bash
# 現在の認証情報を確認
eas credentials

# キーストアをローカルにバックアップ（重要・別途安全に保管）
eas credentials --platform android
# → 「Download keystore」を選択
```

キーストアを紛失すると Google Play へのアップデートが永久に不可能になる。
バックアップは必ずどこか安全な場所（パスワードマネージャーなど）に保存すること。

---

## ビルド後の確認フロー

1. **画像シェアのテスト**
   - 年間レポートの最終スライドで「📤 友達にシェアする」→ PNG 画像が共有シートに表示されることを確認
   - マイルストーンモーダルで「📤 シェアする」→ 同上
   - きろくタブのインサイト行タップ → InsightShareModal → 「📤 このカードをシェアする」

2. **RevenueCat テスト**
   - サンドボックスアカウントで月額・年額購入フローを確認
   - 購入の復元も確認

3. **通知テスト**
   - 習慣リマインダーを短い時間に設定して動作確認
   - 気分チェック通知・週次レポート通知

---

## よくある問題

### `eas build` が "project not configured" で失敗する

```bash
eas init
```

を実行して `app.json` に `extra.eas.projectId` を追加する。

### ビルドが "Keystore not found" で失敗する

```bash
eas credentials
```

で「Set up a new keystore」を選択。EAS が自動生成する。

### APK インストール時に「不明なアプリ」警告が出る

Android の設定 → セキュリティ → 提供元不明のアプリ → インストールを許可する。
これは `preview` ビルドに限った話で、Google Play 経由では表示されない。

### `react-native-view-shot` でキャプチャが真っ黒になる

- `captureRef` の第2引数に `{ format: 'png', quality: 1.0 }` を明示する
- キャプチャ対象の `View` が画面に描画されてから呼ぶ（`useEffect` ではなくボタン押下時に呼ぶのが安全）

---

## 参考リンク

- EAS Build 公式ドキュメント: https://docs.expo.dev/build/introduction/
- EAS CLI リファレンス: https://docs.expo.dev/eas/
- Google Play Console: https://play.google.com/console/
- eas.json 設定リファレンス: https://docs.expo.dev/eas/json/
