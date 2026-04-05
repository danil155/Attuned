import logging
import math
import numpy as np
from sqlalchemy import select

from db_service.connection import Database
from db_service.models import Game
from db_service.crud import RecommendationCrud
from recommendation_service.schemas import MAX_TOTAL, RecommendationRequest, RecommendationResponse, RecommendedGame

logger = logging.getLogger(__name__)

ALPHA = 0.6     # semantic_score
BETA = 0.35     # tags_score
GAMMA = 0.05    # niche_boost

CANDIDATE_MULTIPLIER = 10

TAG_WEIGHTS = {
    'keywords': 0.4,
    'themes': 0.3,
    'genres': 0.15,
    'game_modes': 0.1,
    'developers': 0.05
}


class RecommendationService:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def recommend(self, request: RecommendationRequest) -> RecommendationResponse:
        exclude_ids = set(
            request.liked_igdb_ids + request.disliked_igdb_ids + request.seen_igdb_ids
        )

        async with self._db.session() as session:
            repo = RecommendationCrud(session)

            liked_embeddings = await repo.get_embeddings_by_igdb_ids(request.liked_igdb_ids)

            if not liked_embeddings:
                logger.warning(f'None of the liked games have embeddings yet: {request.liked_igdb_ids}')

                return RecommendationResponse(items=[], total_seen=len(request.seen_igdb_ids), has_more=False)

            profile_vector = _build_profile(liked_embeddings)

            candidate_limit = request.limit * CANDIDATE_MULTIPLIER
            candidates = await repo.find_similar(
                embedding=profile_vector.tolist(),
                exclude_igdb_ids=list(exclude_ids),
                limit=candidate_limit
            )

            liked_game_data = await _get_liked_game_tags(session, request.liked_igdb_ids)
            max_rating_count = await repo.get_max_rating_count()

        scored = _score_candidates(
            candidates=candidates,
            profile_vector=profile_vector,
            liked_game_tags=liked_game_data,
            max_rating_count=max_rating_count
        )

        scored.sort(key=lambda x: x[1]['final'], reverse=True)
        top = scored[:request.limit]

        items = [_to_response(game, scores) for game, scores in top]
        total_seen = len(request.seen_igdb_ids) + len(items)

        return RecommendationResponse(
            items=items,
            total_seen=total_seen,
            has_more=total_seen < MAX_TOTAL
        )


def _build_profile(liked_embeddings: list[tuple[int, list[float]]]) -> np.ndarray:
    vectors = np.array([emb for _, emb in liked_embeddings], dtype=np.float32)
    mean = vectors.mean(axis=0)
    norm = np.linalg.norm(mean)

    return mean / norm if norm > 0 else mean


def _score_candidates(candidates: list[Game],
                      profile_vector: np.ndarray,
                      liked_game_tags: list[dict],
                      max_rating_count: int) -> list[tuple[Game, dict]]:
    result = []

    for game in candidates:
        if game.embedding is not None:
            game_vec = np.array(game.embedding, dtype=np.float32)
            semantic = float(np.dot(profile_vector, game_vec))
            semantic = (semantic + 1) / 2
        else:
            semantic = 0.0

        tags = _tags_score(game, liked_game_tags)
        niche = _niche_boost(game, max_rating_count)
        final = ALPHA * semantic + BETA * tags + GAMMA * niche

        result.append((game, {
            'semantic': round(semantic, 4),
            'tags': round(tags, 4),
            'niche': round(niche, 4),
            'final': round(final, 4)
        }))

    return result


def _tags_score(game: Game, liked_game_tags: list[dict]) -> float:
    if not liked_game_tags:
        return 0.0

    field_scores = []
    for field, weight in TAG_WEIGHTS.items():
        candidate_tags = set(getattr(game, field, None) or [])

        if not candidate_tags:
            continue

        jaccard_scores = []
        for liked in liked_game_tags:
            liked_tags = set(liked.get(field) or [])
            if not liked_tags and not candidate_tags:
                continue

            intersection = len(candidate_tags & liked_tags)
            union = len(candidate_tags | liked_tags)
            jaccard_scores.append(intersection / union if union > 0 else 0.0)

        if jaccard_scores:
            field_scores.append(weight * (sum(jaccard_scores) / len(jaccard_scores)))

    total_weight = sum(w for f, w in TAG_WEIGHTS.items() if getattr(game, f, None))

    return sum(field_scores) / total_weight if total_weight > 0 else 0.0


def _niche_boost(game: Game, max_rating_count: int) -> float:
    count = game.rating_count or 0

    return 1.0 - math.log1p(count) / math.log1p(max_rating_count)


async def _get_liked_game_tags(session, liked_igdb_ids: list[int]) -> list[dict]:
    result = await session.execute(
        select(
            Game.igdb_id,
            Game.genres,
            Game.themes,
            Game.keywords,
            Game.game_modes,
            Game.developers
        ).where(Game.igdb_id.in_(liked_igdb_ids))
    )

    return [{
        'genres': row.genres,
        'themes': row.themes,
        'keywords': row.keywords,
        'game_modes': row.game_modes,
        'developers': row.developers
    } for row in result.all()]


def _to_response(game: Game, scores: dict) -> RecommendedGame:
    release = None
    if game.first_release_date:
        release = game.first_release_date.strftime('%Y-%m-%d')

    return RecommendedGame(
        igdb_id=game.igdb_id,
        name=game.name,
        summary_small=game.summary_small,
        cover_url=game.cover_url,
        igdb_url=game.igdb_url,
        genres=game.genres or [],
        platforms=game.platforms or [],
        rating=game.rating,
        first_release_date=release,
        match_percent=min(100, round(scores['final'] * 100))
    )
