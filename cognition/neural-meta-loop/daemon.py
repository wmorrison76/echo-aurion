#!/usr/bin/env python3
"""Neural meta-loop daemon for Echo AI³.

The daemon performs a daily retrospective by reading operational metrics,
conversation analytics, and guardrail outcomes. It produces a reflection file
and optional JSON report that can be reviewed by humans before Echo adjusts her
behaviour.

Usage:
    python daemon.py --metrics metrics.json --output reports/
"""

from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


@dataclass
class MetricSample:
    label: str
    value: float
    weight: float = 1.0


@dataclass
class Reflection:
    generated_at: str
    positive_signals: list[str]
    negative_signals: list[str]
    improvement_plan: list[str]
    score: float


def load_metrics(metrics_path: Path) -> list[MetricSample]:
    if not metrics_path.exists():
        raise FileNotFoundError(f"Metric file {metrics_path} not found")
    raw = json.loads(metrics_path.read_text())
    samples: list[MetricSample] = []
    for record in raw:
        samples.append(
            MetricSample(
                label=record["label"],
                value=float(record["value"]),
                weight=float(record.get("weight", 1.0)),
            )
        )
    return samples


def compute_reflection(samples: Iterable[MetricSample]) -> Reflection:
    positives: list[str] = []
    negatives: list[str] = []
    plan: list[str] = []
    score_total = 0.0
    weight_total = 0.0
    trends = Counter[str]()

    for sample in samples:
        weighted = sample.value * sample.weight
        score_total += weighted
        weight_total += sample.weight
        if sample.value >= 0.7:
            positives.append(f"Strength in {sample.label} ({sample.value:.2f})")
        elif sample.value <= 0.4:
            negatives.append(f"Needs attention: {sample.label} ({sample.value:.2f})")
            trends[sample.label] += 1

    for label, count in trends.most_common():
        plan.append(f"Investigate {label} regressions (seen {count} time(s)).")

    if not plan and negatives:
        plan.extend(f"Run focused coaching on {msg.split(':')[1].strip()}" for msg in negatives)

    score = score_total / weight_total if weight_total else 0.0
    return Reflection(
        generated_at=datetime.now(timezone.utc).isoformat(),
        positive_signals=positives,
        negative_signals=negatives,
        improvement_plan=plan,
        score=score,
    )


def write_reports(reflection: Reflection, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "reflection.json"
    log_path = output_dir / "log.md"

    json_path.write_text(json.dumps(asdict(reflection), indent=2))
    log_path.write_text(
        "\n".join(
            [
                f"# Echo AI³ Neural Meta-Loop\n",
                f"Generated: {reflection.generated_at}\n",
                "## Score",
                f"Overall: {reflection.score:.2f}\n",
                "## Highlights",
                *(f"- {item}" for item in reflection.positive_signals or ["- None recorded"]),
                "\n## Concerns",
                *(f"- {item}" for item in reflection.negative_signals or ["- None recorded"]),
                "\n## Planned Actions",
                *(f"- {item}" for item in reflection.improvement_plan or ["- Maintain current practices"]),
                "",
            ]
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the neural meta-loop evaluation")
    parser.add_argument("--metrics", type=Path, required=True, help="Path to JSON metrics input")
    parser.add_argument("--output", type=Path, default=Path("reports"), help="Directory for outputs")
    args = parser.parse_args()

    samples = load_metrics(args.metrics)
    reflection = compute_reflection(samples)
    write_reports(reflection, args.output)
    print(f"Reflection score: {reflection.score:.2f}")


if __name__ == "__main__":
    main()
