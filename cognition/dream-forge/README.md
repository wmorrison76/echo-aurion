# Dream Forge Worker

Dream Forge is the creative counterpart to the neural meta-loop. It reads prompts from a JSONL queue, calls a text or image generation service, and stores the results as artefacts for human review the next morning.

## Queue Format

Each line in `dreams.jsonl` must be a JSON object:

```json
{"id": "winter-menu", "prompt": "Design five warm cocktails for après-ski", "audience": "chefs", "tone": "playful"}
```

## Environment

Set the following variables before running the worker:

- `DREAM_FORGE_ENDPOINT` – HTTPS endpoint of the generation service.
- `DREAM_FORGE_TOKEN` – Optional bearer token for authentication.

Run the worker nightly:

```bash
python cognition/dream-forge/worker.py --queue data/dreams.jsonl --output out/dreams
```

Review generated artefacts before publishing to ensure hospitality standards and guardrails are respected.
