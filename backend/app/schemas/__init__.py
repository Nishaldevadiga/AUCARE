# =============================================================================
# MGCARE Backend - Pydantic Schemas
# =============================================================================

from app.schemas.base import BaseSchema, PaginatedResponse
from app.schemas.user import UserCreate, UserRead, UserUpdate

__all__ = [
    "BaseSchema",
    "PaginatedResponse",
    "UserCreate",
    "UserRead",
    "UserUpdate",
]
