from datetime import datetime
from sqlalchemy import ARRAY, SMALLINT, Float, Integer, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

from config import settings


class Base(DeclarativeBase):
    pass


class Game(Base):
    __tablename__ = 'games'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    igdb_id: Mapped[int] = mapped_column(Integer, nullable=False)

    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    storyline: Mapped[str | None] = mapped_column(Text)
    igdb_url: Mapped[str | None] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(Text)

    game_status: Mapped[int | None] = mapped_column(SMALLINT)
    game_type: Mapped[int | None] = mapped_column(SMALLINT)

    genres: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default='{}', nullable=False)
    themes: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default='{}', nullable=False)
    keywords: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default='{}', nullable=False)
    game_modes: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default='{}', nullable=False)
    player_perspectives: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default='{}', nullable=False)
    platforms: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default='{}', nullable=False)
    developers: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default='{}', nullable=False)

    summary_small: Mapped[str | None] = mapped_column(Text)

    embedding: Mapped[list[float] | None] = mapped_column(Vector(settings.EMBEDDINGS_DIM), nullable=True)

    rating: Mapped[float | None] = mapped_column(Float)
    rating_count: Mapped[int | None] = mapped_column(Integer)
    aggregated_rating: Mapped[float | None] = mapped_column(Float)
    aggregated_rating_count: Mapped[float | None] = mapped_column(Integer)
    hypes: Mapped[int | None] = mapped_column(Integer)

    first_release_date: Mapped[datetime | None] = mapped_column()
    igdb_updated_at: Mapped[datetime | None] = mapped_column()
    synced_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint('igdb_id', name='uq_games_igdb_id'),)

    def __repr__(self) -> str:
        return f'<Game id={self.igdb_id} name={self.name!r}>'


class SyncLog(Base):
    __tablename__ = 'sync_log'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sync_type: Mapped[str] = mapped_column(Text, nullable=False)
    started_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column()
    games_processed: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(Text, server_default="'running'", nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text)
