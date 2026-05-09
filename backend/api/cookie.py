from fastapi import Response, Request


def set_token_cookie(response: Response, token: str):
    response.set_cookie(
        key='attuned_token',
        value=token,
        httponly=True,
        # secure=True,
        samesite='strict',
        max_age=7 * 24 * 60 * 60,
        path='/'
    )


def clear_token_cookie(response: Response):
    response.delete_cookie(
        key='attuned_token',
        path='/'
    )


async def get_token_from_request(request: Request) -> str | None:
    token = request.cookies.get('attuned_token')
    if token:
        return token

    return None
