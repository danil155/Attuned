from fastapi import APIRouter, Depends, HTTPException, Header, Request
from db_service.crud import UserDataCrud

router = APIRouter(prefix='/auth', tags=['auth'])


async def _get_db(request: Request):
    return request.app.state.db


@router.post('/generate-account', summary='Generate an anonymous account')
async def generate_account(db=Depends(_get_db)):
    async with db.session() as session:
        crud = UserDataCrud(session)
        user, raw_token = await crud.create_user()

    return {
        'access_token': raw_token,
        'external_id': user.external_id,
        'avatar_emoji': user.avatar_emoji
    }


@router.post('/regenerate-token', summary='Update access token')
async def refresh_token(x_token: str = Header(...), db=Depends(_get_db)):
    async with db.session() as session:
        crud = UserDataCrud(session)
        user = await crud.get_user_by_token(x_token)

        if not user:
            raise HTTPException(status_code=401, detail='Invalid token')

        new_raw_token = await crud.regenerate_access_token(user.id)
        await session.commit()

    return {'access_token': new_raw_token}


@router.get('/me', summary='Get user data')
async def get_me(x_token: str = Header(..., description='Access token'), db=Depends(_get_db)):
    async with db.session() as session:
        crud = UserDataCrud(session)
        user = await crud.get_user_by_token(x_token)

        if not user:
            raise HTTPException(status_code=401, detail='Invalid token')

        return {
            'external_id': user.external_id,
            'is_pro': user.is_pro_active(),
            'avatar_emoji': user.avatar_emoji
        }


@router.get('/delete-account', summary='Delete account permanently')
async def delete_account(x_token: str = Header(...), db=Depends(_get_db)):
    async with db.session() as session:
        crud = UserDataCrud(session)
        user = await crud.get_user_by_token(x_token)

        if not user:
            raise HTTPException(status_code=401, detail='User not found')

        external_id = user.external_id

        await crud.delete_user(user.id)

        await session.commit()

    return {
        'status': 'success',
        'message': f'Account {external_id} deleted'
    }
