from fastapi import APIRouter, Request

router = APIRouter(prefix='/platforms', tags=['platforms'])


@router.get('')
async def get_platforms(request: Request) -> dict:
    igdb_client = request.app.state.igdb_client

    return igdb_client.get_platforms_list()
