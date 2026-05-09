import logging

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from sklearn.preprocessing import normalize

from config import settings
from db_service import Database, SteamMappingCrud

logger = logging.getLogger(__name__)


class CoPlaySimilarityBuilder:
    def __init__(self, db: Database) -> None:
        self._db = db
        self._review_csv_path = settings.REVIEW_CSV_PATH

    async def run(self) -> int | None:
        async with self._db.background_session() as session:
            existing = await SteamMappingCrud(session).get_similarities_count()
            if existing > 0:
                logger.info(f'Co-play similarity already built, skipping')
                return None

        logger.info('Building co-play similarity matrix...')
        appid_to_igdb = await self._load_mapping()
        if not appid_to_igdb:
            logger.error('steam_igdb_map is empty')
            return 0

        logger.info('Building user-game interaction matrix...')
        user_idx, game_idx, sparse_matrix = self._build_sparse_matrix(appid_to_igdb)
        logger.info(
            f'Matrix shape: {sparse_matrix.shape} '
            f'(users×games), nnz={sparse_matrix.nnz}'
        )

        logger.info('Computing cosine similarity between games...')

        game_matrix = normalize(sparse_matrix, norm='l2', axis=0)

        similarity_rows = self._compute_similarity_topk(game_matrix, game_idx)

        logger.info(f'Saving {len(similarity_rows)} similarity rows to DB...')
        await self._save(similarity_rows)
        logger.info(f'Co-play similarity complete: {len(similarity_rows)} games')

        return len(similarity_rows)

    async def _load_mapping(self) -> dict[int, int]:
        async with self._db.background_session() as session:
            return await SteamMappingCrud(session).load_appid_to_igdb_map()

    def _build_sparse_matrix(self, appid_to_igdb: dict[int, int]) -> tuple[dict, dict, csr_matrix]:
        chunks_iter = pd.read_csv(
            self._review_csv_path,
            usecols=['author_steamid', 'appid'],
            dtype={'author_steamid': str, 'appid': int},
            chunksize=100000,
        )

        rows_list, cols_list = [], []
        user_to_idx: dict[str, int] = {}
        game_to_idx: dict[int, int] = {}

        for chunk in chunks_iter:
            chunk = chunk[chunk['appid'].isin(appid_to_igdb)].copy()
            chunk['igdb_id'] = chunk['appid'].map(appid_to_igdb)
            chunk = chunk.dropna(subset=['author_steamid', 'igdb_id'])

            for _, row in chunk.iterrows():
                user_id = str(row['author_steamid'])
                igdb_id = int(row['igdb_id'])

                if user_id not in user_to_idx:
                    user_to_idx[user_id] = len(user_to_idx)
                if igdb_id not in game_to_idx:
                    game_to_idx[igdb_id] = len(game_to_idx)

                rows_list.append(user_to_idx[user_id])
                cols_list.append(game_to_idx[igdb_id])

        n_users = len(user_to_idx)
        n_games = len(game_to_idx)

        data = np.ones(len(rows_list), dtype=np.float32)
        matrix = csr_matrix(
            (data, (rows_list, cols_list)),
            shape=(n_users, n_games),
            dtype=np.float32,
        )

        idx_to_igdb = {v: k for k, v in game_to_idx.items()}

        return user_to_idx, idx_to_igdb, matrix

    @staticmethod
    def _compute_similarity_topk(
            game_matrix: csr_matrix,
            idx_to_igdb: dict[int, int],
            block_size: int = 500,
    ) -> list[dict]:
        n_games = game_matrix.shape[1]
        game_matrix_T = game_matrix.T

        results = []

        for start in range(0, n_games, block_size):
            end = min(start + block_size, n_games)
            block = game_matrix_T[start:end]

            sim_block = (block @ game_matrix).toarray()

            for local_i, global_i in enumerate(range(start, end)):
                sims = sim_block[local_i].copy()
                sims[global_i] = 0.0

                top_k_idx = np.argpartition(sims, -settings.TOP_K)[-settings.TOP_K:]
                top_k_idx = top_k_idx[np.argsort(sims[top_k_idx])[::-1]]

                top_k_idx = [j for j in top_k_idx if sims[j] >= settings.MIN_SIMILARITY]

                if not top_k_idx:
                    continue

                source_igdb = idx_to_igdb[global_i]
                similar_igdbs = [idx_to_igdb[j] for j in top_k_idx]
                scores = [float(sims[j]) for j in top_k_idx]

                results.append({
                    'source_igdb_id': source_igdb,
                    'similar_igdb_ids': similar_igdbs,
                    'similarity_scores': scores,
                })

        return results

    async def _save(self, rows: list[dict]) -> None:
        if not rows:
            return

        for i in range(0, len(rows), settings.DB_BATCH_SIZE):
            batch = rows[i: i + settings.DB_BATCH_SIZE]

            async with self._db.background_session() as session:
                await SteamMappingCrud(session).upsert_similarities(batch)
