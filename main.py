import logging
import sys
from typing import AsyncGenerator
import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import load_db_config, load_igdb_config
from config_vars import MainParameters
from api import games, recommendations, genres
from db_service.connection import Database
from db_service.migrations import run_migrations
from igdb_service.client import IGDBClient
from sync_service.syncer import SyncService
from embedding_service.embedder import EmbeddingService
from recommendation_service.recommender import RecommendationService

logger = logging.getLogger(__name__)


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        handlers=[logging.StreamHandler(sys.stdout)]
    )

    logging.getLogger('apscheduler').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)


async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging()
    logger.info('Starting Attuned backend')

    db = Database(load_db_config())
    await run_migrations(db.engine)
    logger.info('Database ready')

    igdb_client = IGDBClient(load_igdb_config())

    sync_service = SyncService(igdb_client=igdb_client, db=db)
    embedding_service = EmbeddingService(db=db)
    recommendation_service = RecommendationService(db=db)

    app.state.igdb_client = igdb_client
    app.state.db = db
    app.state.recommendation_service = recommendation_service

    await _run_sync(sync_service)
    await _run_embedding(embedding_service)
    await _refresh_genres(igdb_client)

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        lambda: _run_sync_then_embed(sync_service, embedding_service),
        trigger=CronTrigger(hour=MainParameters.SYNC_HOUR,
                            minute=MainParameters.SYNC_MINUTE,
                            timezone='Europe/Moscow'),
        id='nightly_sync_and_embed',
        name='IGDB sync + embedding',
        max_instances=1,
        misfire_grace_time=600
    )
    scheduler.add_job(
        lambda: _refresh_genres(igdb_client),
        trigger=CronTrigger(hour=MainParameters.GENRES_REFRESH_HOUR,
                            minute=MainParameters.GENRES_REFRESH_MINUTE,
                            timezone='Europe/Moscow'),
        id='genres_refresh',
        name='Refresh genres cache',
        max_instances=1,
        misfire_grace_time=300
    )
    scheduler.start()
    logger.info(f'Scheduler started: nightly sync at'
                f'{MainParameters.SYNC_HOUR:02d}:{MainParameters.SYNC_MINUTE:02d} Moscow')
    logger.info(f'Scheduler started: refresh genres at'
                f'{MainParameters.GENRES_REFRESH_HOUR:02d}:{MainParameters.GENRES_REFRESH_MINUTE:02d} Moscow')

    yield

    logger.info('Shutting down')
    scheduler.shutdown(wait=False)
    await db.close()
    logger.info('Shutdown complete')


async def _refresh_genres(igdb_client: IGDBClient) -> None:
    try:
        igdb_client.get_genres_list(force_refresh=True)
    except Exception:
        logger.exception('Failed to refresh genres cache')


async def _run_sync(sync_service: SyncService) -> None:
    try:
        await sync_service.run()
    except Exception:
        logger.exception('Sync failed, will retry on next schedule')


async def _run_embedding(embedding_service: EmbeddingService) -> None:
    try:
        await embedding_service.run()
    except Exception:
        logger.exception('Embedding failed, will retry on next schedule')


async def _run_sync_then_embed(sync_service: SyncService,
                               embedding_service: EmbeddingService) -> None:
    await _run_sync(sync_service)
    await _run_embedding(embedding_service)


def create_app() -> FastAPI:
    app = FastAPI(
        title='Attuned API',
        lifespan=lifespan
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_methods=['*'],
        allow_headers=['*']
    )

    app.include_router(recommendations.router, prefix='/api')
    app.include_router(games.router, prefix='/api')
    app.include_router(genres.router, prefix='/api')

    return app


app = create_app()

if __name__ == '__main__':
    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=8000,
        reload=False
    )
