import asyncio
import logging
import numpy as np
from sentence_transformers import SentenceTransformer

from db_service.connection import Database
from db_service.crud import EmbeddingCrud

logger = logging.getLogger(__name__)

MODEL_NAME = 'all-MiniLM-L6-v2'
DB_BATH_SIZE = 512
MODEL_BATCH_SIZE = 64

MAX_KEYWORDS = 50

SEMANTIC_WEIGHT = 0.6
TAGS_WEIGHT = 0.4


class EmbeddingService:
    def __init__(self, db: Database) -> None:
        self._db = db
        self._model: SentenceTransformer | None = None

    def _load_model(self) -> SentenceTransformer:
        if self._model is None:
            logger.info(f'Loading model: {MODEL_NAME}')
            self._model = SentenceTransformer(MODEL_NAME)
            logger.info('Model loaded')

        return self._model

    async def run(self) -> None:
        async with self._db.background_session() as session:
            total_pending = await EmbeddingCrud(session).count_without_embeddings()

        if total_pending == 0:
            logger.info('All games already have embeddings, nothing to do')
            return

        logger.info(f'Games without embeddings: {total_pending}')
        model = self._load_model()

        processed = 0
        while True:
            async with self._db.background_session() as session:
                rows = await EmbeddingCrud(session).get_games_without_embeddings(batch_size=DB_BATH_SIZE)

            if not rows:
                break

            semantic_texts = [_build_semantic_text(r) for r in rows]
            tags_texts = [_build_tags_text(r) for r in rows]

            semantic_vectors, tags_vectors = await asyncio.to_thread(
                _encode_two_fields, model, semantic_texts, tags_texts
            )

            final_vectors = _combine(semantic_vectors, tags_vectors)
            embeddings = [(r.id, vector.tolist()) for r, vector in zip(rows, final_vectors)]

            async with self._db.background_session() as session:
                await EmbeddingCrud(session).save_embeddings(embeddings)

            processed += len(rows)
            logger.info(f'Embedded {processed} / {total_pending} games')

        logger.info(f'Embedding complete: {processed} games processed')


def _build_semantic_text(row) -> str:
    parts = [row.name, row.name]

    if row.summary:
        parts.append(row.summary)
    if row.storyline:
        parts.append(row.storyline)

    return ' '.join(parts)


def _build_tags_text(row) -> str:
    parts: list[str] = []

    if row.genres:
        parts.append(' '.join(row.genres))

    if row.themes:
        themes_str = ' '.join(row.themes)
        parts.append(themes_str)
        parts.append(themes_str)

    if row.keywords:
        top_keywords = row.keywords[:MAX_KEYWORDS]
        parts.append(' '.join(top_keywords))

    return ' '.join(parts) if parts else row.name


def _encode_two_fields(model: SentenceTransformer,
                       semantic_texts: list[str],
                       tags_texts: list[str]) -> tuple[np.ndarray, np.ndarray]:
    semantic_vectors = model.encode(
        semantic_texts,
        batch_size=MODEL_BATCH_SIZE,
        normalize_embeddings=True,
        show_progress_bar=False
    )

    tags_vectors = model.encode(
        tags_texts,
        batch_size=MODEL_BATCH_SIZE,
        normalize_embeddings=True,
        show_progress_bar=False
    )

    return semantic_vectors, tags_vectors


def _combine(semantic_vectors: np.ndarray, tags_vectors: np.ndarray) -> np.ndarray:
    combined = SEMANTIC_WEIGHT * semantic_vectors + TAGS_WEIGHT * tags_vectors
    norms = np.linalg.norm(combined, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)

    return combined / norms
