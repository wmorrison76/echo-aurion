# Vector Memory Connector

The connector exposes a minimal wrapper around pgvector/Pinecone-style HTTP APIs. Configure the following environment variables when running inside Builder actions or orchestrator workers:

- `VECTOR_MEMORY_URL` – Base URL to the embedding service.
- `VECTOR_MEMORY_TOKEN` – Bearer token or API key (optional).

## Example

```python
from cognition.vector_memory.connector import VectorMemoryConnector, EmbeddingRecord

connector = VectorMemoryConnector()
connector.upsert([
    EmbeddingRecord(
        id="recipe:creme-brulee",
        vector=[0.12, 0.98, ...],
        metadata={"type": "recipe", "title": "Crème brûlée"},
        namespace="recipes",
    )
])

matches = connector.query([0.11, 0.97, ...], namespace="recipes")
```

When running in development, you can point the connector at a local pgvector proxy such as [Supabase Edge Functions], ensuring Echo’s long-term memory stays within controlled infrastructure.
