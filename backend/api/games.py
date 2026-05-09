from fastapi import APIRouter, Query, Request, Depends, status, HTTPException

from api.cookie import get_token_from_request
from api.schemas import GameSearchResult, GameSearchResponse
from db_service import SearchCrud, PopularGamesCrud, UserDataCrud

router = APIRouter(prefix='/games', tags=['games'])


def _get_db(request: Request):
    return request.app.state.db


@router.get('/search',
            response_model=GameSearchResponse,
            summary='Search for games by name')
async def search_games(
        request: Request,
        q: str = Query(description='Search query'),
        limit: int = Query(default=20, ge=1, le=50),
        db=Depends(_get_db)
) -> GameSearchResponse:
    token = await get_token_from_request(request)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token required'
        )

    async with db.session() as session:
        repo = SearchCrud(session)
        user_id = (await UserDataCrud(session).get_user_by_token(token)).id
        games = await repo.search_by_name(q, user_id=user_id, limit=limit)

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


@router.get('/search_by_ids',
            response_model=GameSearchResponse,
            summary='Search for games by id')
async def search_games_by_ids(igdb_ids: str, db=Depends(_get_db)) -> GameSearchResponse:
    igdb_ids = list(map(int, igdb_ids.split(',')))

    async with db.session() as session:
        repo = SearchCrud(session)

        games = []
        for igdb_id in igdb_ids:
            games.append(await repo.search_by_id(igdb_id))

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


@router.get(
    '/popular',
    response_model=GameSearchResponse,
    summary='Get popular games based on likes'
)
async def get_popular_games(
        limit: int = Query(default=10, ge=1, le=50),
        db=Depends(_get_db)
) -> GameSearchResponse:
    async with db.session() as session:
        repo = PopularGamesCrud(session)
        games = await repo.get_popular_games_by_likes(limit=limit)

    return GameSearchResponse(
        items=[
            GameSearchResult(
                igdb_id=g.igdb_id,
                name=g.name,
                cover_url=g.cover_url,
                genres=g.genres,
                first_release_date=g.first_release_date.strftime('%Y-%m-%d') if g.first_release_date else None
            )
            for g in games
        ]
    )
