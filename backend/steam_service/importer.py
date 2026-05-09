from dataclasses import dataclass

from db_service import Database, UserCartCrud, GameCrud
from steam_service.client import SteamClient


@dataclass
class ScanResult:
    steam_id: str
    total_steam_games: int
    matched: int
    games: list[dict]


class SteamImporter:
    def __init__(self, steam_client: SteamClient, db: Database) -> None:
        self._steam = steam_client
        self._db = db

    async def scan_library(self, steam_input: str, cart_id: int, user_id: int) -> ScanResult:
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
            return ScanResult(
                steam_id=result.steam_id,
                total_steam_games=0,
                matched=0,
                games=[],
            )

        async with self._db.session() as session:
            cart = await UserCartCrud(session).get_cart(cart_id)
            existing_in_cart = set(cart.games) if cart else set()

        games_preview = []
        matched_count = 0

        async with self._db.session() as session:
            game_crud = GameCrud(session)
            for steam_game in steam_games:
                igdb_match = await self._find_igdb_match(steam_game.name)
                matched = igdb_match is not None

                if matched:
                    matched_count += 1

                    cover_url = await game_crud.get_cover_url(igdb_match)

                games_preview.append({
                    'name': steam_game.name,
                    'igdb_id': igdb_match,
                    'matched': matched,
                    'cover_url': cover_url,
                    'already_in_cart': igdb_match in existing_in_cart if igdb_match else False
                })

        return ScanResult(
            steam_id=result.steam_id,
            total_steam_games=len(steam_games),
            matched=matched_count,
            games=games_preview,
        )

    async def import_selected_games(
            self,
            cart_id: int,
            selected_igdb_ids: list[int]
    ) -> int:
        async with self._db.session() as session:
            cart_crud = UserCartCrud(session)
            cart = await cart_crud.get_cart(cart_id)

            if not cart:
                raise ValueError(f'Cart {cart_id} not found')

            added = 0
            existing = set(cart.games)
            new_ids = [igdb_id for igdb_id in selected_igdb_ids if igdb_id not in existing]

            if new_ids:
                cart.games = list(existing) + new_ids
                await session.flush()
                added = len(new_ids)

        return added

    async def _find_igdb_match(self, steam_name: str) -> int | None:
        async with self._db.session() as session:
            game_crud = GameCrud(session)

            return await game_crud.find_igdb_match(steam_name)
