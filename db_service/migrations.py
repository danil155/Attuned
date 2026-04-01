import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from db_service.models import Base, EMBEDDINGS_DIM

logger = logging.getLogger(__name__)

_GIN_INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_games_genres ON games USING GIN (genres)',
    'CREATE INDEX IF NOT EXISTS idx_games_themes ON games USING GIN (themes)',
    'CREATE INDEX IF NOT EXISTS idx_games_keywords ON games USING GIN (keywords)',
    'CREATE INDEX IF NOT EXISTS idx_games_platforms ON games USING GIN (platforms)',
    'CREATE INDEX IF NOT EXISTS idx_games_developers ON games USING GIN (developers)',
    'CREATE INDEX IF NOT EXISTS idx_games_name_trgm ON games USING GIN (name gin_trgm_ops)',
    'CREATE INDEX IF NOT EXISTS idx_games_igdb_updated ON games (igdb_updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_games_no_embedding ON games (id) WHERE embedding IS NULL',
]

_VECTOR_INDEX = f"""
CREATE INDEX IF NOT EXISTS idx_games_embedding
ON GAMES USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
"""


async def run_migrations(engine: AsyncEngine) -> None:
    logger.info('Running DB migrations')

    async with engine.begin() as conn:
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS pg_trgm'))
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))

        await conn.run_sync(Base.metadata.create_all)

        await conn.execute(text(f"""
        ALTER TABLE games
        ADD COLUMN IF NOT EXISTS embedding vector({EMBEDDINGS_DIM})
        """))

        for stmt in _GIN_INDEXES:
            await conn.execute(text(stmt))

        await conn.execute(text(_VECTOR_INDEX))

    logger.info('Migrations complete')
