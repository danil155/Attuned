import logging
import time
from datetime import datetime, timedelta
from typing import Generator, Optional
import requests

from config import IGDBConfig
from igdb_service.schemas import IGDBGame

logger = logging.getLogger(__name__)

# main game, remake, remaster
ALLOWED_GAME_TYPES = (0, 8, 9)

GAME_FIELDS = ','.join([
    'id', 'name', 'slug', 'summary', 'storyline', 'url', 'game_type', 'game_status', 'genres.name', 'themes.name',
    'keywords.name', 'game_modes.name', 'player_perspectives.name', 'platforms.name', 'involved_companies.company.name',
    'involved_companies.developer',
    'cover.url',
    'rating', 'rating_count',
    'aggregated_rating', 'aggregated_rating_count',
    'hypes',
    'first_release_date', 'updated_at'
])


class IGDBClient:
    def __init__(self, config: IGDBConfig) -> None:
        self._config = config
        self._session = requests.Session()
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[str] = None
        self._last_request_at: float = 0.0

    # используем пагинацию по id и выкачиваем все игры из IGDB
    def fetch_all_games(self) -> Generator[list[IGDBGame], None, None]:
        last_id = 0
        total_fetched = 0

        logger.info('Starting full IGDB games dump')

        while True:
            raw = self._fetch_games_after_id(last_id)

            if not raw:
                break

            games = [IGDBGame.model_validate(item) for item in raw]
            yield games

            last_id = raw[-1]['id']
            total_fetched += len(games)

            logger.info(f'Fetched {total_fetched} games so far, last id={last_id}')

        logger.info(f'Full dump complete: {total_fetched} games total')

    # возвращает игры, обновленные после since
    def fetch_update_games(self, since: datetime) -> Generator[list[IGDBGame], None, None]:
        since_ts = int(since.timestamp())
        last_updated_ts = since_ts
        total_fetched = 0

        logger.info(f'Starting incremental sync since {since.isoformat()}')

        while True:
            raw = self._fetch_games_updated_after(last_updated_ts)

            if not raw:
                break

            games = [IGDBGame.model_validate(item) for item in raw]
            yield games

            last_updated_ts = raw[-1]['updated_at']
            total_fetched += len(games)

            logger.info(f'Incremental: fetched {total_fetched} games, last updated_at={last_updated_ts}')

            if len(raw) < self._config.batch_size:
                break

        logger.info(f'Incremental: sync complete: {total_fetched} games updated')

    # обновляем access_token
    def _refresh_access_token(self) -> None:
        logger.debug('Refresh IGDB access token')

        response = self._session.post(
            self._config.auth_url,
            params={
                'client_id': self._config.client_id,
                'client_secret': self._config.client_secret,
                'grant_type': 'client_credentials'
            }
        )

        if response.status_code != 200:
            raise Exception(f'Error get access token: {response.status_code} - {response.text}')

        data = response.json()
        self._access_token = data['access_token']
        self._token_expires_at = datetime.now() + timedelta(seconds=data['expires_in'] - 604800)

        logger.info(f'IGDB token refreshed, expires at {self._token_expires_at}')

    # проверяем, не умер ли access_token
    def _ensure_valid_access_token(self) -> None:
        if self._access_token and self._token_expires_at:
            if datetime.now() < self._token_expires_at:
                return

        self._refresh_access_token()

    # выставляем ограничение, чтобы не выбить 429 ошибку (Too Many Requests)
    def _rate_limit(self) -> None:
        min_interval = 1.0 / self._config.rate_limit_rps
        elapsed = time.monotonic() - self._last_request_at
        wait = min_interval - elapsed

        if wait > 0:
            time.sleep(wait)

        self._last_request_at = time.monotonic()

    # прокидываем запрос IGDB
    def _post(self, endpoint: str, body: str) -> list[dict]:
        self._ensure_valid_access_token()
        self._rate_limit()

        url = f'{self._config.base_url}/{endpoint}'
        headers = {
            'Client-ID': self._config.client_id,
            'Authorization': f'Bearer {self._access_token}',
            'Content-Type': 'text/plain'
        }

        response = self._session.post(url, headers=headers, data=body.strip())

        if response.status_code == 200:
            return response.json()

        raise Exception(f'IGDB request failed: {response.status_code} - {response.text}')

    # формирует запрос для получения всех игр, начиная с last_id
    def _fetch_games_after_id(self, last_id: int) -> list[dict]:
        categories = ','.join(str(c) for c in ALLOWED_GAME_TYPES)
        body = f"""
        fields {GAME_FIELDS};
        where id > {last_id} & game_type = ({categories}) & version_parent = null;
        sort id asc;
        limit {self._config.batch_size};
        """

        return self._post('games', body)

    # формирует запрос для получения игр, обновленных после since
    def _fetch_games_updated_after(self, since_ts: int) -> list[dict]:
        categories = ','.join(str(c) for c in ALLOWED_GAME_TYPES)
        body = f"""
                fields {GAME_FIELDS};
                where updated_at > {since_ts} & game_type = ({categories}) & version_parent = null;
                sort updated_at asc;
                limit {self._config.batch_size};
                """

        return self._post('games', body)
