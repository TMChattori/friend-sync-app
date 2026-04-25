from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.auth import router as auth_router
from routers.events import router as events_router
from routers.friends import router as friends_router
from routers.invites import router as invites_router

app = FastAPI(title="Friend Sync API")

# Expo から開発中に叩きやすいように、まずは広めに許可しています。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Friend Sync API is running"}


app.include_router(events_router)
app.include_router(friends_router)
app.include_router(invites_router)
app.include_router(auth_router)
