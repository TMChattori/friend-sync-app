# Backend

このディレクトリは Expo アプリ用の FastAPI バックエンドです。

## セットアップ

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 起動

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Docker

リポジトリのルートで、以下のコマンドで Docker 起動できます。

```bash
cp backend/.env.example .env
# .env に SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY を設定
docker compose up --build
```

起動後のAPI:

```bash
http://localhost:8000
```

本番サーバーでは `backend/.env` を置かず、`.env` やサーバー環境変数から値を渡す想定です。

推奨:

- Auth API 用に `SUPABASE_ANON_KEY`
- REST / Storage 用に `SUPABASE_SERVICE_ROLE_KEY`
- 本番では `APP_ENV=production`
- Browser から使う環境では `BACKEND_CORS_ORIGINS` を明示設定

## ルーティング

- `GET /events`
- `POST /events`
- `PUT /events/{id}`
- `DELETE /events/{id}`
