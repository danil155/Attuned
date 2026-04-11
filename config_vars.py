from dataclasses import dataclass
from typing import ClassVar


@dataclass(frozen=True)
class IGDBParameters:
    # main game, remake, remaster
    ALLOWED_GAME_TYPES: tuple = (0, 8, 9)

    GAME_FIELDS: str = ','.join([
        'id', 'name', 'slug', 'summary', 'storyline', 'url', 'game_type', 'game_status', 'genres.name', 'themes.name',
        'keywords.name', 'game_modes.name', 'player_perspectives.name', 'platforms.name',
        'involved_companies.company.name',
        'involved_companies.developer',
        'cover.url',
        'rating', 'rating_count',
        'aggregated_rating', 'aggregated_rating_count',
        'hypes',
        'first_release_date', 'updated_at'
    ])


@dataclass(frozen=True)
class DBParameters:
    EMBEDDINGS_DIM: int = 384


@dataclass(frozen=True)
class EmbeddingParameters:
    MODEL_NAME: str = 'all-MiniLM-L6-v2'
    DB_BATH_SIZE: int = 512
    MODEL_BATCH_SIZE: int = 64

    MAX_KEYWORDS: int = 50

    SEMANTIC_WEIGHT: float = 0.6
    TAGS_WEIGHT: float = 0.4


@dataclass(frozen=True)
class SyncParameters:
    FULL_SYNC_THRESHOLD_DAYS: int = 1


@dataclass(frozen=True)
class RecommendationParameters:
    ALPHA: float = 0.6  # semantic_score
    BETA: float = 0.35  # tags_score
    GAMMA: float = 0.05  # niche_boost

    CANDIDATE_MULTIPLIER: int = 10

    TAG_WEIGHTS: ClassVar[dict[str, float]] = {
        'keywords': 0.4,
        'themes': 0.3,
        'genres': 0.15,
        'game_modes': 0.1,
        'developers': 0.05
    }

    MAX_TOTAL: int = 30
    DEFAULT_LIMIT: int = 10


@dataclass(frozen=True)
class MainParameters:
    SYNC_HOUR: int = 2
    SYNC_MINUTE: int = 0
    GENRES_REFRESH_HOUR: int = 14
    GENRES_REFRESH_MINUTE: int = 0


@dataclass(frozen=True)
class CrudParameters:
    EMOJI_LIST: ClassVar[list[str]] = ['😁', '😋', '😳', '😱', '🥰', '🤓', '😎', '🥵', '😴', '🤡', '😈', '😌', '🤠',
                                       '😨', '🤭']
