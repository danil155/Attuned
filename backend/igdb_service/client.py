import logging
import time
from datetime import datetime, timedelta
from typing import Generator
import requests

from config import IGDBConfig, settings
from igdb_service.schemas import IGDBGame
from igdb_service.genres_cache import GenresCache
from igdb_service.platforms_cache import PlatformsCache

logger = logging.getLogger(__name__)

PLATFORM_TYPE_NAMES = {
    1: 'Консоли',
    2: 'Аркады',
    3: 'Прочее',
    4: 'ПК и ОС',
    5: 'Портативные',
    6: 'Компьютеры',
}

POPULAR_PLATFORMS = {
    'Консоли': [
        'PlayStation 5', 'PlayStation 4', 'PlayStation 3', 'Xbox Series X|S', 'Xbox One', 'Xbox 360', 'Nintendo Switch',
    ],
    'Портативные': [
        'Nintendo 3DS', 'Nintendo DS', 'PlayStation Vita', 'PlayStation Portable', 'Game Boy Advance',
    ],
    'Компьютеры': [
        'Apple II', 'ZX Spectrum', 'Atari ST/STE',
    ],
    'ПК и ОС': [
        'PC (Microsoft Windows)', 'Mac', 'Linux', 'Android'
    ],
}

POPULAR_THRESHOLD = 7

CATEGORY_ORDER = ['ПК и ОС', 'Консоли', 'Портативные', 'Аркады', 'Компьютеры', 'Прочее']


class IGDBClient:
    def __init__(self, config: IGDBConfig) -> None:
        self._config = config
        self._session = requests.Session()
        self._access_token: str | None = None
        self._token_expires_at: str | None = None
        self._last_request_at: float = 0.0
        self._genres_cache = GenresCache()
        self._platforms_cache = PlatformsCache()

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

    def get_genres_list(self, force_refresh: bool = False) -> list[str]:
        if not force_refresh and not self._genres_cache.is_stale():
            cached = self._genres_cache.get()

            if cached:
                return cached

        logger.info('Fetching genres from IGDB API')
        headers = {
            'Client-ID': self._config.client_id,
            'Authorization': f'Bearer {self._access_token}',
        }

        response = self._session.post(
            self._config.genres_url,
            headers=headers,
            data=f'fields name; sort name asc; limit {self._config.batch_size};'
        )

        if response.status_code != 200:
            raise Exception(f'Failed to fetch genres: {response.status_code} - {response.text}')

        genres = response.json()
        genres = [item['name'] for item in genres]
        genres.insert(0, 'Все')
        self._genres_cache.update(genres)

        return genres

    def get_platforms_list(self, force_refresh: bool = False) -> dict:
        if not force_refresh and not self._platforms_cache.is_stale():
            cached = self._platforms_cache.get()

            if cached:
                return cached

        logger.info('Fetching platforms from IGDB API')
        headers = {
            'Client-ID': self._config.client_id,
            'Authorization': f'Bearer {self._access_token}',
        }

        response = self._session.post(
            self._config.platforms_url,
            headers=headers,
            data=f'fields name, platform_type; sort name asc; limit {self._config.batch_size};'
        )

        if response.status_code != 200:
            raise Exception(f'Failed to fetch platforms: {response.status_code} - {response.text}')

        raw = response.json()

        grouped: dict[str, list[str]] = {}
        for item in raw:
            type_id = item.get('platform_type') or 3
            category_name = PLATFORM_TYPE_NAMES.get(type_id, 'Прочее')
            grouped.setdefault(category_name, [])
            grouped[category_name].append(item['name'])

        result = {}
        for category, platforms in grouped.items():
            popular = POPULAR_PLATFORMS.get(category, [])
            popular_in_cat = [p for p in popular if p in platforms]

            if len(platforms) > POPULAR_THRESHOLD:
                result[category] = {
                    'popular': popular_in_cat,
                    'rest': [p for p in platforms if p not in popular_in_cat],
                }
            else:
                result[category] = {
                    'popular': platforms,
                    'rest': [],
                }

        result = {
            cat: result[cat]
            for cat in CATEGORY_ORDER
            if cat in result
        }

        self._platforms_cache.update(result)

        return result

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
        categories = ','.join(str(c) for c in settings.allowed_game_types_tuple)
        body = f"""
        fields {settings.GAME_FIELDS};
        where id > {last_id} & game_type = ({categories}) & version_parent = null;
        sort id asc;
        limit {self._config.batch_size};
        """

        return self._post('games', body)

    # формирует запрос для получения игр, обновленных после since
    def _fetch_games_updated_after(self, since_ts: int) -> list[dict]:
        categories = ','.join(str(c) for c in settings.allowed_game_types_tuple)
        body = f"""
                fields {settings.GAME_FIELDS};
                where updated_at > {since_ts} & game_type = ({categories}) & version_parent = null;
                sort updated_at asc;
                limit {self._config.batch_size};
                """

        return self._post('games', body)
