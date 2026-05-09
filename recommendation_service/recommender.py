import logging
import math
import numpy as np

from db_service import Database, RecommendationCrud, UserInteractionCrud, UserDataCrud
from db_service.models import Game
from recommendation_service.schemas import RecommendationRequest, RecommendationResponse, RecommendedGame
from config import settings

logger = logging.getLogger(__name__)


class RecommendationService:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def recommend(self, request: RecommendationRequest, external_id: str) -> RecommendationResponse:
        async with self._db.session() as session:
            repo = RecommendationCrud(session)
            interaction_repo = UserInteractionCrud(session)
            data_repo = UserDataCrud(session)

            user = await data_repo.get_user_by_token(external_id)
            user_id = user.id

            liked_igdb_ids = await interaction_repo.get_liked_games(user_id)
            disliked_igdb_ids = await interaction_repo.get_disliked_games(user_id)

            preference_ids = list(set(request.preferences))
            exclude_ids = set(disliked_igdb_ids) | set(request.seen_igdb_ids) | set(request.preferences)

            liked_embeddings = await repo.get_best_embeddings_by_igdb_ids(preference_ids)

            if not liked_embeddings:
                logger.warning(f'No embeddings for preference ids: {preference_ids}')

                return RecommendationResponse(items=[], total_seen=len(request.seen_igdb_ids), has_more=False)

            profile_vector = self._build_profile(liked_embeddings)

            if disliked_igdb_ids:
                disliked_embeddings = await repo.get_embeddings_by_igdb_ids(disliked_igdb_ids)
                if disliked_embeddings:
                    profile_vector = self._apply_negative_sampling(profile_vector, disliked_embeddings)

            liked_game_stats = await repo.get_game_stats_by_igdb_ids(liked_igdb_ids or preference_ids)
            user_profile_type = self._classify_user(liked_game_stats)

            alpha, beta, gamma = self._compute_dynamic_weights(user_profile_type, request.niche)

            candidate_limit = request.limit * settings.CANDIDATE_MULTIPLIER
            candidates = await repo.find_similar(
                embedding=profile_vector.tolist(),
                exclude_igdb_ids=list(exclude_ids),
                limit=candidate_limit,
                only_released=request.only_released,
                platforms=request.platforms,
            )

            liked_game_tags = await self._get_liked_game_tags(preference_ids)
            max_rating_count = await repo.get_max_rating_count()
            max_rating = await repo.get_max_rating()

            coplay_map = await repo.get_coplay_similarities(preference_ids)

        scored = self._score_candidates(
            candidates=candidates,
            profile_vector=profile_vector,
            liked_game_tags=liked_game_tags,
            max_rating_count=max_rating_count,
            max_rating=max_rating,
            coplay_map=coplay_map,
            alpha=alpha,
            beta=beta,
            gamma=gamma,
        )

        scored.sort(key=lambda x: x[1]['final'], reverse=True)
        top = scored[:request.limit]

        items = [self._to_response(game, scores) for game, scores in top]
        total_seen = len(request.seen_igdb_ids) + len(items)

        return RecommendationResponse(
            items=items,
            total_seen=total_seen,
            has_more=total_seen < settings.MAX_TOTAL
        )

    @staticmethod
    def _build_profile(embeddings: list[tuple[int, list[float]]]) -> np.ndarray:
        """ Weighted average of embeddings normalized into a unit vector """

        vectors = np.array([emb for _, emb in embeddings], dtype=np.float32)
        mean = vectors.mean(axis=0)
        norm = np.linalg.norm(mean)

        return mean / norm if norm > 0 else mean

    @staticmethod
    def _apply_negative_sampling(
            profile: np.ndarray,
            disliked_embeddings: list[tuple[int, list[float]]],
            strength: float = 0.3
    ) -> np.ndarray:
        dislike_vectors = np.array([emb for _, emb in disliked_embeddings], dtype=np.float32)
        dislike_mean = dislike_vectors.mean(axis=0)
        dislike_norm = np.linalg.norm(dislike_mean)
        if dislike_norm > 0:
            dislike_mean /= dislike_norm

        adjusted = profile - strength * dislike_mean
        norm = np.linalg.norm(adjusted)

        return adjusted / norm if norm > 0 else adjusted

    @staticmethod
    def _classify_user(game_stats: list[dict]) -> str:
        """ Return aaa, mixed or indie """

        if not game_stats:
            return 'mixed'

        counts = [s['rating_count'] for s in game_stats if s.get('rating_count')]
        if not counts:
            return 'mixed'

        avg = sum(counts) / len(counts)
        if avg >= settings.AAA_THRESHOLD:
            return 'aaa'
        elif avg >= 200:
            return 'mixed'
        else:
            return 'indie'

    @staticmethod
    def _compute_dynamic_weights(user_profile: str, niche: bool) -> tuple[float, float, float]:
        """ Adapts the parameters to the user type and the niche flag """

        if niche:
            gamma = settings.GAMMA_NICHE_STRONG
        else:
            gamma = settings.GAMMA_NICHE_SOFT

        if user_profile == 'aaa':
            gamma = min(gamma, 0.05)
            alpha = 0.65
            beta = 1.0 - alpha - gamma
        elif user_profile == 'indie':
            alpha = 0.5
            beta = 1.0 - alpha - gamma
        else:
            alpha = settings.ALPHA
            beta = 1.0 - alpha - gamma

        beta = max(beta, 0.0)

        return alpha, beta, gamma

    def _score_candidates(
            self,
            candidates: list[Game],
            profile_vector: np.ndarray,
            liked_game_tags: list[dict],
            max_rating_count: int,
            max_rating: float,
            coplay_map: dict[int, float],
            alpha: float,
            beta: float,
            gamma: float,
    ) -> list[tuple[Game, dict]]:
        result = []

        delta = 0.1 if coplay_map else 0.0
        a = alpha * (1 - delta)
        b = beta * (1 - delta)
        g = gamma
        d = delta

        for game in candidates:
            semantic = self._semantic_score(game, profile_vector)
            tags = self._tags_score(game, liked_game_tags)
            niche = self._niche_boost(game, max_rating_count, max_rating)
            coplay = coplay_map.get(game.igdb_id, 0.0)

            final = a * semantic + b * tags + g * niche + d * coplay

            result.append((game, {
                'semantic': round(semantic, 4),
                'tags': round(tags, 4),
                'niche': round(niche, 4),
                'coplay': round(coplay, 4),
                'final': round(final, 4),
            }))

        return result

    @staticmethod
    def _semantic_score(game: Game, profile_vector: np.ndarray) -> float:
        vec_raw = game.review_embedding if game.review_embedding is not None else game.embedding
        if vec_raw is None:
            return 0.0

        vec = np.array(vec_raw, dtype=np.float32)
        cosine = float(np.dot(profile_vector, vec))

        return (cosine + 1) / 2

    @staticmethod
    def _tags_score(game: Game, liked_game_tags: list[dict]) -> float:
        if not liked_game_tags:
            return 0.0

        field_scores = []
        for field, weight in settings.tag_weights_dict.items():
            candidate_tags = set(getattr(game, field, None) or [])

            if not candidate_tags:
                continue

            jaccard_scores = []
            for liked in liked_game_tags:
                liked_tags = set(liked.get(field) or [])
                union = len(candidate_tags | liked_tags)

                if union == 0:
                    continue

                jaccard_scores.append(len(candidate_tags & liked_tags) / union)

            if jaccard_scores:
                field_scores.append(weight * (sum(jaccard_scores) / len(jaccard_scores)))

        total_weight = sum(w for f, w in settings.tag_weights_dict.items() if getattr(game, f, None))

        return sum(field_scores) / total_weight if total_weight > 0 else 0.0

    @staticmethod
    def _niche_boost(game: Game, max_rating_count: int, max_rating: float) -> float:
        count = game.rating_count or 0
        rating = game.rating or 0.0

        popularity_penalty = math.log1p(count) / math.log1p(max_rating_count)
        niche_factor = 1.0 - popularity_penalty

        quality_factor = (rating / max_rating) if max_rating > 0 else 0.5

        return round(niche_factor * quality_factor, 4)

    async def _get_liked_game_tags(self, liked_igdb_ids: list[int]) -> list[dict]:
        async with self._db.session() as session:
            return await RecommendationCrud(session).get_games_metadata(liked_igdb_ids)

    @staticmethod
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
            rating=round(game.rating, 2) if game.rating else None,
            first_release_date=release,
            match_percent=min(100, round(scores['final'] * 100)),
        )
