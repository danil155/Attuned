from fastapi import APIRouter, Depends, HTTPException, Header, Request
from pydantic import BaseModel

from db_service import UserDataCrud

router = APIRouter(prefix='/promo', tags=['promo'])


async def _get_db(request: Request):
    return request.app.state.db


class PromoRequest(BaseModel):
    promo_code: str


@router.post('/activate')
async def activate_promo(
        body: PromoRequest,
        x_token: str = Header(...),
        db=Depends(_get_db)
):
    promo_code = body.promo_code

    async with db.session() as session:
        valid_promos = {
            'I_LOVE_ROCK': 30
        }

        if promo_code not in valid_promos:
            raise HTTPException(400, 'Неверный промокод')

        crud = UserDataCrud(session)
        user = await crud.get_user_by_token(x_token)

        if not user:
            raise HTTPException(401, 'Invalid token')

        days = valid_promos[promo_code]
        success = await crud.activate_pro(user.external_id, days)
        await session.commit()

        return {'success': success, 'days': days}
