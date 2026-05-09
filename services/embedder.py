import asyncio
import logging
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer

from config import settings
from db_service import Database, EmbeddingCrud


logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, db: Database) -> None:
        self._db = db
        self._model: SentenceTransformer | None = None
        self._review_csv_path = settings.REVIEW_CSV_PATH

    def _load_model(self) -> SentenceTransformer:
        if self._model is None:
            logger.info(f'Loading model: {settings.MODEL_NAME}')
            self._model = SentenceTransformer(settings.MODEL_NAME)
            logger.info('Model loaded')

        return self._model

    async def run(self) -> None:
        async with self._db.background_session() as session:
            total_pending = await EmbeddingCrud(session).count_without_embeddings()

        if total_pending == 0:
            logger.info('All games already have embeddings, nothing to do')
        else:
            logger.info(f'Games without embeddings: {total_pending}')
            await self._run_igdb_embeddings(total_pending)

        await self._run_review_embeddings()

    async def _run_igdb_embeddings(self, total_pending: int | None) -> None:
        model = self._load_model()

        processed = 0
        while True:
            async with self._db.background_session() as session:
                rows = await EmbeddingCrud(session).get_games_without_embeddings(batch_size=settings.DB_BATCH_SIZE)

            if not rows:
                break

            semantic_texts = [self._build_semantic_text(r) for r in rows]
            tags_texts = [self._build_tags_text(r) for r in rows]

            semantic_vectors, tags_vectors = await asyncio.to_thread(
                self._encode_two_fields, model, semantic_texts, tags_texts
            )

            final_vectors = self._combine(semantic_vectors, tags_vectors)
            embeddings = [(r.id, vector.tolist()) for r, vector in zip(rows, final_vectors)]

            async with self._db.background_session() as session:
                await EmbeddingCrud(session).save_embeddings(embeddings)

            processed += len(rows)
            logger.info(f'Embedded {processed} / {total_pending} games')

        logger.info(f'IGDB Embedding complete: {processed} games processed')

    @staticmethod
    def _build_semantic_text(row) -> str:
        parts = [row.name, row.name]

        if row.summary:
            parts.append(row.summary)
        if row.storyline:
            parts.append(row.storyline)

        return ' '.join(parts)

    @staticmethod
    def _build_tags_text(row) -> str:
        parts: list[str] = []

        if row.genres:
            parts.append(' '.join(row.genres))

        if row.themes:
            themes_str = ' '.join(row.themes)
            parts.append(themes_str)
            parts.append(themes_str)

        if row.keywords:
            top_keywords = row.keywords[:settings.MAX_KEYWORDS]
            parts.append(' '.join(top_keywords))

        return ' '.join(parts) if parts else row.name

    @staticmethod
    def _encode_two_fields(model: SentenceTransformer,
                           semantic_texts: list[str],
                           tags_texts: list[str]) -> tuple[np.ndarray, np.ndarray]:
        semantic_vectors = model.encode(
            semantic_texts,
            batch_size=settings.MODEL_BATCH_SIZE,
            normalize_embeddings=True,
            show_progress_bar=False
        )

        tags_vectors = model.encode(
            tags_texts,
            batch_size=settings.MODEL_BATCH_SIZE,
            normalize_embeddings=True,
            show_progress_bar=False
        )

        return semantic_vectors, tags_vectors

    @staticmethod
    def _combine(semantic_vectors: np.ndarray, tags_vectors: np.ndarray) -> np.ndarray:
        combined = settings.SEMANTIC_WEIGHT * semantic_vectors + settings.TAGS_WEIGHT * tags_vectors
        norms = np.linalg.norm(combined, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)

        return combined / norms

    async def _run_review_embeddings(self) -> None:
        already_built = await self._count_review_embeddings()

        if already_built > 0:
            logger.info(f'review_embedding alreay exists - skipping')
            return

        logger.info(f'Building review embeddings from {self._review_csv_path}')
        model = self._load_model()

        appid_to_igdb = await self._load_steam_mapping()
        if not appid_to_igdb:
            logger.error('steam_igdb_map is empty')
            return

        aggregated = await asyncio.to_thread(
            self._aggregate_reviews, appid_to_igdb
        )
        logger.info(f'Aggregated review texts for {len(aggregated)} games')

        if not aggregated:
            return

        igsb_ids = list(aggregated.keys())
        texts = [aggregated[i] for i in igsb_ids]

        vectors = await asyncio.to_thread(
            self._encode_review_texts, model, texts
        )

        await self._save_review_embeddings(igsb_ids, vectors)

    async def _count_review_embeddings(self) -> int:
        async with self._db.background_session() as session:
            return await EmbeddingCrud(session).count_review_embeddings()

    async def _load_steam_mapping(self) -> dict[int, int]:
        async with self._db.background_session() as session:
            return await EmbeddingCrud(session).load_steam_mapping()

    def _aggregate_reviews(self, appid_to_igdb: dict[int, int]) -> dict[int, str]:
        parts = []
        for chunk in pd.read_csv(
            self._review_csv_path,
            usecols=['appid', 'review_text', 'weighted_vote_score'],
            dtype={'appid': int, 'review_text': str, 'weighted_vote_score': float},
            chunksize=100000,
        ):
            chunk = chunk[chunk['appid'].isin(appid_to_igdb)].copy()
            chunk = chunk.dropna(subset=['review_text'])
            chunk = chunk[chunk['review_text'].str.len() >= settings.MIN_REVIEW_LEN]
            parts.append(chunk)

        if not parts:
            return {}

        df = pd.concat(parts, ignore_index=True)
        df['igdb_id'] = df['appid'].map(appid_to_igdb)

        aggregated: dict[int, str] = {}
        for igdb_id, group in df.groupby('igdb_id'):
            top = (
                group.sort_values('weighted_vote_score', ascending=False)
                .head(settings.MAX_REVIEWS_PER_GAME)
            )
            combined = ' [SEP] '.join(top['review_text'].tolist())
            aggregated[int(igdb_id)] = combined[:settings.MAX_CHARS_PER_GAME]

        return aggregated

    @staticmethod
    def _encode_review_texts(model: SentenceTransformer, texts: list[str]) -> np.ndarray:
        return model.encode(
            texts,
            batch_size=settings.MODEL_BATCH_SIZE,
            normalize_embeddings=True,
            show_progress_bar=True
        )

    async def _save_review_embeddings(self, igdb_ids: list[int], vectors: np.ndarray) -> None:
        saved = 0
        for i in range(0, len(igdb_ids), settings.DB_BATCH_SIZE):
            batch_ids = igdb_ids[i:i + settings.DB_BATCH_SIZE]
            batch_vecs = vectors[i:i + settings.DB_BATCH_SIZE]

            async with self._db.background_session() as session:
                await EmbeddingCrud(session).save_review_embeddings(igdb_ids, batch_vecs.tolist())

            saved += len(batch_ids)
            logger.info(f'Saved Review embeddings: {saved} / {len(igdb_ids)}')
