import logging
import re
import secrets
import hashlib
import time
import random
from datetime import datetime, timezone, timedelta
from sqlalchemy import func, select, update, Float, delete, and_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from config_vars import CrudParameters
from db_service.models import Game, SyncLog
from db_service.models_user import UserData, UserCart, UserGameInteractions
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

        update_cols = {col: stmt.excluded[col] for col in rows[0] if col != 'igdb_id'}
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

    async def count(self) -> int:
        result = await self._session.execute(select(func.count()).select_from(Game))

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

    async def count_without_embeddings(self) -> None:
        result = await self._session.execute(
            select(func.count()).select_from(Game).where(Game.embedding.is_(None))
        )

        return result.scalar_one()


class RecommendationCrud:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_embeddings_by_igdb_ids(self, igdb_ids: list[int]) -> list[tuple[int, list[float]]]:
        result = await self._session.execute(
            select(Game.igdb_id, Game.embedding)
            .where(Game.igdb_id.in_(igdb_ids), Game.embedding.is_not(None))
        )

        return [(row.igdb_id, row.embedding) for row in result.all()]

    async def find_similar(self,
                           embedding: list[float],
                           exclude_igdb_ids: list[int],
                           limit: int,
                           only_released: bool = True,
                           min_rating_count: int = 10) -> list[Game]:
        filters = [
            Game.embedding.is_not(None),
            Game.igdb_id.not_in(exclude_igdb_ids) if exclude_igdb_ids else True,
            Game.rating_count >= min_rating_count,
        ]

        if only_released:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            filters.append(Game.first_release_date <= now)

        stmt = (select(Game)
                .where(*filters)
                .order_by(Game.embedding.op('<=>', return_type=Float)(embedding))
                .limit(limit)
                )
        result = await self._session.execute(stmt)

        return list(result.scalars().all())

    async def get_max_rating_count(self) -> int:
        result = await self._session.execute(
            select(func.max(Game.rating_count))
        )

        return result.scalar_one() or 1


class SearchCrud:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def search_by_name(self, query: str, limit: int = 20) -> list[Game]:
        result = await self._session.execute(
            select(Game)
            .where(Game.name.bool_op('%')(query), Game.embedding.is_not(None))
            .order_by(func.similarity(Game.name, query).desc())
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

        avatar_emoji = random.choice(CrudParameters.EMOJI_LIST)

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

    async def get_user_by_external_id(self, external_id: str) -> UserData | None:
        result = await self._session.execute(
            select(UserData)
            .where(UserData.external_id == external_id)
        )
        user = result.scalar_one_or_none()

        if user and user.is_pro and user.pro_expires_at and datetime.utcnow() > user.pro_expires_at:
            user.is_pro = False
            await self._session.flush()

        return user

    async def activate_pro(self, external_id: str) -> bool:
        expires_at = datetime.utcnow() + timedelta(days=31)

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
