from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class IGDBCompany(BaseModel):
    name: str


class IGDBInvolvedCompany(BaseModel):
    company: IGDBCompany | None = None
    developer: bool = False


class IGDBNamedEntity(BaseModel):
    name: str


class IGDBCover(BaseModel):
    url: str | None = None

    @field_validator('url', mode='before')
    @classmethod
    def fix_cover_url(cls, v: str | None) -> str | None:
        if not v:
            return v

        if v.startswith('//'):
            v = 'https:' + v

        return v.replace('/t_thumb/', '/t_cover_big/')


class IGDBGame(BaseModel):
    id: int
    name: str
    slug: str | None = None
    summary: str | None = None
    storyline: str | None = None
    url: str | None = None

    game_type: int | None = None
    game_status: int | None = None

    genres: list[IGDBNamedEntity] = Field(default_factory=list)
    themes: list[IGDBNamedEntity] = Field(default_factory=list)
    keywords: list[IGDBNamedEntity] = Field(default_factory=list)
    game_modes: list[IGDBNamedEntity] = Field(default_factory=list)
    player_perspectives: list[IGDBNamedEntity] = Field(default_factory=list)
    platforms: list[IGDBNamedEntity] = Field(default_factory=list)
    involved_companies: list[IGDBInvolvedCompany] = Field(default_factory=list)

    cover: IGDBCover | None = None

    rating: float | None = None
    rating_count: int | None = None
    aggregated_rating: float | None = None
    aggregated_rating_count: int | None = None
    hypes: int | None = None

    first_release_date: int | None = None
    updated_at: int | None = None

    @property
    def developers(self) -> list[str]:
        return [
            ic.company.name
            for ic in self.involved_companies if ic.developer and ic.company
        ]

    @property
    def first_release_datetime(self) -> datetime | None:
        if self.first_release_date is None:
            return None

        if self.first_release_date <= 0:
            return None

        try:
            return datetime.utcfromtimestamp(self.first_release_date)
        except (OSError, ValueError, OverflowError) as e:
            print(f'Invalid timestamp: {self.first_release_date}: {e}')

            return None

    @property
    def updated_at_datetime(self) -> datetime | None:
        if self.updated_at is None:
            return None

        if self.updated_at <= 0:
            return None

        try:
            return datetime.utcfromtimestamp(self.updated_at)
        except (OSError, ValueError, OverflowError) as e:
            print(f'Invalid timestamp: {self.updated_at}: {e}')
