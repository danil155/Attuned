import os
from dotenv import load_dotenv
from dataclasses import dataclass

load_dotenv()


@dataclass(frozen=True)
class IGDBConfig:
    client_id: str
    client_secret: str
    base_url: str = 'https://api.igdb.com/v4'
    auth_url: str = 'https://id.twitch.tv/oauth2/token'
    rate_limit_rps: float = 4.0
    batch_size: int = 500


@dataclass(frozen=True)
class DBConfig:
    host: str
    port: str
    name: str
    user: str
    password: str
    min_connections: int = 2
    max_connections: int = 10

    @property
    def dsn(self) -> str:
        return f'postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}'


def _require_env(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise EnvironmentError(f'Required env variable "{key}" is not set')

    return value


def load_igdb_config() -> IGDBConfig:
    return IGDBConfig(
        client_id=_require_env('IGDB_CLIENT_ID'),
        client_secret=_require_env('IGDB_CLIENT_SECRET')
    )


def load_db_config() -> DBConfig:
    return DBConfig(
        host='localhost',
        port='5432',
        name='attuned',
        user='postgres',
        password=_require_env('DB_PASSWORD')
    )
