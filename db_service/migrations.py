import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from db_service.models import Base
from db_service.models import Base as UserBase

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

_USER_INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_user_external ON user_data(external_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_token ON user_data(access_token)',
    'CREATE INDEX IF NOT EXISTS idx_user_pro_expires ON user_data(pro_expires_at) WHERE is_pro = true',
    'CREATE INDEX IF NOT EXISTS idx_user_carts_user ON user_carts(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_carts_games ON user_carts USING GIN (games)',
    'CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_game_interactions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_interactions_igdb ON user_game_interactions(igdb_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_game_interactions(interaction_type)',
    'CREATE INDEX IF NOT EXISTS idx_user_interactions_composite ON user_game_interactions(user_id, igdb_id, interaction_type)',
]

_SEARCH_INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_games_search_vector ON games USING GIN (search_vector)',
    'CREATE INDEX IF NOT EXISTS idx_games_search_boost ON games (search_boost) WHERE search_boost > 1.0',
]

_LIKE_INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_user_interactions_likes_count ON user_game_interactions (igdb_id) WHERE interaction_type = \'like\'',
    'CREATE INDEX IF NOT EXISTS idx_user_interactions_likes_group ON user_game_interactions (interaction_type, igdb_id) WHERE interaction_type = \'like\'',
    'CREATE INDEX IF NOT EXISTS idx_user_interactions_likes_covering ON user_game_interactions (igdb_id, interaction_type) INCLUDE (user_id) WHERE interaction_type = \'like\'',
]


async def run_migrations(engine: AsyncEngine) -> None:
    logger.info('Running DB migrations')

    async with engine.begin() as conn:
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS pg_trgm'))
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))

        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(UserBase.metadata.create_all)

        for stmt in _GIN_INDEXES + _USER_INDEXES + _SEARCH_INDEXES + _LIKE_INDEXES:
            await conn.execute(text(stmt))

        await conn.execute(text(_VECTOR_INDEX))

    logger.info('Migrations complete')
