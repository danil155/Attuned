from config import load_db_config, load_igdb_config
from db_service.connection import Database
from db_service.migrations import run_migrations
from db_service.crud import GameCrud
from igdb_service.client import IGDBClient
import asyncio


async def main() -> None:
    db = Database(load_db_config())
    await run_migrations(db.engine)

    igdb_client = IGDBClient(load_igdb_config())

    main_obj = Main(igdb_client=igdb_client, db=db)

    await main_obj.full_sync()


class Main:
    def __init__(self, igdb_client: IGDBClient, db: Database) -> None:
        self._igdb = igdb_client
        self._db = db

    async def full_sync(self) -> None:
        print('FULL SYNC STARTED')
        total = 0

        try:
            for batch in self._igdb.fetch_all_games():
                async with self._db.background_session() as session:
                    count = await GameCrud(session).upsert_batch(batch)

                total += count
                print(f'Updated {count} games (total: {total})')

            print(f'FULL SYNC DONE: {total} games')
        except Exception as e:
            print(f'FULL_SYNC_FAILED after {total} games')
            raise


if __name__ == '__main__':
    asyncio.run(main())
