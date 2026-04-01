from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from config import DBConfig


def _make_engine(dsn: str, pool_size: int, max_overflow: int, pool_timeout: float, pool_recycle: int) -> AsyncEngine:
    return create_async_engine(
        dsn,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_timeout=pool_timeout,
        pool_recycle=pool_recycle,
        echo=False
    )


class Database:
    def __init__(self, config: DBConfig) -> None:
        self._app_engine: AsyncEngine = _make_engine(
            config.dsn,
            pool_size=config.app_pool_size,
            max_overflow=config.app_max_overflow,
            pool_timeout=config.app_pool_timeout,
            pool_recycle=config.pool_recycle
        )
        self._background_engine: AsyncEngine = _make_engine(
            config.dsn,
            pool_size=config.background_pool_size,
            max_overflow=config.background_max_overflow,
            pool_timeout=30.0,
            pool_recycle=config.pool_recycle
        )

        self._app_session_factory = async_sessionmaker(
            bind=self._app_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        self._background_session_factory = async_sessionmaker(
            bind=self._background_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    @property
    def engine(self) -> AsyncEngine:
        return self._app_engine

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        async with self._app_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    @asynccontextmanager
    async def background_session(self) -> AsyncGenerator[AsyncSession, None]:
        async with self._background_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def close(self) -> None:
        await self._app_engine.dispose()
        await self._background_engine.dispose()
