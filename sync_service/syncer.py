import logging
from datetime import datetime, timedelta

from db_service.connection import Database
from db_service.crud import GameCrud, SyncLogCrud
from igdb_service.client import IGDBClient
from config import settings

logger = logging.getLogger(__name__)


class SyncService:
    def __init__(self, igdb_client: IGDBClient, db: Database) -> None:
        self._igdb = igdb_client
        self._db = db

    # автоматически выбирает, делать полное обновление БД или обновить только изменившиеся записи
    async def run(self, force_full: bool = False) -> None:
        async with self._db.background_session() as session:
            game_crud = GameCrud(session)
            last_sync = await game_crud.get_last_sync_timestamp()

        use_full = (
            force_full
            or last_sync is None
            or datetime.utcnow() - last_sync > timedelta(days=settings.FULL_SYNC_THRESHOLD_DAYS)
        )

        if use_full:
            await self._full_sync()
        else:
            await self._incremental_sync(since=last_sync)

    async def _full_sync(self) -> None:
        logger.info('FULL SYNC STARTED')
        total = 0

        async with self._db.background_session() as session:
            log_crud = SyncLogCrud(session)
            log_id = await log_crud.start('full')

        try:
            for batch in self._igdb.fetch_all_games():
                async with self._db.background_session() as session:
                    count = await GameCrud(session).upsert_batch(batch)

                total += count
                logger.info(f'Updated {count} games (total: {total})')

            async with self._db.background_session() as session:
                await SyncLogCrud(session).finish(log_id, total)

            logger.info(f'FULL SYNC DONE: {total} games')
        except Exception as e:
            async with self._db.background_session() as session:
                await SyncLogCrud(session).fail(log_id, str(e))

            logger.exception(f'FULL_SYNC_FAILED after {total} games')
            raise

    async def _incremental_sync(self, since: datetime) -> None:
        logger.info(f'INCREMENTAL SYNC STARTED (since {since.isoformat()}')
        total = 0

        async with self._db.background_session() as session:
            log_crud = SyncLogCrud(session)
            log_id = await log_crud.start('incremental')

        try:
            for batch in self._igdb.fetch_update_games(since=since):
                async with self._db.background_session() as session:
                    count = await GameCrud(session).upsert_batch(batch)

                total += count

            async with self._db.background_session() as session:
                await SyncLogCrud(session).finish(log_id, total)

            logger.info(f'INCREMENTAL SYNC DONE: {total} games updated')
        except Exception as e:
            async with self._db.background_session() as session:
                await SyncLogCrud(session).fail(log_id, str(e))

            logger.exception(f'INCREMENTAL SYNC FAILED after {total} games')
            raise
