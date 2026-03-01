# =============================================================================
# AUCARE Backend - API v1 Router
# =============================================================================

from fastapi import APIRouter

from app.api.v1.endpoints import health, auth, analysis

router = APIRouter()

router.include_router(health.router, prefix="/health", tags=["Health"])
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
