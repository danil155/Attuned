from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from db_service import UserDataCrud
from steam_service import SteamImporter
from steam_service.client import SteamPrivateProfileError, SteamUserNotFoundError
from api.cookie import get_token_from_request

router = APIRouter(prefix='/steam', tags=['steam'])


class SteamImportRequest(BaseModel):
    steam_input: str
    cart_id: int


class SteamGamePreview(BaseModel):
    name: str
    igdb_id: int | None = None
    matched: bool = False
    cover_url: str | None = None


class SteamScanResponse(BaseModel):
    steam_id: str
    total_steam_games: int
    matched: int
    games: list[SteamGamePreview]


class SteamImportConfirmRequest(BaseModel):
    cart_id: int
    selected_igdb_ids: list[int]


class SteamImportResponse(BaseModel):
    added_to_cart: int


def _get_db(request: Request):
    return request.app.state.db


def _get_steam_importer(request: Request) -> SteamImporter:
    return request.app.state.steam_importer


@router.post(
    '/scan',
    response_model=SteamScanResponse,
    summary='Scan Steam library and return games without adding',
)
async def scan_steam_library(
        request: Request,
        body: SteamImportRequest,
        db=Depends(_get_db),
        importer: SteamImporter = Depends(_get_steam_importer),
) -> SteamScanResponse:
    token = await get_token_from_request(request)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token required'
        )

    async with db.session() as session:
        user = await UserDataCrud(session).get_user_by_token(token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )

    try:
        result = await importer.scan_library(
            steam_input=body.steam_input,
            cart_id=body.cart_id,
            user_id=user.id
        )
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return SteamScanResponse(
        steam_id=result.steam_id,
        total_steam_games=result.total_steam_games,
        matched=result.matched,
        games=result.games,
    )


@router.post(
    '/import',
    response_model=SteamImportResponse,
    summary='Importing selected games from Steam library to cart',
)
async def import_steam_library(
        request: Request,
        body: SteamImportConfirmRequest,
        db=Depends(_get_db),
        importer: SteamImporter = Depends(_get_steam_importer),
) -> SteamImportResponse:
    token = await get_token_from_request(request)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token required'
        )

    async with db.session() as session:
        user = await UserDataCrud(session).get_user_by_token(token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid token'
        )

    try:
        result = await importer.import_selected_games(cart_id=body.cart_id, selected_igdb_ids=body.selected_igdb_ids)
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return SteamImportResponse(
        added_to_cart=result
    )
