import os

from dotenv import load_dotenv


load_dotenv()


APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY") or ""
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or ""
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "profile-icons")


def get_auth_key() -> str:
    return SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY


def get_admin_key() -> str:
    return SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY


def get_cors_origins() -> list[str]:
    raw_value = os.getenv("BACKEND_CORS_ORIGINS", "").strip()
    if raw_value:
        return [origin.strip() for origin in raw_value.split(",") if origin.strip()]

    if APP_ENV == "production":
        return []

    return ["*"]


def allows_all_cors_origins(origins: list[str]) -> bool:
    return len(origins) == 1 and origins[0] == "*"
