import logging
import sys
from typing import AsyncGenerator
import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import load_db_config, load_igdb_config, settings
from api import games, recommendations, genres, auth, interactions, steam, subscription, feedback, platforms
from api.rate_limiter import limiter
from db_service import Database, run_migrations
from payment_db import PaymentDatabase
from igdb_service import IGDBClient
from steam_service import SteamClient, SteamImporter, CoPlaySimilarityBuilder, SteamIGDBMatcher
from services import SyncService, EmbeddingService
from recommendation_service import RecommendationService

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

    db_config = load_db_config()
    db = Database(db_config)
    await run_migrations(db.engine)
    logger.info('Main Database ready')

    payment_db = PaymentDatabase(db_config)
    logger.info('Payment Database ready')

    igdb_client = IGDBClient(load_igdb_config())
    steam_client = SteamClient()

    sync_service = SyncService(igdb_client=igdb_client, db=db)
    embedding_service = EmbeddingService(db=db)
    recommendation_service = RecommendationService(db=db)
    steam_importer = SteamImporter(steam_client=steam_client, db=db)
    similarity_builder = CoPlaySimilarityBuilder(db=db)
    steam_matcher = SteamIGDBMatcher(db=db)

    app.state.igdb_client = igdb_client
    app.state.db = db
    app.state.recommendation_service = recommendation_service
    app.state.payment_db = payment_db
    app.state.steam_importer = steam_importer

    await _run_sync(sync_service)
    await _run_steam_matching(steam_matcher)
    await _run_embedding(embedding_service)
    await _run_coplay_similarity(similarity_builder)
    await _refresh_genres(igdb_client)
    await _refresh_platforms(igdb_client)

    scheduler = AsyncIOScheduler()

    async def sync_then_embed_job():
        await _run_sync_then_embed(sync_service, embedding_service)

    async def refresh_genres_job():
        await _refresh_genres(igdb_client)

    async def refresh_platforms_job():
        await _refresh_platforms(igdb_client)

    scheduler.add_job(
        sync_then_embed_job,
        trigger=CronTrigger(hour=settings.SYNC_HOUR,
                            minute=settings.SYNC_MINUTE,
                            timezone='Europe/Moscow'),
        id='nightly_sync_and_embed',
        name='IGDB sync + embedding',
        max_instances=1,
        misfire_grace_time=600
    )
    scheduler.add_job(
        refresh_genres_job,
        trigger=CronTrigger(hour=settings.GENRES_REFRESH_HOUR,
                            minute=settings.GENRES_REFRESH_MINUTE,
                            timezone='Europe/Moscow'),
        id='genres_refresh',
        name='Refresh genres cache',
        max_instances=1,
        misfire_grace_time=300
    )
    scheduler.add_job(
        refresh_platforms_job,
        trigger=CronTrigger(hour=settings.PLATFORMS_REFRESH_HOUR,
                            minute=settings.PLATFORMS_REFRESH_MINUTE,
                            timezone='Europe/Moscow'),
        id='platforms_refresh',
        name='Refresh platforms cache',
        max_instances=1,
        misfire_grace_time=300
    )
    scheduler.start()
    logger.info(f'Scheduler started: nightly sync at '
                f'{settings.SYNC_HOUR:02d}:{settings.SYNC_MINUTE:02d} Moscow')
    logger.info(f'Scheduler started: refresh genres at '
                f'{settings.GENRES_REFRESH_HOUR:02d}:{settings.GENRES_REFRESH_MINUTE:02d} Moscow')
    logger.info(f'Scheduler started: refresh platforms at '
                f'{settings.PLATFORMS_REFRESH_HOUR:02d}:{settings.PLATFORMS_REFRESH_MINUTE:02d} Moscow')

    yield

    logger.info('Shutting down')
    scheduler.shutdown(wait=False)
    await db.close()
    await payment_db.close()
    logger.info('Shutdown complete')


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


async def _run_steam_matching(steam_matcher: SteamIGDBMatcher) -> None:
    try:
        await steam_matcher.run()
    except Exception:
        logger.exception('Steam matching failed')


async def _run_coplay_similarity(similarity_builder: CoPlaySimilarityBuilder) -> None:
    try:
        await similarity_builder.run()
    except Exception:
        logger.exception('Co-play similarity failed')


async def _refresh_genres(igdb_client: IGDBClient) -> None:
    try:
        igdb_client.get_genres_list(force_refresh=True)
    except Exception:
        logger.exception('Failed to refresh genres cache')


async def _refresh_platforms(igdb_client: IGDBClient) -> None:
    try:
        igdb_client.get_platforms_list(force_refresh=True)
    except Exception:
        logger.exception('Failed to refresh platforms cache')


async def _run_sync_then_embed(sync_service: SyncService,
                               embedding_service: EmbeddingService) -> None:
    await _run_sync(sync_service)
    await _run_embedding(embedding_service)


def create_app() -> FastAPI:
    app = FastAPI(
        title='Attuned API',
        lifespan=lifespan,
        version='1.0.0'
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=['http://localhost:3000', 'https://attuned.ru', 'https://www.attuned.ru'],
        allow_methods=['*'],
        allow_headers=['*'],
        allow_credentials=True
    )

    app.include_router(recommendations.router, prefix='/api/v1')
    app.include_router(games.router, prefix='/api/v1')
    app.include_router(genres.router, prefix='/api/v1')
    app.include_router(platforms.router, prefix='/api/v1')
    app.include_router(auth.router, prefix='/api/v1')
    app.include_router(steam.router, prefix='/api/v1')
    app.include_router(subscription.router, prefix='/api/v1')
    app.include_router(feedback.router, prefix='/api/v1')
    app.include_router(interactions.router, prefix='/ws')

    return app


app = create_app()

if __name__ == '__main__':
    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=8000,
        reload=False
    )
