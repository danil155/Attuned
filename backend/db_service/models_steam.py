from sqlalchemy import ARRAY, Float, Integer, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from db_service.models import Base
from config import settings


class SteamIGDBMap(Base):
    __tablename__ = 'steam_igdb_map'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    steam_appid: Mapped[int] = mapped_column(Integer, nullable=False)
    igdb_id: Mapped[int] = mapped_column(Integer, nullable=False)
    match_method: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, server_default='1.0')

    __table_args__ = (
        UniqueConstraint('steam_appid', name='uq_steam_igdb_map_appid'),
        Index('idx_steam_igdb_map_igdb', 'igdb_id'),
    )

    def __repr__(self) -> str:
        return f'<SteamIGDBMap steam={self.steam_appid} igdb={self.igdb_id} via={self.match_method}>'


class GameCoPlaySimilarity(Base):
    __tablename__ = 'game_coplay_similarity'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_igdb_id: Mapped[int] = mapped_column(Integer, nullable=False)
    similar_igdb_ids: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False, server_default='{}')
    similarity_scores: Mapped[list[float]] = mapped_column(ARRAY(Float), nullable=False, server_default='{}')

    __table_args__ = (
        UniqueConstraint('source_igdb_id', name='uq_coplay_source'),
        Index('idx_coplay_source', 'source_igdb_id'),
        Index('idx_coplay_similar_gin', 'similar_igdb_ids', postgresql_using='gin'),
    )

    def __repr__(self) -> str:
        return f'<GameCoPlaySimilarity source={self.source_igdb_id} n={len(self.similar_igdb_ids)}>'
