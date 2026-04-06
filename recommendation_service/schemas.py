from pydantic import BaseModel, Field, model_validator

from config_vars import RecommendationParameters


class RecommendationRequest(BaseModel):
    liked_igdb_ids: list[int] = Field(min_length=1)
    disliked_igdb_ids: list[int] = Field(default_factory=list)
    seen_igdb_ids: list[int] = Field(default_factory=list)
    limit: int = Field(default=RecommendationParameters.DEFAULT_LIMIT, ge=1, le=RecommendationParameters.MAX_TOTAL)
    only_released: bool = True

    @model_validator(mode='after')
    def check_total_limit(self) -> "RecommendationRequest":
        already_seen = len(self.seen_igdb_ids)
        if already_seen >= RecommendationParameters.MAX_TOTAL:
            raise ValueError(f'Maximum of {RecommendationParameters.MAX_TOTAL} recommendations per session reached')

        self.limit = min(self.limit, RecommendationParameters.MAX_TOTAL - already_seen)

        return self


class RecommendedGame(BaseModel):
    igdb_id: int
    name: str
    summary_small: str | None
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
