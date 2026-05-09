from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from db_service import UserDataCrud
from api.rate_limiter import limiter
from api.cookie import get_token_from_request, set_token_cookie, clear_token_cookie

router = APIRouter(prefix='/auth', tags=['auth'])


async def _get_db(request: Request):
    return request.app.state.db


@router.post('/generate-account', summary='Generate an anonymous account')
@limiter.limit('5/hour')
@limiter.limit('30/day')
async def generate_account(
        request: Request,
        response: Response,
        db=Depends(_get_db)
):

    async with db.session() as session:
        crud = UserDataCrud(session)
        user, raw_token = await crud.create_user()

    set_token_cookie(response, raw_token)

    return {
        'access_token': raw_token,
        'external_id': user.external_id,
        'avatar_emoji': user.avatar_emoji
    }


@router.post('/regenerate-token', summary='Update access token')
@limiter.limit('30/hour')
async def refresh_token(
        request: Request,
        response: Response,
        db=Depends(_get_db)
):
    token = await get_token_from_request(request)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token required'
        )

    async with db.session() as session:
        crud = UserDataCrud(session)
        user = await crud.get_user_by_token(token)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Invalid token'
            )

        new_raw_token = await crud.regenerate_access_token(user.id)
        await session.commit()

    set_token_cookie(response, new_raw_token)

    return {'access_token': new_raw_token}


@router.get('/me', summary='Get user data')
async def get_me(
        request: Request,
        db=Depends(_get_db)
):
    token = await get_token_from_request(request)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token required'
        )

    async with db.session() as session:
        crud = UserDataCrud(session)
        user = await crud.get_user_by_token(token)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Invalid token'
            )

        return {
            'external_id': user.external_id,
            'is_pro': user.is_pro_active(),
            'avatar_emoji': user.avatar_emoji
        }


@router.post('/logout', summary='Logout')
async def logout(
        request: Request,
        response: Response
):
    clear_token_cookie(response)

    return {'success': True}


@router.get('/delete-account', summary='Delete account permanently')
async def delete_account(
        request: Request,
        response: Response,
        db=Depends(_get_db)
) -> dict[str, str]:
    token = await get_token_from_request(request)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token required'
        )

    async with db.session() as session:
        crud = UserDataCrud(session)
        user = await crud.get_user_by_token(token)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='User not found'
            )

        external_id = user.external_id

        await crud.delete_user(user.id)
        await session.commit()

    clear_token_cookie(response)

    return {
        'status': 'success',
        'message': f'Account {external_id} deleted'
    }


@router.post('/set-token', summary='Set token from existing user')
async def set_token(
        request: Request,
        response: Response,
        db=Depends(_get_db)
):
    body = await request.json()
    token = body.get('token')

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Token required'
        )

    async with db.session() as session:
        crud = UserDataCrud(session)
        user = await crud.get_user_by_token(token)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Invalid token'
            )

    set_token_cookie(response, token)

    return {'success': True}
