import json

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config import allows_all_cors_origins, get_cors_origins
from routers.auth import router as auth_router
from routers.events import router as events_router
from routers.friends import router as friends_router
from routers.invites import router as invites_router

app = FastAPI(title="Friend Sync API")
cors_origins = get_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=not allows_all_cors_origins(cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Friend Sync API is running"}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError):
    print("VALIDATION ERROR:", repr(exc.errors()))
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


app.include_router(events_router)
app.include_router(friends_router)
app.include_router(invites_router)
app.include_router(auth_router)
