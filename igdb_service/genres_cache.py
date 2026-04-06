import logging
from datetime import datetime
from typing import Optional, List
from threading import Lock

logger = logging.getLogger(__name__)


class GenresCache:
    def __init__(self):
        self._genres: List[str] = []
        self._last_update: Optional[datetime] = None
        self._lock = Lock()

    def get(self) -> List[str]:
        with self._lock:
            return self._genres.copy()

    def update(self, genres: List[str]) -> None:
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
    def last_update(self) -> Optional[datetime]:
        return self._last_update
