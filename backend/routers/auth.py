from fastapi import APIRouter, File, Header, HTTPException, UploadFile, status

from error_utils import safe_supabase_http_exception
from schemas import AccountDeletionRequest, AuthCredentials, AuthProfileUpdate, AuthSession, AuthUpdate, PasswordResetRequest
from supabase_auth import (
    delete_account,
    get_app_user_profile,
    get_auth_user,
    login_user,
    register_user,
    resolve_app_user,
    send_password_reset_email,
    update_app_user_profile,
    update_user,
    upload_profile_icon_file as upload_profile_icon_to_storage,
)
from supabase_events import SupabaseConfigError, SupabaseRequestError

router = APIRouter(prefix="/auth", tags=["auth"])


def _handle_supabase_error(exc: SupabaseRequestError) -> HTTPException:
    return safe_supabase_http_exception(exc, "Authentication request failed")


def _get_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization token is required")

    return authorization[7:].strip()


def _resolve_current_email(token: str, current_email: str | None) -> str:
    if current_email:
        return current_email

    try:
        auth_user = get_auth_user(token)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication service is not configured") from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc

    resolved_email = auth_user.get("email")
    if not resolved_email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current email is required")

    return str(resolved_email)


@router.post("/register", response_model=AuthSession, status_code=status.HTTP_201_CREATED)
def register(payload: AuthCredentials) -> AuthSession:
    try:
        return register_user(payload)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication service is not configured") from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc


@router.post("/login", response_model=AuthSession)
def login(payload: AuthCredentials) -> AuthSession:
    try:
        return login_user(payload)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication service is not configured") from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc


@router.put("/me", response_model=AuthSession)
def update_me(
    payload: AuthUpdate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> AuthSession:
    token = _get_bearer_token(authorization)
    resolved_email = _resolve_current_email(token, x_current_email)

    if not payload.email and not payload.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email or password is required")

    try:
        return update_user(token, payload, resolved_email)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication service is not configured") from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc


@router.put("/profile", response_model=AuthSession)
def update_profile(
    payload: AuthProfileUpdate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> AuthSession:
    token = _get_bearer_token(authorization)
    resolved_email = _resolve_current_email(token, x_current_email)

    try:
        return update_app_user_profile(token, resolved_email, payload)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication service is not configured") from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc


@router.get("/profile", response_model=AuthSession)
def get_profile(
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> AuthSession:
    token = _get_bearer_token(authorization)
    resolved_email = _resolve_current_email(token, x_current_email)

    try:
        return get_app_user_profile(token, resolved_email)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication service is not configured") from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc


@router.post("/profile/icon")
async def upload_profile_icon_file(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> dict[str, str]:
    token = _get_bearer_token(authorization)
    resolved_email = _resolve_current_email(token, x_current_email)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="image file is required")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="image file is empty")

    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="image file is too large")

    try:
        resolve_app_user(token, resolved_email)
        icon_url = upload_profile_icon_to_storage(token, resolved_email, content, file.content_type)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication service is not configured") from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc

    return {"icon_url": icon_url}


@router.post("/password-reset", status_code=status.HTTP_204_NO_CONTENT)
def request_password_reset(payload: PasswordResetRequest) -> None:
    try:
        send_password_reset_email(payload)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication service is not configured") from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc


def _delete_account_with_reason(
    payload: AccountDeletionRequest,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> None:
    token = _get_bearer_token(authorization)
    resolved_email = _resolve_current_email(token, x_current_email)

    try:
        delete_account(token, resolved_email, payload.reason)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication service is not configured") from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def remove_account(
    payload: AccountDeletionRequest,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> None:
    _delete_account_with_reason(payload, authorization, x_current_email)


@router.post("/account/delete", status_code=status.HTTP_204_NO_CONTENT)
def remove_account_legacy(
    payload: AccountDeletionRequest,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> None:
    _delete_account_with_reason(payload, authorization, x_current_email)
