from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel

from db_service import UserDataCrud
from steam_service import SteamImporter
from steam_service.client import SteamPrivateProfileError, SteamUserNotFoundError

router = APIRouter(prefix='/steam', tags=['steam'])


class SteamImportRequest(BaseModel):
    steam_input: str
    cart_id: int


class SteamImportResponse(BaseModel):
    steam_id: str
    total_steam_games: int
    matched: int
    added_to_cart: int
    unmatched_names: list[str]


def _get_db(request: Request):
    return request.app.state.db


def _get_steam_importer(request: Request) -> SteamImporter:
    return request.app.state.steam_importer


@router.post(
    '/import',
    response_model=SteamImportResponse,
    summary='Importing the Steam library to the cart',
    description=(
        'Accept a link to Steam profile, vanity name or Steam ID. '
        'Only works with open profiles. '
        'Finds games from the library in IGDB and adds them to the selected cart.'
    ),
)
async def import_steam_library(
        body: SteamImportRequest,
        x_token: str = Header(..., description='Access token'),
        db=Depends(_get_db),
        importer: SteamImporter = Depends(_get_steam_importer),
) -> SteamImportResponse:
    async with db.session() as session:
        user = await UserDataCrud(session).get_user_by_token(x_token)

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')

    try:
        result = await importer.import_to_cart(steam_input=body.steam_input, cart_id=body.cart_id, user_id=user.id)
    except SteamPrivateProfileError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Steam profile is private. Please make your game library public.',
        )
    except SteamUserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Steam user not found.',
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='This cart does not belong to you.',
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return SteamImportResponse(
        steam_id=result.steam_id,
        total_steam_games=result.total_steam_games,
        matched=result.matched,
        added_to_cart=result.added_to_cart,
        unmatched_names=result.unmatched_names,
    )
