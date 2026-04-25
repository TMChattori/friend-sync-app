from pydantic import BaseModel, Field


class EventBase(BaseModel):
    user_id: str = Field(..., description="予定を持つユーザーID")
    date: str = Field(..., description="予定日。例: 2026-04-15")
    title: str = Field(..., min_length=1, description="予定タイトル")
    start_time: str | None = Field(default=None, description="開始時刻。例: 18:00")
    end_time: str | None = Field(default=None, description="終了時刻。例: 19:00")
    category: str | None = Field(default=None, description="予定カテゴリ。例: meal")


class EventCreate(EventBase):
    pass


class EventUpdate(EventBase):
    pass


class Event(EventBase):
    id: str = Field(..., description="予定ID")


class FriendCreate(BaseModel):
    name: str | None = Field(default=None, description="友達の名前")
    public_user_id: str | None = Field(default=None, description="友達の公開ユーザーID")
    user_db_id: int | None = Field(default=None, description="User テーブル上のID")


class Friend(FriendCreate):
    id: int = Field(..., description="友達ID")
    name: str = Field(..., description="友達の名前")
    status: str = Field(..., description='友達の状態。"available" または "busy"')


class FriendCandidate(BaseModel):
    id: int = Field(..., description="User テーブル上のID")
    name: str = Field(..., description="表示名")
    user_id: str = Field(..., description="公開ユーザーID")
    note: str | None = Field(default=None, description="ひとこと")


class InviteBase(BaseModel):
    from_user_id: str = Field(..., min_length=1, description="誘いを送ったユーザーID")
    to_user_id: str = Field(..., min_length=1, description="誘いを受け取るユーザーID")
    date: str = Field(..., description="誘う日付。例: 2026-04-15")
    message: str = Field(..., min_length=1, description="誘うときの一言")
    status: str = Field(default="request", description='誘いの状態。例: "request" / "sent"')


class InviteCreate(InviteBase):
    pass


class Invite(InviteBase):
    id: str = Field(..., description="お誘いID")


class AuthCredentials(BaseModel):
    username: str | None = Field(default=None, description="表示用ユーザ名")
    email: str = Field(..., min_length=1, description="メールアドレス")
    password: str = Field(..., min_length=1, description="パスワード")


class AuthUpdate(BaseModel):
    email: str | None = Field(default=None, description="変更後のメールアドレス")
    password: str | None = Field(default=None, description="変更後のパスワード")


class AuthSession(BaseModel):
    email: str = Field(..., description="ログイン中のメールアドレス")
    access_token: str | None = Field(default=None, description="Supabase Auth のアクセストークン")
    username: str | None = Field(default=None, description="表示用ユーザ名")
    public_user_id: str | None = Field(default=None, description="公開ユーザーID")
    plan_status: str = Field(default="free", description="プラン状態")


class PasswordResetRequest(BaseModel):
    email: str = Field(..., min_length=1, description="パスワード再設定メールの送信先")
