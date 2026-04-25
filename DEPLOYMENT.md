# Deployment Guide

このドキュメントは、`friend-sync-app` を **Render + Expo** 構成でデプロイする手順です。

今回の全体フローは次のとおりです。

1. FastAPI 側のファイルを準備
2. GitHub に push
3. Render で `New Web Service` を作成
4. 環境変数を設定
5. デプロイ
6. Expo 側の API URL を Render の URL に変更

---

## 1. 今回デプロイするもの

今回まずデプロイするのは **FastAPI バックエンド** です。

Expo アプリ自体は Render に載せず、

- バックエンド: Render
- モバイルアプリ: Expo / iPhone
- データ保存・認証: Supabase

という構成にします。

---

## 2. Render に上げる前に準備するファイル

Render に FastAPI をデプロイするには、最低限以下が必要です。

- `backend/main.py`
- `backend/requirements.txt`
- `backend` 配下の router / schema / service ファイル
- 起動コマンド

このプロジェクトでは、すでに FastAPI 本体は動いているので、主に Render 用設定を意識すれば大丈夫です。

確認しておきたいファイル:

- [backend/main.py](/Users/tmc_hattori/Downloads/friend-sync-app/backend/main.py)
- [backend/requirements.txt](/Users/tmc_hattori/Downloads/friend-sync-app/backend/requirements.txt)

---

## 3. GitHub に push する

Render は GitHub リポジトリからデプロイするので、まずコードを GitHub に push します。

基本コマンド:

```bash
git status
git add .
git commit -m "Prepare FastAPI backend for Render deployment"
git push origin main
```

補足:

- `.env` は push しません
- `backend/.env` は本番では Render の Environment に設定します

---

## 4. Render で New Web Service を作成する

Render のダッシュボードで以下の順に進みます。

1. Render にログイン
2. `New +`
3. `Web Service`
4. GitHub リポジトリを選択
5. この `friend-sync-app` リポジトリを接続

---

## 5. Render の設定値

Render の Web Service 作成画面では、だいたい次のように設定します。

### 基本設定

- **Name**
  - 例: `friend-sync-backend`

- **Root Directory**
  - `backend`

- **Environment**
  - `Python 3`

- **Branch**
  - `main`

### Build Command

```bash
pip install -r requirements.txt
```

### Start Command

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

ここでのポイント:

- Render では `PORT` は Render 側が自動で渡すので、固定 `8000` ではなく `$PORT` を使います

---

## 6. Render に設定する環境変数

Render の `Environment` セクションで、以下を設定します。

### 必須

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_STORAGE_BUCKET`

### 必要に応じて

- `SUPABASE_SERVICE_ROLE_KEY`

例:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-key
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=profile-icons
```

---

## 7. デプロイ

設定が終わったら `Create Web Service` を押します。

Render が自動で次を実行します。

1. GitHub からコード取得
2. `backend` ディレクトリで `pip install -r requirements.txt`
3. `uvicorn main:app --host 0.0.0.0 --port $PORT` で起動

デプロイが成功すると、Render から URL が発行されます。

例:

```text
https://friend-sync-backend.onrender.com
```

---

## 8. Render デプロイ後の確認

まず Render の URL にアクセスして、ルートが返るか確認します。

例:

```bash
curl https://friend-sync-backend.onrender.com
```

期待するレスポンス:

```json
{"message":"Friend Sync API is running"}
```

次に、必要なら各 API も確認します。

確認候補:

- `/events`
- `/friends`
- `/invites`
- `/auth/login`

---

## 9. Expo 側の API URL を Render に変更する

Expo 側は `EXPO_PUBLIC_API_URL` を優先して読む実装になっています。

そのため、Expo の `.env` か実行環境で次を設定します。

```env
EXPO_PUBLIC_API_URL=https://friend-sync-backend.onrender.com
```

必要に応じて `expo-env.d.ts` やローカル `.env` を使って管理します。

補足:

- iPhone / Expo Go から Render を叩く場合、ローカルIP指定ではなくこの Render URL を使います

---

## 10. Expo 側で確認すること

API URL を Render に切り替えたあと、次を確認します。

- ホーム画面のデータ取得
- 予定一覧取得
- 予定追加 / 更新 / 削除
- 友達一覧取得
- 友達検索 / 追加 / 削除
- 通知表示
- ログイン / 新規登録

---

## 11. CORS の見直し

今の `backend/main.py` は開発向けに広く許可しています。

```python
allow_origins=["*"]
```

Render で本番運用する場合は、将来的に絞るのがおすすめです。

ただし Expo 開発中は接続元が固定しづらいので、最初は `*` のままでも進めやすいです。

---

## 12. よくあるハマりどころ

### 1. Render で起動しない

原因候補:

- `Root Directory` が `backend` になっていない
- `Start Command` が `$PORT` ではなく `8000` 固定
- 環境変数が足りない

### 2. Supabase 接続エラー

原因候補:

- `SUPABASE_URL` が違う
- `SUPABASE_KEY` が違う
- テーブルが未作成

### 3. Expo からつながらない

原因候補:

- `EXPO_PUBLIC_API_URL` がローカルのまま
- Expo を再起動していない
- Render デプロイが失敗している

### 4. 初回アクセスが遅い

Render の無料プランだと、一定時間アクセスがないあとスリープして初回レスポンスが遅くなることがあります。

---

## 13. 最短手順まとめ

### FastAPI 側

```bash
git add .
git commit -m "Prepare backend for Render"
git push origin main
```

### Render 側

- New Web Service
- Root Directory: `backend`
- Build Command:

```bash
pip install -r requirements.txt
```

- Start Command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

- Environment Variables:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_STORAGE_BUCKET`

### Expo 側

```env
EXPO_PUBLIC_API_URL=https://your-render-service.onrender.com
```

---

## 14. 次におすすめの改善

Render デプロイの次にやると良いもの:

- `render.yaml` を作って設定をコード管理する
- 本番 / 開発 / ステージングを分ける
- CORS を本番向けに整理する

---

## 15. Supabase Userプロフィール設定

設定画面では `User` テーブルの以下のカラムを参照・更新します。

- `name`
- `userid`
- `note`
- `plan_status`
- `icon_url`

足りないカラムがある場合は、Supabase SQL Editor で追加します。

```sql
alter table "User"
add column if not exists note text,
add column if not exists plan_status text default 'free',
add column if not exists icon_url text;
```

プロフィール画像は Supabase Storage に保存し、生成された公開URLを `User.icon_url` に保存します。

Supabase Storage で以下を作成します。

- Bucket name: `profile-icons`
- Public bucket: on

Render の Environment Variables にも追加します。

```env
SUPABASE_STORAGE_BUCKET=profile-icons
```

---

## 16. App Store に出す手順

Expo Go ではなく App Store で配布するには、EAS Build / EAS Submit を使います。

### 事前に必要なもの

- Apple Developer Program への登録
- Expo アカウント
- App Store Connect に作成するアプリ情報
- Render の本番 API URL

Apple Developer Program は年額費用が必要です。個人で登録する場合、App Store 上の販売元名にはAppleアカウントの法的氏名が表示されます。

### このプロジェクト側の設定

`app.json` には iOS の Bundle ID を設定済みです。

```json
"bundleIdentifier": "com.tmchattori.friendsyncapp"
```

`eas.json` も作成済みです。

### EAS CLI を準備する

```bash
npm install -g eas-cli
eas login
```

### Expo プロジェクトを EAS に紐づける

初回だけ実行します。

```bash
eas init
```

### 本番 API URL を EAS に登録する

Render のURLに置き換えて実行します。

```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://your-render-service.onrender.com
```

### iOS 本番ビルドを作る

```bash
eas build --platform ios --profile production
```

途中で Apple アカウントへのログインや証明書作成を求められたら、EAS に任せて自動作成で進めます。

### App Store Connect に送信する

ビルド完了後に実行します。

```bash
eas submit --platform ios --profile production
```

送信後は App Store Connect で以下を入力して審査に出します。

- アプリ名
- 説明文
- スクリーンショット
- カテゴリ
- 年齢制限
- プライバシー情報
- サポートURL

### 今後の更新

コードを修正したら、通常通り GitHub に push してから新しいビルドを作ります。

```bash
git add .
git commit -m "Prepare iOS app store build"
git push origin main
eas build --platform ios --profile production
eas submit --platform ios --profile production
```
