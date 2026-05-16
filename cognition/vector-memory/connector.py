"""Vector memory connector for Echo AI³.

This module provides a thin wrapper around pgvector or compatible APIs so that
Echo can store embeddings without coupling directly to a specific vendor.

The connector is intentionally synchronous to keep usage simple inside Builder
server actions. For large batch operations consider executing from a background
worker or orchestrator job.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Iterable, List, Optional

import requests

logger = logging.getLogger("echo.vector-memory")


@dataclass
class EmbeddingRecord:
    """Represents a semantic memory item."""

    id: str
    vector: List[float]
    metadata: dict[str, str] = field(default_factory=dict)
    namespace: str = "default"


class VectorMemoryError(RuntimeError):
    pass


class VectorMemoryConnector:
    """Simple HTTP connector for pgvector compatible services."""

    def __init__(
        self,
        endpoint: Optional[str] = None,
        api_key: Optional[str] = None,
        session: Optional[requests.Session] = None,
    ) -> None:
        self.endpoint = endpoint or os.environ.get("VECTOR_MEMORY_URL")
        if not self.endpoint:
            raise ValueError("VECTOR_MEMORY_URL environment variable is required")

        self.api_key = api_key or os.environ.get("VECTOR_MEMORY_TOKEN")
        self.session = session or requests.Session()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def upsert(self, records: Iterable[EmbeddingRecord]) -> None:
        payload = {"records": [self._record_to_payload(record) for record in records]}
        self._post("/upsert", payload)

    def query(self, vector: List[float], top_k: int = 8, namespace: str = "default") -> list[dict]:
        payload = {"vector": vector, "topK": top_k, "namespace": namespace}
        response = self._post("/query", payload)
        return response.get("matches", [])

    def delete_namespace(self, namespace: str) -> None:
        self._post("/delete", {"namespace": namespace})

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _record_to_payload(self, record: EmbeddingRecord) -> dict:
        return {
            "id": record.id,
            "values": record.vector,
            "metadata": record.metadata,
            "namespace": record.namespace,
        }

    def _post(self, path: str, payload: dict) -> dict:
        url = f"{self.endpoint.rstrip('/')}{path}"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        logger.debug("VectorMemory POST %s payload=%s", url, json.dumps(payload)[:256])
        response = self.session.post(url, headers=headers, json=payload, timeout=30)
        if response.status_code >= 400:
            raise VectorMemoryError(f"Vector memory request failed: {response.status_code} {response.text}")
        return response.json() if response.text else {}


__all__ = ["VectorMemoryConnector", "EmbeddingRecord", "VectorMemoryError"]
