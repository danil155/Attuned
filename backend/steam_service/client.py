import asyncio
import re
from dataclasses import dataclass
from enum import IntEnum
import aiohttp

from config import settings


class ProfilesVisibility(IntEnum):
    PRIVATE = 1
    FRIENDS_ONLY = 2
    PUBLIC = 3


@dataclass
class SteamGame:
    appid: int
    name: str
    playtime_forever: int


@dataclass
class SteamImportResult:
    steam_id: str
    games: list[SteamGame]


class SteamPrivateProfileError(Exception):
    """The profile is closed - the list of games is unavailable"""


class SteamUserNotFoundError(Exception):
    """User was not found by vanity URL or Steam ID"""


class SteamAPIError(Exception):
    """Common Steam API error"""


class SteamClient:
    def __init__(self) -> None:
        self._last_request_at: float = 0.0
        self._lock = asyncio.Lock()

    async def get_owned_games(self, steam_input: str) -> SteamImportResult:
        steam_id = await self._resolve_steam_id(steam_input)

        async with aiohttp.ClientSession() as session:
            games = await self._fetch_owned_games(session, steam_id)

        return SteamImportResult(steam_id=steam_id, games=games)

    async def _resolve_steam_id(self, user_input: str) -> str:
        user_input = user_input.strip().rstrip('/')

        match = re.search(r'/profiles/(\d{17})', user_input)
        if match:
            return match.group(1)

        match = re.search(r'/id/([^/?\s]+)', user_input)
        if match:
            return await self._vanity_to_steam_id(match.group(1))

        if re.match(r'^\d{17}$', user_input):
            return user_input

        if re.match(r'^[a-zA-Z0-9_-]{2,32}$', user_input):
            return await self._vanity_to_steam_id(user_input)

        raise SteamAPIError(f'Cannot parse Steam input: {user_input!r}')

    @staticmethod
    async def _vanity_to_steam_id(vanity: str) -> str:
        profile_url = f'https://steamcommunity.com/id/{vanity}'

        async with aiohttp.ClientSession() as session:
            async with session.get(
                    profile_url,
                    timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status != 200:
                    raise Exception(f'HTTPS access error')

                html = await resp.text()

                match = re.search(r'"steamid":"(\d+)"', html)
                if match:
                    return match.group(1)

                match = re.search(r'data-steamid="(\d+)"', html)
                if match:
                    return match.group(1)
        raise SteamUserNotFoundError(f'Vanity URL not found: {profile_url!r}')

    async def _fetch_owned_games(self, session: aiohttp.ClientSession, steam_id: str) -> list[SteamGame]:
        await self._rate_limit()

        async with session.get(
            f'{settings.STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/',
            params={
                'key': settings.STEAM_API_KEY,
                'steamid': steam_id,
                'format': 'json',
                'include_appinfo': 1,
                'include_played_free_games': 1,
            },
            timeout=aiohttp.ClientTimeout(total=15),
        ) as resp:
            if resp.status != 200:
                raise SteamAPIError(f'Steam API returned {resp.status}')

            data = await resp.json()

        response = data.get('response', {})

        if 'games' not in response:
            raise SteamPrivateProfileError(f'Steam profile {steam_id} is private or has no games')

        seen_names = set()
        unique_games = []

        for g in response['games']:
            name = g.get('name', '')
            if not name:
                continue

            name_lower = name.lower()

            if any(keyword in name_lower for keyword in ['test server', 'experimental server', 'sdk', 'tool']):
                continue

            seen_names.add(name_lower)
            unique_games.append(
                SteamGame(
                    appid=g['appid'],
                    name=name,
                    playtime_forever=g.get('playtime_forever', 0),
                )
            )

        return unique_games

    async def _rate_limit(self) -> None:
        async with self._lock:
            now = asyncio.get_event_loop().time()
            elapsed = now - self._last_request_at
            wait = settings.RATE_LIMIT_DELAY - elapsed

            if wait > 0:
                await asyncio.sleep(wait)

            self._last_request_at = asyncio.get_event_loop().time()
