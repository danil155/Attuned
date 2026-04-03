from pydantic import BaseModel, Field, model_validator

MAX_TOTAL = 30
DEFAULT_LIMIT = 10


class RecommendationRequest(BaseModel):
    liked_igdb_ids: list[int] = Field(min_length=1)
    disliked_igdb_ids: list[int] = Field(default_factory=list)
    seen_igdb_ids: list[int] = Field(default_factory=list)
    limit: int = Field(default=DEFAULT_LIMIT, ge=1, le=MAX_TOTAL)

    @model_validator(mode='after')
    def check_total_limit(self):
        already_seen = len(self.seen_igdb_ids)
        if already_seen >= MAX_TOTAL:
            raise ValueError(f'Maximum of {MAX_TOTAL} recommendations per session reached')

        self.limit = min(self.limit, MAX_TOTAL - already_seen)

        return self


class RecommendedGame(BaseModel):
    igdb_id: int
    name: str
    summary: str | None
    cover_url: str | None
    igdb_url: str | None
    genres: list[str]
    platforms: list[str]
    rating: float | None
    first_release_date: str | None

    match_percent: int


class RecommendationResponse(BaseModel):
    items: list[RecommendedGame]
    total_seen: int
    has_more: bool
