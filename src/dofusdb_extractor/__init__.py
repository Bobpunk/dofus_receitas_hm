"""Ponto de entrada do pacote do extrator do DofusDB."""

from .client import (
    DEFAULT_BASE_URL,
    DEFAULT_PAGE_SIZE,
    DofusDBClient,
    DofusDBError,
    KNOWN_ENDPOINTS,
)

__all__ = [
    "DEFAULT_BASE_URL",
    "DEFAULT_PAGE_SIZE",
    "DofusDBClient",
    "DofusDBError",
    "KNOWN_ENDPOINTS",
]
