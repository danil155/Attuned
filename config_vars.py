from dataclasses import dataclass


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
    EMBEDDINGS_DIM = 384


@dataclass(frozen=True)
class EmbeddingParameters:
    MODEL_NAME = 'all-MiniLM-L6-v2'
    DB_BATH_SIZE = 512
    MODEL_BATCH_SIZE = 64

    MAX_KEYWORDS = 50

    SEMANTIC_WEIGHT = 0.6
    TAGS_WEIGHT = 0.4


@dataclass(frozen=True)
class SyncParameters:
    FULL_SYNC_THRESHOLD_DAYS = 1


@dataclass(frozen=True)
class RecommendationParameters:
    ALPHA = 0.6  # semantic_score
    BETA = 0.35  # tags_score
    GAMMA = 0.05  # niche_boost

    CANDIDATE_MULTIPLIER = 10

    TAG_WEIGHTS = {
        'keywords': 0.4,
        'themes': 0.3,
        'genres': 0.15,
        'game_modes': 0.1,
        'developers': 0.05
    }

    MAX_TOTAL = 30
    DEFAULT_LIMIT = 10


@dataclass(frozen=True)
class MainParameters:
    SYNC_HOUR, SYNC_MINUTE = 2, 0
    GENRES_REFRESH_HOUR, GENRES_REFRESH_MINUTE = 14, 0
