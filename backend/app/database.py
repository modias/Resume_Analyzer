from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _migrate(conn)


async def _migrate(conn) -> None:
    """Idempotent column additions for existing deployments."""
    from sqlalchemy import text
    for sql in [
        "ALTER TABLE users ADD COLUMN skills TEXT DEFAULT '[]'",
        "ALTER TABLE users ADD COLUMN dream_companies TEXT DEFAULT '[]'",
        "ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN verification_code TEXT",
        "ALTER TABLE users ADD COLUMN verification_expires_at DATETIME",
        "ALTER TABLE users ADD COLUMN dream_job VARCHAR(120) DEFAULT ''",
        "ALTER TABLE users ADD COLUMN linkedin_id VARCHAR(120)",
        # applications table safety net (create_all handles this, but kept for old DBs)
        """
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            company VARCHAR(255) DEFAULT '',
            role VARCHAR(255) DEFAULT '',
            status VARCHAR(50) DEFAULT 'applied',
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """,
    ]:
        try:
            await conn.execute(text(sql))
        except Exception:
            pass  # column/table already exists

    # Backfill attempt history from older `practice_sessions` rows (if needed).
    # This enables Option 1 ("real N times + averages") without losing existing practice data.
    try:
        await conn.execute(
            text(
                """
                INSERT INTO practice_attempts (
                    user_id, language_key, language_display, difficulty, score, created_at
                )
                SELECT
                    user_id,
                    lower(language) AS language_key,
                    language AS language_display,
                    difficulty,
                    score,
                    created_at
                FROM practice_sessions
                WHERE (SELECT COUNT(*) FROM practice_attempts) = 0
                """
            )
        )
    except Exception:
        # practice_attempts may not exist yet (fresh DB) or SQL may differ.
        pass
