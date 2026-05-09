from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
import json

load_dotenv()


class Settings(BaseSettings):
    # IGDB CONFIG
    IGDB_CLIENT_ID: str = Field(..., alias='IGDB_CLIENT_ID')
    IGDB_CLIENT_SECRET: str = Field(..., alias='IGDB_CLIENT_SECRET')
    BASE_URL: str = Field('https://api.igdb.com/v4', alias='BASE_URL')
    AUTH_URL: str = Field('https://id.twitch.tv/oauth2/token', alias='AUTH_URL')
    GENRES_URL: str = Field('https://api.igdb.com/v4/genres', alias='GENRES_URL')
    PLATFORMS_URL: str = Field('https://api.igdb.com/v4/platforms', alias='PLATFORMS_URL')
    RATE_LIMIT_RPS: float = Field(4.0, alias='RATE_LIMIT_RPS')
    BATCH_SIZE: int = Field(500, alias='BATCH_SIZE')

    # MAIN DB
    DB_HOST: str = Field(..., alias='DB_HOST')
    DB_PORT: int = Field(5432, alias='DB_PORT')
    DB_NAME: str = Field(..., alias='DB_NAME')
    DB_USER: str = Field(..., alias='DB_USER')
    DB_PASSWORD: str = Field(..., alias='DB_PASSWORD')

    # PAYMENT DB
    MYSQL_DB_HOST: str = Field(..., alias='MYSQL_DB_HOST')
    MYSQL_DB_PORT: int = Field(3306, alias='MYSQL_DB_PORT')
    MYSQL_DB_NAME: str = Field(..., alias='MYSQL_DB_NAME')
    MYSQL_DB_USER: str = Field(..., alias='MYSQL_DB_USER')
    MYSQL_DB_PASSWORD: str = Field(..., alias='MYSQL_DB_PASSWORD')

    # CONNECTION_POOLS
    APP_POOL_SIZE: int = Field(10, alias='APP_POOL_SIZE')
    APP_MAX_OVERFLOW: int = Field(20, alias='APP_MAX_OVERFLOW')
    APP_POOL_TIMEOUT: float = Field(5.0, alias='APP_POOL_TIMEOUT')
    BACKGROUND_POOL_SIZE: int = Field(2, alias='BACKGROUND_POOL_SIZE')
    BACKGROUND_MAX_OVERFLOW: int = Field(1, alias='BACKGROUND_MAX_OVERFLOW')
    POOL_RECYCLE: int = Field(1800, alias='POOL_RECYCLE')

    MYSQL_POOL_SIZE: int = Field(5, alias='MYSQL_POOL_SIZE')
    MYSQL_MAX_OVERFLOW: int = Field(10, alias='MYSQL_MAX_OVERFLOW')
    MYSQL_POOL_RECYCLE: int = Field(3600, alias='MYSQL_POOL_RECYCLE')

    # IGDB Parameters
    ALLOWED_GAME_TYPES: str = Field('0,8,9', alias='ALLOWED_GAME_TYPES')
    GAME_FIELDS: str = Field(
        'id,name,slug,summary,storyline,url,game_type,game_status,genres.name,themes.name,keywords.name,'
        'game_modes.name,player_perspectives.name,platforms.name,involved_companies.company.name,'
        'involved_companies.developer,cover.url,rating,rating_count,aggregated_rating,aggregated_rating_count,'
        'hypes,first_release_date,updated_at',
        alias='GAME_FIELDS'
    )

    # DB Parameters
    EMBEDDINGS_DIM: int = Field(384, alias='EMBEDDINGS_DIM')

    # Embedding Parameters
    MODEL_NAME: str = Field('all-MiniLM-L6-v2', alias='MODEL_NAME')
    DB_BATCH_SIZE: int = Field(512, alias='DB_BATCH_SIZE')
    MODEL_BATCH_SIZE: int = Field(64, alias='MODEL_BATCH_SIZE')
    MAX_KEYWORDS: int = Field(50, alias='MAX_KEYWORDS')
    SEMANTIC_WEIGHT: float = Field(0.6, alias='SEMANTIC_WEIGHT')
    TAGS_WEIGHT: float = Field(0.4, alias='TAGS_WEIGHT')

    MAX_REVIEWS_PER_GAME: int = Field(30, alias='MAX_REVIEWS_PER_GAME')
    MAX_CHARS_PER_GAME: int = Field(2000, alias='MAX_CHARS_PER_GAME')
    MIN_REVIEW_LEN: int = Field(50, alias='MIN_REVIEW_LEN')
    REVIEW_CSV_PATH: str = Field('SteamReviewDataset1M/reviews.csv', alias='REVIEW_CSV_PATH')

    # Sync Parameters
    FULL_SYNC_THRESHOLD_DAYS: int = Field(1, alias='FULL_SYNC_THRESHOLD_DAYS')

    # Recommendation Parameters
    AAA_THRESHOLD: int = Field(1000, alias='AAA_THRESHOLD')

    ALPHA: float = Field(0.6, alias='ALPHA')                    # semantic_score
    BETA: float = Field(0.35, alias='BETA')                     # tags_score
    GAMMA_NICHE_SOFT: float = Field(0.05, alias='GAMMA_SOFT')   # niche_boost
    GAMMA_NICHE_STRONG: float = Field(0.15, alias='GAMMA_STRONG')

    CANDIDATE_MULTIPLIER: int = Field(10, alias='CANDIDATE_MULTIPLIER')

    TAG_WEIGHTS: str = Field(
        '{"keywords":0.4,"themes":0.3,"genres":0.15,"game_modes":0.1,"developers":0.05}',
        alias='TAG_WEIGHTS'
    )
    MAX_TOTAL: int = Field(100, alias='MAX_TOTAL')
    DEFAULT_LIMIT: int = Field(10, alias='DEFAULT_LIMIT')

    # Main Parameters
    SYNC_HOUR: int = Field(2, alias='SYNC_HOUR')
    SYNC_MINUTE: int = Field(0, alias='SYNC_MINUTE')
    GENRES_REFRESH_HOUR: int = Field(14, alias='GENRES_REFRESH_HOUR')
    GENRES_REFRESH_MINUTE: int = Field(0, alias='GENRES_REFRESH_MINUTE')
    PLATFORMS_REFRESH_HOUR: int = Field(15, alias='PLATFORMS_REFRESH_HOUR')
    PLATFORMS_REFRESH_MINUTE: int = Field(0, alias='PLATFORMS_REFRESH_MINUTE')

    # CRUD Parameters
    EMOJI_LIST: str = Field('😁,😋,😳,😱,🥰,🤓,😎,🥵,😴,🤡,😈,😌,🤠,😨,🤭,😂,🥶,🙄', alias='EMOJI_LIST')

    # Steam Parameters
    STEAM_API_KEY: str = Field(..., alias='STEAM_API_KEY')
    STEAM_API_BASE: str = Field('https://api.steampowered.com', alias='STEAM_API_BASE')
    STEAM_COMMUNITY_BASE: str = Field('https://steamcommunity.com', alias='STEAM_COMMUNITY_BASE')
    RATE_LIMIT_DELAY: int = Field(1.0, alias='RATE_LIMIT_DELAY')

    SIMILARITY_THRESHOLD: float = Field(0.4, alias='SIMILARITY_THRESHOLD')

    # SteamIGDBMatcher
    FUZZY_MIN_SCORE: float = Field(0.85, alias='FUZZY_MIN_SCORE')
    STEAM_APPS_CSV_PATH: str = Field('SteamReviewDataset1M/applications.csv', alias='STEAM_APPS_CSV_PATH')

    # CoPlaySimilarityBuilder
    TOP_K: int = Field(50, alias='TOP_K')
    MIN_SIMILARITY: float = Field(0.05, alias='MIN_SIMILARITY')
    MIN_SHARED_USERS: int = Field(5, alias='MIN_SHARED_USERS')

    # Yandex Parameters
    YANDEX_APPLICATION_PASSWORD: str = Field(..., alias='YANDEX_APPLICATION_PASSWORD')
    SMTP_HOST: str = Field('smtp.yandex.ru', alias='HOST')
    SMTP_PORT: int = Field(587, alias='SMTP_PORT')
    SMTP_USER: str = Field(..., alias='SMTP_USER')
    TO_EMAIL: str = Field(..., alias='TO_EMAIL')

    @property
    def allowed_game_types_tuple(self) -> tuple[int, ...]:
        return tuple(int(x.strip()) for x in self.ALLOWED_GAME_TYPES.split(','))

    @property
    def tag_weights_dict(self) -> dict[str, float]:
        return json.loads(self.TAG_WEIGHTS)

    @property
    def emoji_list(self) -> list[str]:
        return [x.strip() for x in self.EMOJI_LIST.split(',')]

    @field_validator('SYNC_HOUR', 'SYNC_MINUTE', 'GENRES_REFRESH_HOUR', 'GENRES_REFRESH_MINUTE')
    @classmethod
    def validate_time(cls, v: int, info) -> int:
        field_name = info.field_name
        if 'HOUR' in field_name and not (0 <= v <= 23):
            raise ValueError(f'{field_name} must be between 0 and 23')
        if 'MINUTE' in field_name and not (0 <= v <= 59):
            raise ValueError(f'{field_name} must be between 0 and 59')
        return v

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = 'ignore'


settings = Settings()


class IGDBConfig:
    def __init__(self):
        self.client_id = settings.IGDB_CLIENT_ID
        self.client_secret = settings.IGDB_CLIENT_SECRET
        self.base_url = settings.BASE_URL
        self.auth_url = settings.AUTH_URL
        self.genres_url = settings.GENRES_URL
        self.platforms_url = settings.PLATFORMS_URL
        self.rate_limit_rps = settings.RATE_LIMIT_RPS
        self.batch_size = settings.BATCH_SIZE


class DBConfig:
    def __init__(self):
        self.host = settings.DB_HOST
        self.port = settings.DB_PORT
        self.name = settings.DB_NAME
        self.user = settings.DB_USER
        self.password = settings.DB_PASSWORD
        self.mysql_host = settings.MYSQL_DB_HOST
        self.mysql_port = settings.MYSQL_DB_PORT
        self.mysql_name = settings.MYSQL_DB_NAME
        self.mysql_user = settings.MYSQL_DB_USER
        self.mysql_password = settings.MYSQL_DB_PASSWORD
        self.app_pool_size = settings.APP_POOL_SIZE
        self.app_max_overflow = settings.APP_MAX_OVERFLOW
        self.app_pool_timeout = settings.APP_POOL_TIMEOUT
        self.background_pool_size = settings.BACKGROUND_POOL_SIZE
        self.background_max_overflow = settings.BACKGROUND_MAX_OVERFLOW
        self.pool_recycle = settings.POOL_RECYCLE
        self.mysql_pool_size = settings.MYSQL_POOL_SIZE
        self.mysql_max_overflow = settings.MYSQL_MAX_OVERFLOW
        self.mysql_pool_recycle = settings.MYSQL_POOL_RECYCLE

    @property
    def dsn(self) -> str:
        return f'postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}'

    @property
    def mysql_dsn(self) -> str:
        return f'mysql+aiomysql://{self.mysql_user}:{self.mysql_password}@{self.mysql_host}:{self.mysql_port}' \
               f'/{self.mysql_name}?charset=utf8mb4'


def load_igdb_config() -> IGDBConfig:
    return IGDBConfig()


def load_db_config() -> DBConfig:
    return DBConfig()
