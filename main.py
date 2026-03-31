import asyncio
import logging
import signal
import sys
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import load_db_config, load_igdb_config
from db_service.connection import Database
from db_service.migrations import run_migrations
from igdb_service.client import IGDBClient
from sync_service.syncer import SyncService

logger = logging.getLogger(__name__)

SYNC_INTERVAL_HOURS = 24


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        handlers=[logging.StreamHandler(sys.stdout)]
    )

    logging.getLogger('apscheduler').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy').setLevel(logging.WARNING)


class App:
    def __init__(self) -> None:
        self._db: Optional[Database] = None
        self._sync_service: Optional[SyncService] = None
        self._scheduler: Optional[AsyncIOScheduler] = None

    async def start(self) -> None:
        logger.info('Starting Attuned backend')

        self._db = Database(load_db_config())
        await run_migrations(self._db.engine)
        logger.info('Database ready')

        self._sync_service = SyncService(
            igdb_client=IGDBClient(load_igdb_config()),
            db=self._db
        )

        await self._run_sync()

        self._scheduler = AsyncIOScheduler()
        self._scheduler.add_job(
            self._run_sync,
            trigger=IntervalTrigger(hours=SYNC_INTERVAL_HOURS),
            id='incremental_sync',
            name='IGDB incremental sync',
            max_instances=1,
            misfire_grace_time=60
        )
        self._scheduler.start()
        logger.info(f'Scheduler started: incremental sync every {SYNC_INTERVAL_HOURS} hours')

    async def stop(self) -> None:
        logger.info('Shutting down')

        if self._scheduler and self._scheduler.running:
            self._scheduler.shutdown(wait=False)
        if self._db:
            await self._db.close()
        logger.info('Shutdown complete')

    async def _run_sync(self) -> None:
        try:
            await self._sync_service.run()
        except Exception:
            logger.exception('Sync failed, will retry on next schedule')


async def main() -> None:
    setup_logging()
    app = App()

    stop_event = asyncio.Event()

    def _on_signal(*_) -> None:
        logger.info('Signal received, stopping')
        stop_event.set()

    signal.signal(signal.SIGINT, _on_signal)
    signal.signal(signal.SIGTERM, _on_signal)

    await app.start()

    await stop_event.wait()
    await app.stop()


if __name__ == '__main__':
    asyncio.run(main())
