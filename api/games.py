from fastapi import APIRouter, Query, Request, Depends

from api.schemas import GameSearchResult, GameSearchResponse
from db_service.crud import SearchCrud

router = APIRouter(prefix='/games', tags=['games'])


def _get_db(request: Request):
    return request.app.state.db


@router.get('/search',
            response_model=GameSearchResponse,
            summary='Search for games by name'
            )
async def search_games(q: str = Query(min_length=2, description='Search query'),
                       limit: int = Query(default=20, ge=1, le=50),
                       db=Depends(_get_db)) -> GameSearchResponse:
    async with db.session() as session:
        repo = SearchCrud(session)
        games = await repo.search_by_name(q, limit=limit)

    return GameSearchResponse(
        items=[
            GameSearchResult(
                igdb_id=g.igdb_id,
                name=g.name,
                cover_url=g.cover_url,
                genres=g.genres,
                first_release_date=(
                    g.first_release_date.strftime('%Y-%m-%d') if g.first_release_date else None
                )
            )
            for g in games]
    )
