# =============================================================================
# AUCARE Backend - Database Models
# =============================================================================
# Import all models here to ensure they are registered with SQLAlchemy
# =============================================================================

from app.db.base import Base
from app.models.user import User

__all__ = ["Base", "User"]
