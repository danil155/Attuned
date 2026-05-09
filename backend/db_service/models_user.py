from sqlalchemy import ARRAY, Integer, Text, Boolean, ForeignKey, Index, BigInteger, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
import secrets
import hashlib

from db_service.models import Base


class UserData(Base):
    __tablename__ = 'user_data'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    external_id: Mapped[int] = mapped_column(Text, nullable=False, unique=True, index=True)
    access_token: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    is_pro: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='false')
    pro_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    avatar_emoji: Mapped[str] = mapped_column(Text, nullable=False, server_default="'🙂'")
    carts: Mapped[list['UserCart']] = relationship(back_populates='user', cascade='all, delete-orphan')
    interactions: Mapped[list['UserGameInteractions']] = relationship(back_populates='user', cascade='all, delete-orphan')

    def is_pro_active(self) -> bool:
        if not self.is_pro or not self.pro_expires_at:
            return False

        return datetime.utcnow() < self.pro_expires_at

    @staticmethod
    def generate_access_token() -> str:
        random_part = secrets.token_urlsafe(32)
        timestamp = str(int(datetime.utcnow().timestamp()))
        combined = f'{random_part}:{timestamp}'

        return hashlib.sha256(combined.encode()).hexdigest()[:32]

    def __repr__(self) -> str:
        return f'<AnonymousUser id={self.id} token={self.access_token[:8]}...>'


class UserCart(Base):
    __tablename__ = 'user_carts'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger,
                                         ForeignKey('user_data.id', ondelete='CASCADE'),
                                         nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    games: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False, server_default='{}')

    __table_args__ = (
        Index('idx_user_carts_user', 'user_id'),
        Index('idx_user_carts_games', 'games', postgresql_using='gin')
    )

    user: Mapped['UserData'] = relationship(back_populates='carts')


class UserGameInteractions(Base):
    __tablename__ = 'user_game_interactions'

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey('user_data.id', ondelete='CASCADE'), primary_key=True)
    igdb_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    interaction_type: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        Index('idx_user_interactions_user', 'user_id'),
        Index('idx_user_interactions_igdb', 'igdb_id'),
        Index('idx_user_interactions_type', 'interaction_type'),
    )

    user: Mapped['UserData'] = relationship(back_populates='interactions')

    def __repr__(self) -> str:
        return f'<UserGameInteraction user={self.user_id} game={self.igdb_id} type={self.interaction_type}>'
