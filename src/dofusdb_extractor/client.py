"""Cliente para a API pública do DofusDB (https://api.dofusdb.fr).

A API usa uma sintaxe de query estilo MongoDB (operadores prefixados com `$`,
ex.: `$limit`, `$skip`, `$sort`, filtros `level[$gt]=10`). As respostas são
paginas em JSON com a forma:

    {
      "total": <int>,
      "limit": <int>,
      "skip": <int>,
      "data": [ ... registros ... ]
    }
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Iterator, Optional

DEFAULT_BASE_URL = "https://api.dofusdb.fr"
DEFAULT_PAGE_SIZE = 100
DEFAULT_TIMEOUT = 30
DEFAULT_USER_AGENT = "dofusdb-extractor/1.0 (+https://github.com/DofusDB)"


class DofusDBError(RuntimeError):
    """Erro genérico levantado pelo cliente da API."""


class DofusDBClient:
    """Cliente paginado e com retry para a API do DofusDB."""

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        page_size: int = DEFAULT_PAGE_SIZE,
        timeout: int = DEFAULT_TIMEOUT,
        user_agent: str = DEFAULT_USER_AGENT,
        max_retries: int = 4,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.page_size = page_size
        self.timeout = timeout
        self.user_agent = user_agent
        self.max_retries = max_retries
        self._opener = urllib.request.build_opener(urllib.request.HTTPHandler())

    def _request(self, endpoint: str, params: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        if params:
            url += "?" + urllib.parse.urlencode(params, doseq=True)

        request = urllib.request.Request(url, headers={"User-Agent": self.user_agent, "Accept": "application/json"})

        last_error: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                with self._opener.open(request, timeout=self.timeout) as response:
                    raw = response.read().decode("utf-8")
                return json.loads(raw)
            except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError, TimeoutError) as exc:
                last_error = exc
                if isinstance(exc, urllib.error.HTTPError) and exc.code in (400, 401, 403, 404):
                    raise DofusDBError(f"Requisição inválida para {url}: HTTP {exc.code}") from exc
                wait = min(2 ** attempt, 30)
                time.sleep(wait)

        raise DofusDBError(f"Falha após {self.max_retries} tentativas em {url}: {last_error}")

    def iter_collection(
        self,
        endpoint: str,
        query: Optional[dict[str, Any]] = None,
        extra_params: Optional[dict[str, Any]] = None,
        limit: Optional[int] = None,
    ) -> Iterator[dict[str, Any]]:
        """Itera sobre todos os registros de uma coleção, paginando automaticamente."""
        params: dict[str, Any] = dict(query or {})
        params.update(extra_params or {})

        fetched = 0
        skip = 0
        while True:
            page_params = dict(params)
            page_params["$limit"] = self.page_size
            page_params["$skip"] = skip
            payload = self._request(endpoint, page_params)
            data = payload.get("data") or []
            total = payload.get("total", 0)

            if not data:
                break

            for record in data:
                yield record
                fetched += 1
                if limit is not None and fetched >= limit:
                    return

            if total and skip + len(data) >= total:
                break
            if len(data) < self.page_size:
                break
            skip += len(data)

    def count(self, endpoint: str, query: Optional[dict[str, Any]] = None, extra_params: Optional[dict[str, Any]] = None) -> int:
        params: dict[str, Any] = dict(query or {})
        params.update(extra_params or {})
        params["$limit"] = 1
        payload = self._request(endpoint, params)
        return int(payload.get("total", 0))

    def list_endpoints(self) -> list[str]:
        """Retorna as coleções conhecidas da API do DofusDB."""
        return KNOWN_ENDPOINTS


KNOWN_ENDPOINTS = [
    "achievements",
    "achievementCategories",
    "alignments",
    "areas",
    "breeds",
    "effects",
    "itemSets",
    "items",
    "jobs",
    "mapPositions",
    "monsters",
    "mounts",
    "npcActions",
    "pets",
    "quests",
    "resources",
    "spells",
    "subAreas",
    "titleCategories",
    "titles",
    "weapons",
]
