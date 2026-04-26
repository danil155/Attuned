from fastapi import APIRouter, Depends, HTTPException, Request, status

from recommendation_service import RecommendationService
from recommendation_service.schemas import RecommendationRequest, RecommendationResponse

router = APIRouter(prefix='/recommendations', tags=['recommendations'])


def _get_recommendation_service(request: Request) -> RecommendationService:
    return request.app.state.recommendation_service


@router.post('/',
             response_model=RecommendationResponse,
             summary='Get recommendations')
async def get_recommendations(body: RecommendationRequest,
                              service: RecommendationService = Depends(_get_recommendation_service)
                              ) -> RecommendationResponse:
    try:
        return await service.recommend(body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Internal server error')
