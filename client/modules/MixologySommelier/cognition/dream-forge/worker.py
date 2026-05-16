#!/usr/bin/env python3
"""Dream Forge: nocturnal creativity worker for Echo AI³.

The worker pulls prompts from a queue, generates ideas using an LLM or image
service, and writes artefacts to the filesystem. Use this in a scheduled
context; the worker exits after processing the current backlog.
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

import requests

DEFAULT_QUEUE = "dreams.jsonl"
DEFAULT_OUTPUT = "artifacts"


@dataclass
class DreamTask:
    id: str
    prompt: str
    audience: str
    tone: str
    context: Optional[dict] = None


class DreamForge:
    def __init__(self, model_endpoint: Optional[str] = None, api_key: Optional[str] = None) -> None:
        self.model_endpoint = model_endpoint or os.environ.get("DREAM_FORGE_ENDPOINT")
        if not self.model_endpoint:
            raise ValueError("DREAM_FORGE_ENDPOINT is required")
        self.api_key = api_key or os.environ.get("DREAM_FORGE_TOKEN")

    def run(self, tasks: Iterable[DreamTask], output_dir: Path) -> list[Path]:
        output_dir.mkdir(parents=True, exist_ok=True)
        artefacts: list[Path] = []
        for task in tasks:
            artefact = self._generate(task)
            target = output_dir / f"{task.id}.json"
            target.write_text(json.dumps(artefact, indent=2))
            artefacts.append(target)
        return artefacts

    def _generate(self, task: DreamTask) -> dict:
        payload = {
            "prompt": task.prompt,
            "audience": task.audience,
            "tone": task.tone,
            "context": task.context or {},
        }
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        response = requests.post(self.model_endpoint, json=payload, headers=headers, timeout=60)
        if response.status_code >= 400:
            raise RuntimeError(f"Dream Forge failed for {task.id}: {response.status_code} {response.text}")
        body = response.json()
        return {
            "task": task.__dict__,
            "idea": body.get("idea", ""),
            "recipe": body.get("recipe"),
            "design": body.get("design"),
            "metadata": body.get("metadata", {}),
        }


def load_queue(queue_path: Path) -> list[DreamTask]:
    if not queue_path.exists():
        return []
    tasks: list[DreamTask] = []
    for line in queue_path.read_text().splitlines():
        if not line.strip():
            continue
        data = json.loads(line)
        tasks.append(
            DreamTask(
                id=data["id"],
                prompt=data["prompt"],
                audience=data.get("audience", "general"),
                tone=data.get("tone", "warm"),
                context=data.get("context"),
            )
        )
    return tasks


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Dream Forge worker")
    parser.add_argument("--queue", type=Path, default=Path(DEFAULT_QUEUE), help="Path to JSONL queue")
    parser.add_argument("--output", type=Path, default=Path(DEFAULT_OUTPUT), help="Output directory")
    args = parser.parse_args()

    tasks = load_queue(args.queue)
    if not tasks:
        print("Dream Forge queue empty; nothing to do.")
        return

    forge = DreamForge()
    artefacts = forge.run(tasks, args.output)
    print(f"Generated {len(artefacts)} artefact(s)")


if __name__ == "__main__":
    main()
