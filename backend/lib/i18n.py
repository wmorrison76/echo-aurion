"""
D57.24 · i18n scaffold.

Hospitality is a multi-language industry from day one — a
property runs English in the back office, Spanish on the line,
sometimes Haitian Creole / Portuguese / Tagalog in housekeeping.
This is the translation primitive the rest of the platform calls.

Design

  · Catalog-based: one JSON per locale at i18n/locales/{lang}.json
  · `t(key, **vars, lang=None)` — looks up key, formats with vars
  · Fall through hierarchy: requested lang → en → key itself
  · Per-request lang resolution from Accept-Language header
    (FastAPI middleware) OR per-user preference (employees.lang)

Usage

    from lib.i18n import t
    msg = t("payroll.runs_locked", run_id=run_id, lang="es")
    # → "La nómina del periodo {run_id} está bloqueada." in Spanish

  · Keys are namespaced: payroll.* / hk.* / foh.* / errors.*
  · Translators get a flat JSON file per locale, easy for
    professional translation tools (POEditor, Crowdin, Lokalise)

Doctrine alignment

  · §2.5 pride from love: error messages localized to the
    employee's language never imply blame in any tongue
  · Tenet 8 forbidden persists, never surfaces: localized
    operator messages still strip individual names per §2.6
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any, Dict, Optional

DEFAULT_LANG = "en"
SUPPORTED_LANGS = ["en", "es", "ht", "pt", "tl", "fr"]
# en  English
# es  Spanish
# ht  Haitian Creole
# pt  Portuguese (Brazilian + European)
# tl  Tagalog
# fr  French


@lru_cache(maxsize=10)
def _load_catalog(lang: str) -> Dict[str, str]:
    """Load + cache a locale catalog. Returns {} on any failure
    so callers fall through to the next level."""
    path = os.path.join(
        os.path.dirname(__file__), "..", "i18n", "locales",
        f"{lang}.json")
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def t(key: str, lang: Optional[str] = None,
      default: Optional[str] = None,
      **vars: Any) -> str:
    """Translate a key. Falls through:
       requested lang → en → default → key

    `vars` are substituted via str.format_map.
    """
    lang = lang or DEFAULT_LANG
    catalog = _load_catalog(lang)
    if key in catalog:
        template = catalog[key]
    else:
        # Fall back to English
        catalog_en = _load_catalog(DEFAULT_LANG) if lang != DEFAULT_LANG else catalog
        template = catalog_en.get(key, default if default is not None else key)
    if not vars:
        return template
    try:
        return template.format_map(vars)
    except (KeyError, ValueError):
        return template


def parse_accept_language(header_value: Optional[str]) -> str:
    """Pick the highest-priority supported language from
    Accept-Language header. Defaults to DEFAULT_LANG."""
    if not header_value:
        return DEFAULT_LANG
    # Quick parse: lang;q=N,lang;q=N,...
    candidates = []
    for part in header_value.split(","):
        part = part.strip()
        if ";" in part:
            lang, _, qs = part.partition(";")
            try:
                q = float(qs.replace("q=", ""))
            except ValueError:
                q = 1.0
        else:
            lang, q = part, 1.0
        # Normalize: en-US → en
        lang = lang.split("-")[0].lower().strip()
        if lang in SUPPORTED_LANGS:
            candidates.append((q, lang))
    if not candidates:
        return DEFAULT_LANG
    candidates.sort(reverse=True)
    return candidates[0][1]


def list_supported() -> list[str]:
    return list(SUPPORTED_LANGS)
