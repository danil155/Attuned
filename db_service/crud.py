from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
import re

from db_service.models import Game
from igdb_service.schemas import IGDBGame


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

        stmt = stmt.on_conflict_do_update(
            index_elements=['igdb_id'],
            set_=update_cols,
        )

        await self._session.execute(stmt)

        return len(rows)


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
