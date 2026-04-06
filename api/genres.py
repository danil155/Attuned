from fastapi import APIRouter, Request
from typing import List

router = APIRouter(prefix='/genres', tags=['genres'])


@router.get('/')
async def get_genres(request: Request) -> List[str]:
    igdb_client = request.app.state.igdb_client

    return igdb_client.get_genres_list()
