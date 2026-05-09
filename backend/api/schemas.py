from pydantic import BaseModel


class GameSearchResult(BaseModel):
    igdb_id: int
    name: str
    cover_url: str | None = None
    genres: list[str]
    first_release_date: str | None = None


class GameSearchResponse(BaseModel):
    items: list[GameSearchResult]
