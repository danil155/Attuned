from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from config import DBConfig


class PaymentDatabase:
    def __init__(self, config: DBConfig):
        self._engine: AsyncEngine = create_async_engine(
            config.mysql_dsn,
            pool_size=config.mysql_pool_size,
            max_overflow=config.mysql_max_overflow,
            pool_pre_ping=True,
            pool_recycle=config.mysql_pool_recycle,
            echo=False
        )

        self._session_factory = async_sessionmaker(
            bind=self._engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        async with self._session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def close(self) -> None:
        await self._engine.dispose()

    @property
    def engine(self) -> AsyncEngine:
        return self._engine
