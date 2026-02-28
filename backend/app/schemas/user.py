# =============================================================================
# AUCARE Backend - User Schemas
# =============================================================================

from pydantic import EmailStr

from app.schemas.base import BaseSchema, TimestampedSchema


class UserBase(BaseSchema):
    """Base user schema with shared fields."""

    email: EmailStr
    full_name: str | None = None


class UserCreate(UserBase):
    """Schema for creating a new user."""

    password: str


class UserUpdate(BaseSchema):
    """Schema for updating a user."""

    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = None


class UserRead(UserBase, TimestampedSchema):
    """Schema for reading user data."""

    is_active: bool
    is_verified: bool
