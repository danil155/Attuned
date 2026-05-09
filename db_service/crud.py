import logging
import re
import secrets
import hashlib
import time
import random
from datetime import datetime, timezone, timedelta
from sqlalchemy import func, select, update, Float, delete, and_, text, case
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db_service.models import Game, SyncLog
from db_service.models_user import UserData, UserCart, UserGameInteractions
from db_service.models_steam import GameCoPlaySimilarity, SteamIGDBMap
from igdb_service.schemas import IGDBGame

logger = logging.getLogger(__name__)


class GameCrud:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # возвращает количество обработанных записей
    async def upsert_batch(self, games: list[IGDBGame]) -> int:
        if not games:
            return 0

        rows = [_game_to_dict(g) for g in games]

        stmt = insert(Game).values(rows)

        update_cols = {}
        for col in rows[0]:
            if col in ['igdb_id', 'synced_at', 'search_vector']:
                update_cols[col] = stmt.excluded[col]

        update_cols['search_vector'] = text("""
        setweight(to_tsvector('simple', COALESCE(excluded.name, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(excluded.slug, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(excluded.summary_small, '')), 'C') ||
        setweight(to_tsvector('simple', COALESCE(excluded.storyline, '')), 'D')
        """)

        update_cols['embedding'] = None

        stmt = stmt.on_conflict_do_update(
            index_elements=['igdb_id'],
            set_=update_cols,
        )

        await self._session.execute(stmt)

        return len(rows)

    async def get_last_sync_timestamp(self) -> datetime | None:
        result = await self._session.execute(
            select(func.max(Game.igdb_updated_at))
        )

        return result.scalar_one_or_none()

    async def get_cover_url(self, igdb_id: int) -> str | None:
        result = await self._session.execute(
            select(Game.cover_url)
            .where(Game.igdb_id == igdb_id)
        )

        return result.scalar_one_or_none()

    async def find_igdb_match(self, name: str) -> int | None:
        result = await self._session.execute(
            select(Game.igdb_id)
            .where(func.lower(Game.name) == name.lower(), Game.game_type.in_(settings.allowed_game_types_tuple))
            .limit(1)
        )
        igdb_id = result.scalar_one_or_none()

        if igdb_id is not None:
            return igdb_id

        result = await self._session.execute(
            select(Game.igdb_id, func.similarity(Game.name, name).label('sim'))
            .where(Game.name.bool_op('%')(name),
                   Game.game_type.in_(settings.allowed_game_types_tuple),
                   func.similarity(Game.name, name) >= settings.SIMILARITY_THRESHOLD,
                   )
            .order_by(func.similarity(Game.name, name).desc())
            .limit(1)
        )

        return result.scalar_one_or_none()

    async def get_names_to_ids_map(self, names: list[str] = None) -> dict[str, int]:
        stmt = select(Game.name, Game.igdb_id)
        if names:
            stmt = stmt.where(func.lower(Game.name).in_([n.lower() for n in names]))

        result = await self._session.execute(stmt)

        return {row.name.lower(): row.igdb_id for row in result.all()}

    async def count(self) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(Game)
        )

        return result.scalar_one()


def _game_to_dict(game: IGDBGame) -> dict:
    return {
        'igdb_id': game.id,
        'name': game.name,
        'slug': game.slug,
        'summary': game.summary,
        'storyline': game.storyline,
        'igdb_url': game.url,
        'cover_url': game.cover.url if game.cover else None,
        'game_status': game.game_status,
        'game_type': game.game_type,
        'genres': [e.name for e in game.genres],
        'themes': [e.name for e in game.themes],
        'keywords': [e.name for e in game.keywords],
        'game_modes': [e.name for e in game.game_modes],
        'player_perspectives': [e.name for e in game.player_perspectives],
        'platforms': [e.name for e in game.platforms],
        'developers': game.developers,
        'summary_small': _extract_short_summary(game.summary),
        'search_boost': _compute_search_boost(game),
        'rating': game.rating,
        'rating_count': game.rating_count,
        'aggregated_rating': game.aggregated_rating,
        'aggregated_rating_count': game.aggregated_rating_count,
        'hypes': game.hypes,
        'first_release_date': game.first_release_datetime,
        'igdb_updated_at': game.updated_at_datetime,
        'synced_at': datetime.utcnow()
    }


def _extract_short_summary(summary: str | None, max_len: int = 110) -> str | None:
    if not summary:
        return ''

    clean_text = ' '.join(summary.split())

    sentences = re.split(r'[.!?]+', clean_text)
    first_sentence = ''
    for sent in sentences:
        sent = sent.strip()
        if len(sent) > 10:
            first_sentence = sent
            break

    if not first_sentence:
        first_sentence = clean_text[:max_len]

    if len(first_sentence) > max_len:
        truncated = first_sentence[:max_len]
        last_space = truncated.rfind(' ')
        if last_space > max_len // 2:
            first_sentence = truncated[:last_space] + '...'
        else:
            first_sentence = truncated + '...'

    if first_sentence and first_sentence[0].islower():
        first_sentence = first_sentence[0].upper() + first_sentence[1:]

    return first_sentence


def _compute_search_boost(game: IGDBGame) -> float:
    boost = 1.0

    if game.aggregated_rating:
        boost += (game.aggregated_rating / 100.0) * 0.5

    rating_count = game.aggregated_rating_count or game.rating_count
    if rating_count:
        boost += min(rating_count / 100000.0, 0.3)

    if game.hypes:
        boost += min(game.hypes / 50000.0, 0.2)

    if game.first_release_datetime:
        days_ago = (datetime.utcnow() - game.first_release_datetime).days
        if days_ago < 365:
            boost += 0.2
        elif days_ago < 1095:
            boost += 0.1

    return round(boost, 2)


class SyncLogCrud:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def start(self, sync_type: str) -> int:
        log = SyncLog(sync_type=sync_type, status='running')
        self._session.add(log)
        await self._session.flush()

        return log.id

    async def finish(self, log_id: int, games_processed: int) -> None:
        await self._session.execute(
            update(SyncLog).where(SyncLog.id == log_id).values(
                finished_at=datetime.utcnow(),
                games_processed=games_processed,
                status='done'
            )
        )

    async def fail(self, log_id: int, error: str) -> None:
        await self._session.execute(
            update(SyncLog).where(SyncLog.id == log_id).values(
                finished_at=datetime.utcnow(),
                status='failed',
                error_message=error,
            )
        )


class EmbeddingCrud:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_games_without_embeddings(self, batch_size: int, offset: int = 0) -> list[Game]:
        result = await self._session.execute(
            select(
                Game.id,
                Game.name,
                Game.summary,
                Game.storyline,
                Game.genres,
                Game.themes,
                Game.keywords
            ).where(Game.embedding.is_(None))
            .order_by(Game.id)
            .limit(batch_size)
            .offset(offset)
        )

        return result.all()

    async def save_embeddings(self, embeddings: list[tuple[int, list[float]]]) -> None:
        for game_id, vector in embeddings:
            await self._session.execute(
                update(Game)
                .where(Game.id == game_id)
                .values(embedding=vector)
            )

    async def save_review_embeddings(self, igdb_ids: list[int], vectors: list[list[float]]) -> None:
        for igdb_id, vec in zip(igdb_ids, vectors):
            await self._session.execute(
                update(Game)
                .where(Game.igdb_id == igdb_id)
                .values(review_embedding=vec)
            )

    async def count_review_embeddings(self) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(Game)
            .where(Game.review_embedding.is_not(None))
        )

        return result.scalar_one()

    async def load_steam_mapping(self) -> dict[int, int]:
        result = await self._session.execute(
            select(SteamIGDBMap.steam_appid, SteamIGDBMap.igdb_id)
        )

        return {row.steam_appid: row.igdb_id for row in result.all()}

    async def count_without_embeddings(self) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(Game).where(Game.embedding.is_(None))
        )

        return result.scalar_one()


class RecommendationCrud:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_best_embeddings_by_igdb_ids(self, igdb_ids: list[int]) -> list[tuple[int, list[float]]]:
        """ Returns review_embedding if present, otherwise - game embedding """

        result = await self._session.execute(
            select(Game.igdb_id, Game.review_embedding, Game.embedding)
            .where(
                Game.igdb_id.in_(igdb_ids),
                (Game.review_embedding.is_not(None) | (Game.embedding.is_not(None))),
            )
        )

        out = []
        for row in result.all():
            vec = row.review_embedding if row.review_embedding is not None else row.embedding
            if vec is not None:
                out.append((row.igdb_id, vec))

        return out

    async def get_embeddings_by_igdb_ids(self, igdb_ids: list[int]) -> list[tuple[int, list[float]]]:
        result = await self._session.execute(
            select(Game.igdb_id, Game.embedding)
            .where(Game.igdb_id.in_(igdb_ids), Game.embedding.is_not(None))
        )

        return [(row.igdb_id, row.embedding) for row in result.all()]

    async def find_similar(
            self,
            embedding: list[float],
            exclude_igdb_ids: list[int],
            limit: int,
            only_released: bool = True,
            min_rating_count: int = 10,
            platforms: list[str] | None = None,
    ) -> list[Game]:
        filters = [
            (Game.review_embedding.is_not(None) | (Game.embedding.is_not(None))),
            Game.rating_count >= min_rating_count,
        ]

        if exclude_igdb_ids:
            filters.append(Game.igdb_id.not_in(exclude_igdb_ids))

        if only_released:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            filters.append(Game.first_release_date <= now)

        if platforms:
            filters.append(Game.platforms.op('&&')(platforms))

        stmt = (
            select(Game)
            .where(*filters)
            .order_by(Game.embedding.op('<=>', return_type=Float)(embedding))
            .limit(limit)
        )
        result = await self._session.execute(stmt)

        return list(result.scalars().all())

    async def get_games_metadata(self, igdb_ids: list[int]) -> list[dict]:
        result = await self._session.execute(
            select(Game.igdb_id, Game.genres, Game.themes, Game.keywords, Game.game_modes, Game.developers)
            .where(Game.igdb_id.in_(igdb_ids))
        )

        return [{
            'genres': row.genres,
            'themes': row.themes,
            'keywords': row.keywords,
            'game_modes': row.game_modes,
            'developers': row.developers
        } for row in result.all()]

    async def get_max_rating_count(self) -> int:
        result = await self._session.execute(
            select(func.max(Game.rating_count))
        )

        return result.scalar_one() or 1

    async def get_max_rating(self) -> float:
        result = await self._session.execute(
            select(func.max(Game.rating))
        )

        return result.scalar_one() or 100.0

    async def get_game_stats_by_igdb_ids(self, igdb_ids: list[int]) -> list[dict]:
        result = await self._session.execute(
            select(Game.igdb_id, Game.rating_count, Game.rating)
            .where(Game.igdb_id.in_(igdb_ids))
        )

        return [
            {'igdb_id': row.igdb_id, 'rating_count': row.rating_count, 'rating': row.rating}
            for row in result.all()
        ]

    async def get_coplay_similarities(self, igdb_ids: list[int]) -> dict[int, float]:
        if not igdb_ids:
            return {}

        result = await self._session.execute(
            select(GameCoPlaySimilarity)
            .where(GameCoPlaySimilarity.source_igdb_id.in_(igdb_ids))
        )
        rows = result.scalars().all()

        coplay: dict[int, float] = {}
        for row in rows:
            for igdb_id, score in zip(row.similar_igdb_ids, row.similarity_scores):
                if score > coplay.get(igdb_id, 0.0):
                    coplay[igdb_id] = score

        return coplay


class SearchCrud:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def search_by_name(self, query: str, limit: int = 20) -> list[Game]:
        clean_query = query.strip().lower()
        ts_query = func.plainto_tsquery('simple', query)

        score = (
                case((func.lower(Game.name) == clean_query, 100.0), else_=0.0) +
                case((func.lower(Game.name).like(f'{clean_query}%'), 50.0), else_=0.0) +
                func.coalesce(
                    func.ts_rank_cd(Game.search_vector, ts_query) * 10.0 * Game.search_boost,
                    0.0
                ) +
                func.similarity(Game.name, query) * 3.0
        )

        result = await self._session.execute(
            select(Game)
            .where((func.similarity(Game.name, query) > 0.1) | (Game.search_vector.op('@@')(ts_query)))
            .order_by(score.desc())
            .limit(limit)
        )

        return list(result.scalars().all())

    async def search_by_id(self, igdb_id: int) -> Game | None:
        result = await self._session.execute(
            select(Game)
            .where(Game.igdb_id == igdb_id)
        )

        return result.scalar_one_or_none()


class UserDataCrud:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_user(self) -> tuple[UserData, str]:
        external_id = self._generate_external_id()
        raw_token = UserData.generate_access_token()
        hashed_token = hashlib.sha256(raw_token.encode()).hexdigest()

        avatar_emoji = random.choice(settings.emoji_list)

        user = UserData(external_id=external_id,
                        access_token=hashed_token,
                        avatar_emoji=avatar_emoji)
        self._session.add(user)
        await self._session.flush()

        return user, raw_token

    async def get_user_by_token(self, raw_token: str) -> UserData | None:
        hashed_token = hashlib.sha256(raw_token.encode()).hexdigest()

        result = await self._session.execute(
            select(UserData)
            .where(UserData.access_token == hashed_token)
        )
        user = result.scalar_one_or_none()

        if user and user.is_pro and user.pro_expires_at and datetime.utcnow() > user.pro_expires_at:
            user.is_pro = False
            await self._session.flush()

        return user

    async def regenerate_access_token(self, user_id: int) -> str:
        new_raw_token = UserData.generate_access_token()
        new_hashed_token = hashlib.sha256(new_raw_token.encode()).hexdigest()

        await self._session.execute(
            update(UserData)
            .where(UserData.id == user_id)
            .values(access_token=new_hashed_token)
            .returning(UserData.access_token)
        )
        await self._session.flush()

        return new_raw_token

    async def activate_pro(self, external_id: str, days: int = 31) -> bool:
        expires_at = datetime.utcnow() + timedelta(days=days)

        result = await self._session.execute(
            update(UserData)
            .where(UserData.external_id == external_id)
            .values(is_pro=True, pro_expires_at=expires_at)
        )
        await self._session.flush()

        return result.rowcount > 0

    async def get_user_by_id(self, user_id: int) -> UserData | None:
        result = await self._session.execute(
            select(UserData)
            .where(UserData.id == user_id)
        )

        return result.scalar_one_or_none()

    async def update_pro_status(self, external_id: str, is_pro: bool) -> bool:
        result = await self._session.execute(
            select(UserData)
            .where(UserData.external_id == external_id)
        )

        user = result.scalar_one_or_none()

        if not user:
            return False

        user.is_pro = is_pro
        await self._session.flush()

        return True

    async def delete_user(self, user_id: int) -> bool:
        result = await self._session.execute(
            delete(UserData)
            .where(UserData.id == user_id)
        )

        return result.rowcount > 0

    @staticmethod
    def _generate_external_id() -> str:
        random_part = secrets.token_urlsafe(32)
        time_part = str(int(time.time() * 1000))
        combined = f'{random_part}:{time_part}'

        return hashlib.sha256(combined.encode()).hexdigest()[:32]


class UserCartCrud:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_cart(self, user_id: int, name: str) -> UserCart:
        cart = UserCart(user_id=user_id, name=name)
        self._session.add(cart)
        await self._session.flush()

        return cart

    async def get_user_carts(self, user_id: int) -> list[UserCart]:
        result = await self._session.execute(
            select(UserCart)
            .where(UserCart.user_id == user_id)
        )

        return list(result.scalars().all())

    async def get_cart(self, cart_id: int) -> UserCart | None:
        result = await self._session.execute(
            select(UserCart)
            .where(UserCart.id == cart_id)
        )

        return result.scalar_one_or_none()

    async def rename_cart(self, cart_id: int, new_name: str) -> bool:
        cart = await self.get_cart(cart_id)

        if not cart:
            return False

        cart.name = new_name
        await self._session.flush()

        return True

    async def add_to_cart(self, cart_id: int, igdb_id: int) -> bool:
        cart = await self.get_cart(cart_id)

        if not cart:
            return False

        if igdb_id not in cart.games:
            cart.games = cart.games + [igdb_id]
            await self._session.flush()

        return True

    async def remove_from_cart(self, cart_id: int, igdb_id: int) -> bool:
        cart = await self.get_cart(cart_id)

        if not cart or igdb_id not in cart.games:
            return False

        cart.games = [g for g in cart.games if g != igdb_id]
        await self._session.flush()

        return True

    async def clear_cart(self, cart_id: int) -> bool:
        cart = await self.get_cart(cart_id)

        if not cart:
            return False

        cart.games = []
        await self._session.flush()

        return True

    async def delete_cart(self, card_id: int) -> bool:
        result = await self._session.execute(
            delete(UserCart)
            .where(UserCart.id == card_id)
        )

        await self._session.flush()

        return result.rowcount > 0


class UserInteractionCrud:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def like(self, user_id: int, igdb_id: int) -> None:
        await self._remove_interaction(user_id, igdb_id)

        interaction = UserGameInteractions(
            user_id=user_id,
            igdb_id=igdb_id,
            interaction_type='like'
        )
        self._session.add(interaction)
        await self._session.flush()

    async def dislike(self, user_id: int, igdb_id: int) -> None:
        await self._remove_interaction(user_id, igdb_id)

        interaction = UserGameInteractions(
            user_id=user_id,
            igdb_id=igdb_id,
            interaction_type='dislike'
        )
        self._session.add(interaction)
        await self._session.flush()

    async def remove_interactions(self, user_id: int, igdb_id: int) -> None:
        await self._remove_interaction(user_id, igdb_id)

    async def get_liked_games(self, user_id: int) -> list[int]:
        result = await self._session.execute(
            select(UserGameInteractions.igdb_id)
            .where(and_(UserGameInteractions.user_id == user_id,
                        UserGameInteractions.interaction_type == 'like'))
        )

        return [row[0] for row in result.all()]

    async def get_disliked_games(self, user_id: int) -> list[int]:
        result = await self._session.execute(
            select(UserGameInteractions.igdb_id)
            .where(and_(UserGameInteractions.user_id == user_id,
                        UserGameInteractions.interaction_type == 'dislike'))
        )

        return [row[0] for row in result.all()]

    async def get_interaction(self, user_id: int, igdb_id: int) -> str | None:
        result = await self._session.execute(
            select(UserGameInteractions.interaction_type)
            .where(and_(UserGameInteractions.user_id == user_id,
                        UserGameInteractions.igdb_id == igdb_id))
        )

        return result.scalar_one_or_none()

    async def get_all_interactions(self, user_id: int) -> dict:
        result = await self._session.execute(
            select(UserGameInteractions.igdb_id, UserGameInteractions.interaction_type)
            .where(UserGameInteractions.user_id == user_id)
        )

        interactions = {}
        for igdb_id, interaction_type in result.all():
            interactions[igdb_id] = interaction_type

        return interactions

    async def _remove_interaction(self, user_id: int, igdb_id: int) -> None:
        await self._session.execute(
            delete(UserGameInteractions)
            .where(and_(UserGameInteractions.user_id == user_id,
                        UserGameInteractions.igdb_id == igdb_id))
        )


class PopularGamesCrud:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._cache = {}
        self._cache_timeout = 300

    async def get_popular_games_by_likes(self, limit: int = 10, force_refresh: bool = False) -> list[Game]:
        cache_key = f'popular_{limit}'

        if not force_refresh and cache_key in self._cache:
            cached_time, cached_games = self._cache[cache_key]
            if (datetime.utcnow() - cached_time).total_seconds() < self._cache_timeout:
                return cached_games

        stmt = (
            select(Game, func.count(UserGameInteractions.igdb_id).label('likes_count'))
            .join(UserGameInteractions,
                  and_(Game.igdb_id == UserGameInteractions.igdb_id, UserGameInteractions.interaction_type == 'like'),
                  isouter=False)
            .group_by(Game.id)
            .order_by(func.count(UserGameInteractions.igdb_id).desc())
            .limit(limit)
        )

        result = await self._session.execute(stmt)
        games = [row[0] for row in result.all()]

        self._cache[cache_key] = (datetime.utcnow(), games)

        return games


class SteamMappingCrud:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_count(self) -> int:
        result = await self._session.execute(
            select(func.count(SteamIGDBMap.steam_appid))
        )

        return result.scalar_one()

    async def get_similarities_count(self) -> int:
        result = await self._session.execute(
            select(func.count(GameCoPlaySimilarity.source_igdb_id))
        )

        return result.scalar_one()

    async def upsert_mappings(self, rows: list[dict]) -> None:
        stmt = insert(SteamIGDBMap).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=['steam_appid'],
            set_={col: stmt.excluded[col] for col in ['igdb_id', 'match_method', 'confidence']}
        )

        await self._session.execute(stmt)

    async def load_appid_to_igdb_map(self) -> dict[int, int]:
        result = await self._session.execute(
            select(SteamIGDBMap.steam_appid, SteamIGDBMap.igdb_id)
        )

        return {row.steam_appid: row.igdb_id for row in result.all()}

    async def upsert_similarities(self, rows: list[dict]) -> None:
        stmt = insert(GameCoPlaySimilarity).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=['source_igdb_id'],
            set_={'similar_igdb_ids': stmt.excluded.similar_igdb_ids,
                  'similarity_scores': stmt.excluded.similarity_scores}
        )

        await self._session.execute(stmt)
