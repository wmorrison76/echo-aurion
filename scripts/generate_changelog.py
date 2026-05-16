#!/usr/bin/env python3
"""D56.26 · Generate CHANGELOG.md from doctrine-aligned commits.

Reads `git log` since the last tag (or all commits if no tags),
groups by D-series prefix (D31, D45, etc.), and emits a clean
CHANGELOG.md to stdout.

Usage:
    python scripts/generate_changelog.py                 # since last tag
    python scripts/generate_changelog.py --since=v1.0.0  # since specific
    python scripts/generate_changelog.py --since=main    # all on branch
    python scripts/generate_changelog.py > CHANGELOG.md
"""
from __future__ import annotations
import argparse
import collections
import re
import subprocess
import sys


D_SERIES_RE = re.compile(r"^(D\d+(?:[a-z])?(?:[-+]\w+)?)\s*[:·]?\s*(.+)$")
SECTION_FOR = {
    "D28": "Echo AI³ event log",
    "D29": "Retrospective analyzer",
    "D30": "Forensic accountant",
    "D31": "EchoWaste intelligence",
    "D32": "Concierge intelligence",
    "D33": "POS-down failover",
    "D34": "MyEcho install + tablet",
    "D35": "Cross-dept borrow PAF",
    "D36": "Service auditors framework",
    "D37": "QR library + storyboard",
    "D38": "Cross-correlation engine",
    "D39": "Activity drawer + voice",
    "D41": "Forecast stress harness",
    "D42": "Chef order divergence",
    "D43": "Variance + benchmark + FOH",
    "D44": "Orphan module wiring",
    "D45": "Personal sous chef agent",
    "D46": "Vendor mobile ordering",
    "D47": "Payroll + self-service",
    "D48": "PMS core",
    "D49": "Tip share + what-if",
    "D50": "Reservation channels",
    "D51": "Chef P&L review",
    "D52": "Quarantine sweep",
    "D53": "Production hardening",
    "D54": "Invoice extractor",
    "D55": "Fixture sanitization",
    "D56": "Foundation gates",
    "D10": "Smoke tests",
    "D11": "Unified schedule",
}


def get_commits(since: str | None) -> list[tuple[str, str]]:
    """Return [(sha, subject)] commits to include."""
    if since:
        rev = f"{since}..HEAD"
    else:
        try:
            last_tag = subprocess.check_output(
                ["git", "describe", "--tags", "--abbrev=0"],
                stderr=subprocess.DEVNULL).decode().strip()
            rev = f"{last_tag}..HEAD"
        except subprocess.CalledProcessError:
            rev = "HEAD"
    out = subprocess.check_output(
        ["git", "log", rev, "--pretty=format:%h%x09%s"]).decode()
    rows = []
    for line in out.splitlines():
        if "\t" not in line:
            continue
        sha, subject = line.split("\t", 1)
        rows.append((sha, subject.strip()))
    return rows


def classify(subject: str) -> tuple[str, str]:
    """Returns (D-prefix or 'other', cleaned subject)."""
    m = D_SERIES_RE.match(subject)
    if m:
        return m.group(1).split("-")[0].split("+")[0], m.group(2)
    if subject.lower().startswith("merge "):
        return "merge", subject
    if subject.lower().startswith(("fix", "bug")):
        return "fix", subject
    if subject.lower().startswith(("docs", "doc:")):
        return "docs", subject
    if subject.lower().startswith(("test", "ci")):
        return "ci", subject
    return "other", subject


def render(commits: list[tuple[str, str]]) -> str:
    by_d = collections.defaultdict(list)
    for sha, subj in commits:
        d, cleaned = classify(subj)
        by_d[d].append((sha, cleaned))

    out: list[str] = []
    out.append("# CHANGELOG")
    out.append("")
    out.append("Generated from `git log` by `scripts/generate_changelog.py`.")
    out.append("Each PR is grouped under its D-series number; the heading is the human label.")
    out.append("")

    # D-series first, sorted numerically
    d_keys = sorted(
        (k for k in by_d if k.startswith("D")),
        key=lambda k: int(re.match(r"D(\d+)", k).group(1)) if re.match(r"D\d+", k) else 0)
    for d in d_keys:
        label = SECTION_FOR.get(d, "")
        heading = f"## {d}" + (f" · {label}" if label else "")
        out.append(heading)
        out.append("")
        for sha, subj in by_d[d]:
            out.append(f"  · `{sha}` {subj}")
        out.append("")

    # Then merges, fixes, docs, ci, other
    for cat in ["fix", "docs", "ci", "merge", "other"]:
        if cat in by_d and by_d[cat]:
            out.append(f"## {cat.capitalize()}")
            out.append("")
            for sha, subj in by_d[cat][:50]:  # cap to avoid noise
                out.append(f"  · `{sha}` {subj}")
            out.append("")

    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", default=None,
        help="Git ref to start from (default: last tag, or all)")
    args = ap.parse_args()
    commits = get_commits(args.since)
    print(render(commits))


if __name__ == "__main__":
    main()
