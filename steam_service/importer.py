from dataclasses import dataclass, field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db_service import Database, SearchCrud, UserCartCrud, UserDataCrud
from db_service.models import Game
from steam_service.client import SteamClient, SteamGame, SteamPrivateProfileError, SteamUserNotFoundError
from config import settings


@dataclass
class ImportResult:
    steam_id: str
    total_steam_games: int
    matched: int
    added_to_cart: int
    unmatched_names: list[str] = field(default_factory=list)


class SteamImporter:
    def __init__(self, steam_client: SteamClient, db: Database) -> None:
        self._steam = steam_client
        self._db = db

    async def import_to_cart(self, steam_input: str, cart_id: int, user_id: int) -> ImportResult:
        async with self._db.session() as session:
            cart_crud = UserCartCrud(session)
            cart = await cart_crud.get_cart(cart_id)

            if not cart:
                raise ValueError(f'Cart {cart_id} not found')
            if cart.user_id != user_id:
                raise PermissionError(f'Cart {cart_id} does not belong to user {user_id}')

        result = await self._steam.get_owned_games(steam_input)
        steam_games = result.games

        if not steam_games:
            return ImportResult(
                steam_id=result.steam_id,
                total_steam_games=0,
                matched=0,
                added_to_cart=0,
            )

        matched_igdb_ids, unmatched = await self._match_games(steam_games)

        added = await self._fill_cart(cart_id, matched_igdb_ids)

        return ImportResult(
            steam_id=result.steam_id,
            total_steam_games=len(steam_games),
            matched=len(matched_igdb_ids),
            added_to_cart=added,
            unmatched_names=unmatched,
        )

    async def _match_games(self, steam_games: list[SteamGame]) -> tuple[list[int], list[str]]:
        matched_ids: list[int] = []
        unmatched: list[str] = []

        async with self._db.session() as session:
            for steam_game in steam_games:
                igdb_id = await self._find_igdb_match(session, steam_game.name)
                if igdb_id is not None:
                    matched_ids.append(igdb_id)
                else:
                    unmatched.append(steam_game.name)

        return matched_ids, unmatched

    async def _fill_cart(self, cart_id: int, igdb_ids: list[int]) -> int:
        if not igdb_ids:
            return 0

        added = 0
        async with self._db.session() as session:
            cart_crud = UserCartCrud(session)
            cart = await cart_crud.get_cart(cart_id)

            if not cart:
                return 0

            existing = set(cart.games)
            new_ids = [igdb_id for igdb_id in igdb_ids if igdb_id not in existing]

            if new_ids:
                cart.games = list(existing) + new_ids
                await session.flush()
                added = len(new_ids)

        return added

    async def _find_igdb_match(self, session: AsyncSession, steam_name: str) -> int | None:
        exact = await session.execute(
            select(Game.igdb_id)
            .where(func.lower(Game.name) == steam_name.lower(), Game.game_type.in_(settings.allowed_game_types_tuple))
            .limit(1)
        )

        row = exact.scalar_one_or_none()
        if row is not None:
            return row

        fuzzy = await session.execute(
            select(Game.igdb_id, func.similarity(Game.name, steam_name).label('sim'))
            .where(Game.name.bool_op('%')(steam_name),
                   Game.game_type.in_(settings.allowed_game_types_tuple),
                   func.similarity(Game.name, steam_name) >= settings.SIMILARITY_THRESHOLD,
                   )
            .order_by(func.similarity(Game.name, steam_name).desc())
            .limit(1)
        )

        row = fuzzy.first()
        if row is not None:
            return row.igdb_id

        return None
