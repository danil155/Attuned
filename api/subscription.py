from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from db_service import UserDataCrud
from api.rate_limiter import limiter
from api.cookie import get_token_from_request

router = APIRouter(prefix='/promo', tags=['promo'])


async def _get_db(request: Request):
    return request.app.state.db


class PromoRequest(BaseModel):
    promo_code: str


@router.post('/activate')
@limiter.limit('10/hour')
async def activate_promo(
        request: Request,
        body: PromoRequest,
        db=Depends(_get_db)
):
    token = await get_token_from_request(request)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token required'
        )

    promo_code = body.promo_code

    async with db.session() as session:
        valid_promos = {
            'I_LOVE_ROCK': 30
        }

        if promo_code not in valid_promos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invalid promo code'
            )

        crud = UserDataCrud(session)
        user = await crud.get_user_by_token(token)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Invalid token'
            )

        days = valid_promos[promo_code]
        success = await crud.activate_pro(user.external_id, days)
        await session.commit()

        return {'success': success, 'days': days}
