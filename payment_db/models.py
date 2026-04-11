from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text, Enum, Index, BigInteger, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()


class PaymentStatus(enum.Enum):
    PENDING = 'pending'
    SUCCEEDED = 'succeeded'
    FAILED = 'failed'
    REFUNDED = 'refunded'


class PaymentTransaction(Base):
    __tablename__ = 'payment_transactions'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    payment_token = Column(String(255), nullable=False, unique=True, index=False)
    user_external_id = Column(String(255), nullable=False, index=True)

    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, server_default='RUB')
    payment_status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    paid_at = Column(DateTime, nullable=True)

    provider_data = Column(JSON, nullable=True)
    pro_activated = Column(Boolean, nullable=False, server_default='0')

    __table_args__ = (
        Index('idx_payment_user', 'user_external_id'),
        Index('idx_payment_status', 'payment_status'),
        Index('idx_payment_created', 'created_at'),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4'}
    )


class PaymentWebhookLog(Base):
    __tablename__ = 'payment_webhook_logs'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    headers = Column(Text, nullable=True)
    body = Column(Text, nullable=True)
    processed = Column(Boolean, nullable=False, default=False)
    error_message = Column(Text, nullable=True)
    received_at = Column(DateTime, nullable=False, server_default=func.now())

    __table_args__ = (
        Index('idx_webhook_processed', 'processed'),
        Index('idx_webhook_received', 'received_at'),
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4'}
    )
