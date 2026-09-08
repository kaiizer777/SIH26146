"""Shared async SQLAlchemy engine and session factory — Phase 9.

Centralises the asyncpg engine so alerts.py, entity.py and any future
routers share a single connection pool instead of creating their own.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import settings

_engine = create_async_engine(
    settings.database_url.replace("postgresql://", "postgresql+asyncpg://", 1),
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = async_sessionmaker(_engine, expire_on_commit=False)


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with SessionLocal() as session:
        yield session
