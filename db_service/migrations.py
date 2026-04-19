from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from db_service.models import Base

_GIN_INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_games_genres ON games USING GIN (genres)',
    'CREATE INDEX IF NOT EXISTS idx_games_themes ON games USING GIN (themes)',
    'CREATE INDEX IF NOT EXISTS idx_games_keywords ON games USING GIN (keywords)',
    'CREATE INDEX IF NOT EXISTS idx_games_platforms ON games USING GIN (platforms)',
    'CREATE INDEX IF NOT EXISTS idx_games_developers ON games USING GIN (developers)',
    'CREATE INDEX IF NOT EXISTS idx_games_name_trgm ON games USING GIN (name gin_trgm_ops)',
    'CREATE INDEX IF NOT EXISTS idx_games_igdb_updated ON games (igdb_updated_at)',
]


async def run_migrations(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS pg_trgm'))

        await conn.run_sync(Base.metadata.create_all)

        for stmt in _GIN_INDEXES:
            await conn.execute(text(stmt))

    print('Migrations complete')
