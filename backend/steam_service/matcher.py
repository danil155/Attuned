import logging
import pandas as pd
from rapidfuzz import process, fuzz

from config import settings
from db_service import GameCrud, Database, SteamMappingCrud

logger = logging.getLogger(__name__)


class SteamIGDBMatcher:
    def __init__(self, db: Database) -> None:
        self._db = db
        self._steam_apps_csv_path = settings.STEAM_APPS_CSV_PATH

    async def run(self) -> dict[int, int] | None:
        async with self._db.background_session() as session:
            existing = await SteamMappingCrud(session).get_count()
            if existing > 0:
                logger.info(f'Steam -> IGDB mapping already exists, skipping matcher')
                return None

        logger.info('Running Steam -> IGDB matcher...')

        steam_apps = self._load_steam_apps()
        logger.info(f'Loaded {len(steam_apps)} Steam apps from CSV')

        exact_map = await self._match_exact_local(steam_apps)
        logger.info(f'Exact IGDB matches: {len(exact_map)}')

        unmatched = {aid: name for aid, name in steam_apps.items() if aid not in exact_map}

        fuzzy_map = {}
        if unmatched:
            igdb_data = await self._fetch_all_igdb_names()
            fuzzy_map = await self._match_fuzzy(unmatched, igdb_data)

        logger.info(f'Fuzzy matches: {len(fuzzy_map)}')

        combined = {**fuzzy_map, **exact_map}
        await self._save(combined, exact_set=set(exact_map.keys()))
        logger.info(f'Steam matcher complete: {len(combined)} games matched')

        return combined

    def _load_steam_apps(self) -> dict[int, str]:
        df = pd.read_csv(self._steam_apps_csv_path, usecols=['appid', 'name'], dtype={'appid': int, 'name': str})
        df = df.dropna(subset=['name'])

        return dict(zip(df['appid'], df['name'].str.strip().str.lower()))

    async def _match_exact_local(self, steam_apps: dict[int, str]) -> dict[int, int]:
        result_map: dict[int, int] = {}
        names = list(steam_apps.values())

        for i in range(0, len(names), settings.BATCH_SIZE):
            batch_names = names[i:i + settings.BATCH_SIZE]

            async with self._db.background_session() as session:
                game_crud = GameCrud(session)
                name_to_id = await game_crud.get_names_to_ids_map(batch_names)

            for appid, name in steam_apps.items():
                if name.lower() in name_to_id:
                    result_map[appid] = name_to_id[name.lower()]

        return result_map

    async def _fetch_all_igdb_names(self) -> dict[str, int]:
        async with self._db.background_session() as session:
            return await GameCrud(session).get_names_to_ids_map()

    @staticmethod
    async def _match_fuzzy(unmatched: dict[int, str], name_to_id: dict[str, int]) -> dict[int, int]:
        result_map = {}
        choices = list(name_to_id.keys())

        counter = 1

        for appid, steam_name in unmatched.items():
            if counter % 512 == 0:
                logger.info(f'Fuzzy matching: {counter} / {len(unmatched.items())} games')

            match = process.extractOne(
                steam_name,
                choices,
                scorer=fuzz.QRatio,
                score_cutoff=settings.FUZZY_MIN_SCORE * 100,
            )

            if match:
                matched_name = match[0]
                result_map[appid] = name_to_id[matched_name]

            counter += 1

        return result_map

    async def _save(self, combined: dict[int, int], exact_set: set[int]) -> None:
        if not combined:
            return

        rows = [
            {
                'steam_appid': appid,
                'igdb_id': igdb_id,
                'match_method': 'exact_match' if appid in exact_set else 'fuzzy_name',
                'confidence': 1.0 if appid in exact_set else settings.FUZZY_MIN_SCORE,
            }
            for appid, igdb_id in combined.items()
        ]

        for i in range(0, len(rows), settings.DB_BATCH_SIZE):
            batch = rows[i:i + settings.DB_BATCH_SIZE]

            async with self._db.background_session() as session:
                mapping_crud = SteamMappingCrud(session)
                await mapping_crud.upsert_mappings(batch)
                await session.commit()
