import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import func, select, update, Float
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from db_service.models import Game, SyncLog
from igdb_service.schemas import IGDBGame

logger = logging.getLogger(__name__)


class GameCrud:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # возвращает количество обработанных записей
    async def upsert_batch(self, games: list[IGDBGame]) -> int:
        if not games:
            return 0

        rows = [_game_to_dict(g) for g in games]

        stmt = insert(Game).values(rows)

        update_cols = {col: stmt.excluded[col] for col in rows[0] if col != 'igdb_id'}
        update_cols['embedding'] = None

        stmt = stmt.on_conflict_do_update(
            index_elements=['igdb_id'],
            set_=update_cols,
        )

        await self._session.execute(stmt)

        return len(rows)

    async def get_last_sync_timestamp(self) -> Optional[datetime]:
        result = await self._session.execute(
            select(func.max(Game.igdb_updated_at))
        )

        return result.scalar_one_or_none()

    async def count(self) -> int:
        result = await self._session.execute(select(func.count()).select_from(Game))

        return result.scalar_one()


class SyncLogCrud:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def start(self, sync_type: str) -> int:
        log = SyncLog(sync_type=sync_type, status='running')
        self._session.add(log)
        await self._session.flush()

        return log.id

    async def finish(self, log_id: int, games_processed: int) -> None:
        await self._session.execute(
            update(SyncLog).where(SyncLog.id == log_id).values(
                finished_at=datetime.utcnow(),
                games_processed=games_processed,
                status='done'
            )
        )

    async def fail(self, log_id: int, error: str) -> None:
        await self._session.execute(
            update(SyncLog).where(SyncLog.id == log_id).values(
                finished_at=datetime.utcnow(),
                status='failed',
                error_message=error,
            )
        )


class EmbeddingCrud:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_games_without_embeddings(self, batch_size: int, offset: int = 0) -> list[Game]:
        result = await self._session.execute(
            select(
                Game.id,
                Game.name,
                Game.summary,
                Game.storyline,
                Game.genres,
                Game.themes,
                Game.keywords
            ).where(Game.embedding.is_(None))
            .order_by(Game.id)
            .limit(batch_size)
            .offset(offset)
        )

        return result.all()

    async def save_embeddings(self, embeddings: list[tuple[int, list[float]]]) -> None:
        for game_id, vector in embeddings:
            await self._session.execute(
                update(Game)
                .where(Game.id == game_id)
                .values(embedding=vector)
            )

    async def count_without_embeddings(self) -> None:
        result = await self._session.execute(
            select(func.count()).select_from(Game).where(Game.embedding.is_(None))
        )

        return result.scalar_one()


class RecommendationCrud:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_embeddings_by_igdb_ids(self, igdb_ids: list[int]) -> list[tuple[int, list[float]]]:
        result = await self._session.execute(
            select(Game.igdb_id, Game.embedding)
            .where(Game.igdb_id.in_(igdb_ids), Game.embedding.is_not(None))
        )

        return [(row.igdb_id, row.embedding) for row in result.all()]

    async def find_similar(self,
                           embedding: list[float],
                           exclude_igdb_ids: list[int],
                           limit: int,
                           only_released: bool = True,
                           min_rating_count: int = 10) -> list[Game]:
        filters = [
            Game.embedding.is_not(None),
            Game.igdb_id.not_in(exclude_igdb_ids) if exclude_igdb_ids else True,
            Game.rating_count >= min_rating_count,
        ]

        if only_released:
            now = datetime.now(timezone.utc)
            filters.append(Game.first_release_date <= now)

        stmt = (select(Game)
                .where(*filters)
                .order_by(Game.embedding.op('<=>', return_type=Float)(embedding))
                .limit(limit)
                )
        result = await self._session.execute(stmt)

        return list(result.scalars().all())

    async def get_max_rating_count(self) -> int:
        result = await self._session.execute(
            select(func.max(Game.rating_count))
        )

        return result.scalar_one() or 1


class SearchCrud:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def search_by_name(self, query: str, limit: int = 20) -> list[Game]:
        result = await self._session.execute(
            select(Game)
            .where(Game.name.bool_op('%')(query), Game.embedding.is_not(None))
            .order_by(func.similarity(Game.name, query).desc())
            .limit(limit)
        )

        return list(result.scalars().all())

    async def search_by_id(self, igdb_id: int) -> Game | None:
        result = await self._session.execute(
            select(Game)
            .where(Game.igdb_id == igdb_id)
        )

        return result.scalar_one_or_none()


def _game_to_dict(game: IGDBGame) -> dict:
    return {
        'igdb_id': game.id,
        'name': game.name,
        'slug': game.slug,
        'summary': game.summary,
        'storyline': game.storyline,
        'igdb_url': game.url,
        'cover_url': game.cover.url if game.cover else None,
        'game_status': game.game_status,
        'game_type': game.game_type,
        'genres': [e.name for e in game.genres],
        'themes': [e.name for e in game.themes],
        'keywords': [e.name for e in game.keywords],
        'game_modes': [e.name for e in game.game_modes],
        'player_perspectives': [e.name for e in game.played_perspectives],
        'platforms': [e.name for e in game.platforms],
        'developers': game.developers,
        'rating': game.rating,
        'rating_count': game.rating_count,
        'aggregated_rating': game.aggregated_rating,
        'aggregated_rating_count': game.aggregated_rating_count,
        'hypes': game.hypes,
        'first_release_date': game.first_release_datetime,
        'igdb_updated_at': game.updated_at_datetime,
        'synced_at': datetime.utcnow()
    }
