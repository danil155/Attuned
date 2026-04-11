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
    genres_url: str = 'https://api.igdb.com/v4/genres'
    rate_limit_rps: float = 4.0
    batch_size: int = 500


@dataclass(frozen=True)
class DBConfig:
    host: str
    port: str
    name: str
    user: str
    password: str

    mysql_host: str
    mysql_port: str
    mysql_name: str
    mysql_user: str
    mysql_password: str

    app_pool_size: int = 10
    app_max_overflow: int = 20
    app_pool_timeout: float = 5.0

    background_pool_size: int = 2
    background_max_overflow: int = 1

    pool_recycle: int = 1800

    mysql_pool_size: int = 5
    mysql_max_overflow: int = 10
    mysql_pool_recycle: int = 3600

    @property
    def dsn(self) -> str:
        return f'postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}'

    @property
    def mysql_dsn(self) -> str:
        return f'mysql+aiomysql://{self.mysql_user}:{self.mysql_password}@{self.mysql_host}:{self.mysql_port}' \
               f'/{self.mysql_name}?charset=utf8mb4'


def load_igdb_config() -> IGDBConfig:
    return IGDBConfig(
        client_id=_require_env('IGDB_CLIENT_ID'),
        client_secret=_require_env('IGDB_CLIENT_SECRET')
    )


def load_db_config() -> DBConfig:
    return DBConfig(
        host=_require_env('DB_HOST'),
        port=_require_env('DB_PORT'),
        name=_require_env('DB_NAME'),
        user=_require_env('DB_USER'),
        password=_require_env('DB_PASSWORD'),
        mysql_host=_require_env('MYSQL_DB_HOST'),
        mysql_port=_require_env('MYSQL_DB_PORT'),
        mysql_name=_require_env('MYSQL_DB_NAME'),
        mysql_user=_require_env('MYSQL_DB_USER'),
        mysql_password=_require_env('MYSQL_DB_PASSWORD')
    )


def _require_env(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise EnvironmentError(f'Required env variable "{key}" is not set')

    return value
