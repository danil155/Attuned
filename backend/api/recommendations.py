from fastapi import APIRouter, Depends, HTTPException, Request, status

from recommendation_service import RecommendationService
from recommendation_service.schemas import RecommendationRequest, RecommendationResponse
from api.cookie import get_token_from_request

router = APIRouter(prefix='/recommendations', tags=['recommendations'])


def _get_recommendation_service(request: Request) -> RecommendationService:
    return request.app.state.recommendation_service


@router.post('',
             response_model=RecommendationResponse,
             summary='Get recommendations')
async def get_recommendations(
        request: Request,
        body: RecommendationRequest,
        service: RecommendationService = Depends(_get_recommendation_service)
) -> RecommendationResponse:
    token = await get_token_from_request(request)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token required'
        )

    try:
        return await service.recommend(body, token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Internal server error'
        )
