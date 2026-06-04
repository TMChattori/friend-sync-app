from fastapi import HTTPException, status

from supabase_events import SupabaseRequestError


_SAFE_DETAILS = {
    "Authorization token is required",
    "Current email is required",
    "Current user id was not found",
    "Friend candidate not found",
    "You cannot add yourself",
    "Friend already added",
    "user_id already exists",
    "user_id cannot be empty",
    "name cannot be empty",
    "current email is required",
    "image file is required",
    "image file is empty",
    "image file is too large",
    "email or password is required",
}


def safe_supabase_http_exception(exc: SupabaseRequestError, fallback_message: str) -> HTTPException:
    if exc.status_code >= 500:
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=fallback_message)

    detail = exc.detail.strip()
    if detail in _SAFE_DETAILS:
        return HTTPException(status_code=exc.status_code, detail=detail)

    if detail.startswith("{") or detail.startswith("[") or "SQL" in detail or "relation" in detail or "column" in detail:
        return HTTPException(status_code=exc.status_code, detail=fallback_message)

    return HTTPException(status_code=exc.status_code, detail=detail or fallback_message)
