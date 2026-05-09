import logging
from datetime import datetime
from threading import Lock

logger = logging.getLogger(__name__)


class GenresCache:
    def __init__(self):
        self._genres: list[str] = []
        self._last_update: datetime | None = None
        self._lock = Lock()

    def get(self) -> list[str]:
        with self._lock:
            return self._genres.copy()

    def update(self, genres: list[str]) -> None:
        with self._lock:
            self._genres = genres
            self._last_update = datetime.now()
            logger.info(f'Genres cache updated: {len(genres)} genres')

    def is_stale(self, max_age_seconds: int = 86400) -> bool:
        if self._last_update is None:
            return True

        age = (datetime.now() - self._last_update).total_seconds()

        return age > max_age_seconds

    @property
    def last_update(self) -> datetime | None:
        return self._last_update
