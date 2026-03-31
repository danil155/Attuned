from datetime import datetime
from typing import Optional
import logging

from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)


class IGDBCompany(BaseModel):
    name: str


class IGDBInvolvedCompany(BaseModel):
    company: Optional[IGDBCompany] = None
    developer: bool = False


class IGDBNamedEntity(BaseModel):
    name: str


class IGDBCover(BaseModel):
    url: Optional[str] = None

    @classmethod
    def fix_cover_url(cls, v: Optional[str]) -> Optional[str]:
        if v and v.startswith('//'):
            return 'https:' + v

        return v


class IGDBGame(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    summary: Optional[str] = None
    storyline: Optional[str] = None
    url: Optional[str] = None

    game_type: Optional[int] = None
    game_status: Optional[int] = None

    genres: list[IGDBNamedEntity] = Field(default_factory=list)
    themes: list[IGDBNamedEntity] = Field(default_factory=list)
    keywords: list[IGDBNamedEntity] = Field(default_factory=list)
    game_modes: list[IGDBNamedEntity] = Field(default_factory=list)
    played_perspectives: list[IGDBNamedEntity] = Field(default_factory=list)
    platforms: list[IGDBNamedEntity] = Field(default_factory=list)
    involved_companies: list[IGDBInvolvedCompany] = Field(default_factory=list)

    cover: Optional[IGDBCover] = None

    rating: Optional[float] = None
    rating_count: Optional[int] = None
    aggregated_rating: Optional[float] = None
    aggregated_rating_count: Optional[int] = None
    hypes: Optional[int] = None

    first_release_date: Optional[int] = None
    updated_at: Optional[int] = None

    @property
    def developers(self) -> list[str]:
        return [
            ic.company.name
            for ic in self.involved_companies if ic.developer and ic.company
        ]

    @property
    def first_release_datetime(self) -> Optional[datetime]:
        if self.first_release_date is None:
            return None

        if self.first_release_date <= 0:
            return None

        try:
            return datetime.utcfromtimestamp(self.first_release_date)
        except (OSError, ValueError, OverflowError) as e:
            logger.exception(f'Invalid timestamp: {self.first_release_date}: {e}')

            return None

    @property
    def updated_at_datetime(self) -> Optional[datetime]:
        if self.updated_at is None:
            return None

        if self.updated_at <= 0:
            return None

        try:
            return datetime.utcfromtimestamp(self.updated_at)
        except (OSError, ValueError, OverflowError) as e:
            logger.exception(f'Invalid timestamp: {self.updated_at}: {e}')
