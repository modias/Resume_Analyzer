from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db
from app.routers import auth, resume, jobs, dashboard

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Internship Intelligence API",
    description="Resume analysis, match scoring, and job insights for smarter internship applications.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(dashboard.router)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "version": "1.0.0"}
