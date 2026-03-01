# =============================================================================
# AUCARE Backend - FastAPI Application Entry Point
# =============================================================================

# Compatibility shim: some third-party packages still import abstract
# base classes from `collections` (deprecated/removed). Ensure those
# names are available on the `collections` module by forwarding to
# `collections.abc` before other imports happen.
import collections as _collections
import collections.abc as _collections_abc

for _name in ("Mapping", "MutableMapping", "Iterable", "Sequence"):
    if not hasattr(_collections, _name) and hasattr(_collections_abc, _name):
        setattr(_collections, _name, getattr(_collections_abc, _name))

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as api_v1_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.db.session import engine

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown events."""
    configure_logging()
    logger.info("Starting AUCARE API", environment=settings.ENVIRONMENT)

    yield

    logger.info("Shutting down AUCARE API")
    await engine.dispose()


def create_application() -> FastAPI:
    """Application factory for creating the FastAPI instance."""
    app = FastAPI(
        title=settings.APP_NAME,
        description="AUCARE SaaS Platform API",
        version="0.1.0",
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        openapi_url="/api/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_v1_router, prefix="/api/v1")

    return app


app = create_application()
