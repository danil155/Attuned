from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from payment_db.models import PaymentTransaction, PaymentStatus


class PaymentCrud:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_transaction(self,
                                 user_external_id: str,
                                 payment_token:str,
                                 amount: float,
                                 currency: str = 'RUB',
                                 provider_data: dict | None = None) -> PaymentTransaction:
        transaction = PaymentTransaction(
            user_external_id=user_external_id,
            payment_token=payment_token,
            amount=amount,
            currency=currency,
            provider_data=provider_data
        )

        self._session.add(transaction)
        await self._session.flush()

        return transaction

    async def confirm_payment(self, payment_token: str, paid_at: datetime | None = None) -> PaymentTransaction | None:
        now = paid_at or datetime.utcnow()

        result = await self._session.execute(select(PaymentTransaction)
                                             .where(PaymentTransaction.payment_token == payment_token))
        transaction = result.scalar_one_or_none()

        if not transaction or transaction.payment_status != PaymentStatus.PENDING:
            return None

        transaction.payment_status = PaymentStatus.SUCCEEDED
        transaction.paid_at = now
        transaction.pro_activated = True

        await self._session.flush()

        return transaction

    async def fail_payment(self, payment_token: str, error_message: str) -> bool:
        result = await self._session.execute(
            update(PaymentTransaction)
            .where(PaymentTransaction.payment_token == payment_token)
            .values(payment_status=PaymentStatus.FAILED,
                    provider_data={'error': error_message})
        )

        await self._session.flush()

        return result.rowcount > 0

    async def get_transaction(self, payment_token: str) -> PaymentTransaction | None:
        result = await self._session.execute(
            select(PaymentTransaction)
            .where(PaymentTransaction.payment_token == payment_token)
        )

        return result.scalar_one_or_none()

    async def has_active_pro(self, user_external_id: str) -> bool:
        result = await self._session.execute(
            select(PaymentTransaction)
            .where(PaymentTransaction.user_external_id == user_external_id,
                   PaymentTransaction.payment_status == PaymentStatus.SUCCEEDED,
                   PaymentTransaction.pro_activated == True)
            .order_by(PaymentTransaction.paid_at.desc())
            .limit(1)
        )

        transaction = result.scalar_one_or_none()

        return transaction is not None
