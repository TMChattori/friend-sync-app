from fastapi import APIRouter, Header, HTTPException, status

from schemas import AuthCredentials, AuthProfileUpdate, AuthSession, AuthUpdate, PasswordResetRequest
from supabase_auth import login_user, register_user, send_password_reset_email, update_app_user_profile, update_user
from supabase_events import SupabaseConfigError, SupabaseRequestError

router = APIRouter(prefix="/auth", tags=["auth"])


def _handle_supabase_error(exc: SupabaseRequestError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


def _get_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization token is required")

    return authorization[7:].strip()


@router.post("/register", response_model=AuthSession, status_code=status.HTTP_201_CREATED)
def register(payload: AuthCredentials) -> AuthSession:
    try:
        return register_user(payload)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc


@router.post("/login", response_model=AuthSession)
def login(payload: AuthCredentials) -> AuthSession:
    try:
        return login_user(payload)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc


@router.put("/me", response_model=AuthSession)
def update_me(
    payload: AuthUpdate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> AuthSession:
    token = _get_bearer_token(authorization)

    if not payload.email and not payload.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email or password is required")

    try:
        return update_user(token, payload, x_current_email or "")
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc


@router.put("/profile", response_model=AuthSession)
def update_profile(
    payload: AuthProfileUpdate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> AuthSession:
    token = _get_bearer_token(authorization)

    try:
        return update_app_user_profile(token, x_current_email or "", payload)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc


@router.post("/password-reset", status_code=status.HTTP_204_NO_CONTENT)
def request_password_reset(payload: PasswordResetRequest) -> None:
    try:
        send_password_reset_email(payload)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise _handle_supabase_error(exc) from exc
