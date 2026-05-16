"""
EchoAurion · 409A Compliance & IP Evidence Pack — PDF Generator
================================================================
Generates a single, professionally-branded PDF that includes:

  * Title page (EchoAurion logo, classified-style cover)
  * Document index / quick-links (chapter links)
  * Table of Contents (auto-generated from H1/H2/H3 of source MD docs)
  * Section: 409A Compliance Scorecard
  * Section: Patent Positioning Strategy
  * Section: Patent Draft — Doctrine Enforcement
  * Section: IP Assignment Packet (P1)
  * Section: Filing / Vendor Packet (P3-P6)
  * Section: Privacy Packet (P7)
  * Section: Cap Table Guide (P9)
  * Section: Architecture Connections (free-wins roadmap)
  * Section: Terms of Service / SLA / Accessibility supplementals
  * Footer with page numbers on every page (Roman for front-matter,
    Arabic for body).

Output:
  /app/public/echoaurion-409a-evidence-pack.pdf
  /app/dist/spa/echoaurion-409a-evidence-pack.pdf  (also copied so it's
  served by the preview server under the public root)

Run:
  python3 /app/scripts/generate_409a_pdf.py
"""
from __future__ import annotations

import base64
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

import markdown as md_lib
from weasyprint import HTML, CSS

ROOT = Path("/app")
OUT_PATH = ROOT / "public" / "echoaurion-409a-evidence-pack.pdf"
DIST_OUT = ROOT / "dist" / "spa" / "echoaurion-409a-evidence-pack.pdf"

LOGO = ROOT / "echo-aurion-logo.png"


# ----- Sources to include, in print order -----
#  (heading_label, file_path_or_md, slug)
SOURCES: list[dict] = [
    {
        "label": "Executive Summary",
        "slug": "executive-summary",
        "kind": "inline",
        "content": None,  # filled in below
    },
    {
        "label": "409A Compliance Scorecard",
        "slug": "409a-scorecard",
        "kind": "md",
        "path": ROOT / "memory" / "409A_SCORECARD.md",
    },
    {
        "label": "Architecture Connections — Free Wins Roadmap",
        "slug": "architecture-connections",
        "kind": "md",
        "path": ROOT / "memory" / "ARCHITECTURE_CONNECTIONS.md",
    },
    {
        "label": "Patent Positioning Strategy",
        "slug": "patent-positioning",
        "kind": "md",
        "path": ROOT / "docs" / "legal" / "PATENT_POSITIONING_STRATEGY.md",
    },
    {
        "label": "Patent Draft — Doctrine Enforcement",
        "slug": "patent-draft",
        "kind": "md",
        "path": ROOT / "docs" / "legal" / "PATENT_DRAFT_doctrine_enforcement.md",
    },
    {
        "label": "P1 · IP Assignment Packet",
        "slug": "p1-ip-assignment",
        "kind": "md",
        "path": ROOT / "docs" / "legal" / "P1_IP_ASSIGNMENT_PACKET.md",
    },
    {
        "label": "P3-P6 · Filing & Vendor Packet",
        "slug": "p3-p6-filing",
        "kind": "md",
        "path": ROOT / "docs" / "legal" / "P3-P4-P5-P6_FILING_AND_VENDOR_PACKET.md",
    },
    {
        "label": "P7 · Privacy Packet",
        "slug": "p7-privacy",
        "kind": "md",
        "path": ROOT / "docs" / "legal" / "P7_PRIVACY_PACKET.md",
    },
    {
        "label": "P9 · Cap Table Guide",
        "slug": "p9-cap-table",
        "kind": "md",
        "path": ROOT / "docs" / "legal" / "P9_CAP_TABLE_GUIDE.md",
    },
    {
        "label": "T1-A5 · Terms of Service",
        "slug": "t1-a5-tos",
        "kind": "md",
        "path": ROOT / "docs" / "legal" / "T1-A5_TERMS_OF_SERVICE.md",
    },
    {
        "label": "T1-A5 · Service-Level Agreement",
        "slug": "t1-a5-sla",
        "kind": "md",
        "path": ROOT / "docs" / "legal" / "T1-A5_SLA.md",
    },
    {
        "label": "T1-4 / T1-6 · Accessibility & Cookies",
        "slug": "t1-4-acc",
        "kind": "md",
        "path": ROOT / "docs" / "legal" / "T1-4-T1-6_ACCESSIBILITY_AND_COOKIES.md",
    },
]


EXEC_SUMMARY = """
## Purpose of this Document

This evidence pack consolidates the **409A valuation readiness scorecard**
and the **complete intellectual-property positioning portfolio** for the
EchoAurion / LUCCCA platform into a single, signable, audit-ready PDF.

It is intended to be handed to:

1. **Independent appraisers** performing a §409A valuation of common stock.
2. **Patent counsel** preparing provisional / non-provisional filings.
3. **Investors / acquirers** during due diligence.
4. **Internal stakeholders** as a checkpoint of compliance posture.

## What's Inside

* **§409A Scorecard** — 67-item readiness matrix across deployment integrity,
  codebase quantification, intangible-asset separability, IP, data assets,
  reproducibility, governance, risk, and supporting valuation evidence.
* **Architecture Connections** — current state of the EchoAurion subsystems
  and the integrations that already produce defensible data flows.
* **Patent Portfolio** — positioning strategy plus a fully drafted
  *doctrine-enforcement* patent application.
* **P-series Legal Packets** — IP assignment, filing/vendor, privacy, and
  cap-table guides.
* **T-series Supplementals** — Terms of Service, SLA, accessibility / cookies.

## How to Read

The Table of Contents on the following page is **clickable** in any modern
PDF reader — every chapter, sub-chapter, and Quick-Link bookmark navigates
directly to that section. The Index at the back is the same set of
Quick-Links restated for printed reference.

> *Doctrine note:* even on a hit, the walkback continues — which trial was
> tightest, and what did it know? The pursuit is the discipline.
"""


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", text).strip().lower()
    s = re.sub(r"\s+", "-", s)
    return s[:80] or "section"


def encode_logo() -> str:
    if not LOGO.exists():
        return ""
    return "data:image/png;base64," + base64.b64encode(LOGO.read_bytes()).decode()


def md_to_html(text: str, section_slug: str) -> tuple[str, list[dict]]:
    """Convert markdown to html. Inject stable ids on H1/H2/H3 namespaced by
    the section slug and return the heading list for the TOC build."""
    extensions = ["fenced_code", "tables", "toc", "attr_list", "sane_lists"]
    converted = md_lib.markdown(text, extensions=extensions)

    headings: list[dict] = []

    def stamp_heading(match: re.Match) -> str:
        level = int(match.group(1))
        rest_attrs = match.group(2) or ""
        body = match.group(3)
        plain = re.sub(r"<.*?>", "", body).strip()
        if not plain or level > 3:
            return match.group(0)
        slug = f"{section_slug}--{slugify(plain)}"
        headings.append({"level": level, "text": plain, "id": slug})
        # Replace existing id if any
        if "id=" in rest_attrs:
            rest_attrs = re.sub(r' id="[^"]*"', f' id="{slug}"', rest_attrs)
        else:
            rest_attrs = f' id="{slug}"{rest_attrs}'
        return f"<h{level}{rest_attrs}>{body}</h{level}>"

    converted = re.sub(
        r"<h([1-6])([^>]*)>(.*?)</h\1>",
        stamp_heading,
        converted,
        flags=re.DOTALL,
    )
    return converted, headings


def render_section(source: dict) -> tuple[str, list[dict]]:
    section_id = source["slug"]
    label = source["label"]
    if source["kind"] == "inline":
        body_md = source["content"] or ""
    else:
        p: Path = source["path"]
        body_md = p.read_text(encoding="utf-8") if p.exists() else f"_(missing source: {p.name})_"

    body_html, headings = md_to_html(body_md, section_id)

    # Top-level chapter heading is the label itself
    top_heading = {"level": 0, "text": label, "id": section_id}
    chapter = f"""
    <section class="chapter" id="{section_id}">
      <h1 class="chapter-title">{label}</h1>
      <div class="chapter-body">{body_html}</div>
    </section>
    """
    return chapter, [top_heading, *headings]


def build_toc(toc_items: list[dict]) -> str:
    rows = []
    for it in toc_items:
        cls = f"toc-l{it['level']}"
        rows.append(
            f'<a class="toc-row {cls}" href="#{it["id"]}">'
            f'<span class="toc-label">{it["text"]}</span>'
            f'<span class="toc-dots"></span>'
            f'<span class="toc-page" data-target="{it["id"]}"></span>'
            f"</a>"
        )
    return f'<nav class="toc">{"".join(rows)}</nav>'


def build_quick_links(toc_items: list[dict]) -> str:
    # Only top-level chapter labels — used for both front-of-doc quick links
    # and back-of-doc index.
    chapters = [it for it in toc_items if it["level"] == 0]
    cells = "".join(
        f'<a class="ql-cell" href="#{it["id"]}">{it["text"]}</a>'
        for it in chapters
    )
    return f'<div class="quick-links">{cells}</div>'


def render_html() -> str:
    logo_uri = encode_logo()
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    # First section is the inline Executive Summary — inject content
    SOURCES[0]["content"] = EXEC_SUMMARY

    chapters_html = []
    all_toc: list[dict] = []
    for src in SOURCES:
        ch, headings = render_section(src)
        chapters_html.append(ch)
        all_toc.extend(headings)

    toc = build_toc(all_toc)
    quick_links = build_quick_links(all_toc)
    chapters_joined = "\n".join(chapters_html)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>EchoAurion · 409A Compliance & IP Evidence Pack</title>
</head>
<body>

<!-- ── Title page ───────────────────────────────────────────────── -->
<section class="title-page">
  <div class="title-frame">
    <div class="title-logo">
      {f'<img src="{logo_uri}" alt="EchoAurion" />' if logo_uri else ""}
    </div>
    <div class="title-classification">CONFIDENTIAL · 409A EVIDENCE</div>
    <h1 class="title-h1">EchoAurion</h1>
    <h2 class="title-h2">409A Compliance &amp; Intellectual-Property Evidence Pack</h2>
    <div class="title-divider"></div>
    <div class="title-meta">
      <div><span>Prepared</span><strong>{today}</strong></div>
      <div><span>Platform</span><strong>EchoAurion / LUCCCA</strong></div>
      <div><span>Author</span><strong>William J. Morrison · Founder</strong></div>
      <div><span>Distribution</span><strong>Counsel · Appraiser · Investor</strong></div>
    </div>
    <div class="title-footer">
      <em>Doctrine: even on a hit, the walkback continues — which trial was
      tightest, and what did it know?</em>
    </div>
  </div>
</section>

<!-- ── Quick Links (front-of-doc) ──────────────────────────────── -->
<section class="quick-links-wrap" id="quick-links">
  <h1 class="qllabel">Quick Links</h1>
  <p class="qlcap">Tap any chapter to jump there directly. These same
  links are also restated in the <a href="#index-back">Index</a> at the
  back of the document.</p>
  {quick_links}
</section>

<!-- ── Table of Contents ───────────────────────────────────────── -->
<section class="toc-wrap" id="toc">
  <h1>Table of Contents</h1>
  {toc}
</section>

<!-- ── Chapters ────────────────────────────────────────────────── -->
{chapters_joined}

<!-- ── Back-of-doc Index ────────────────────────────────────────── -->
<section class="quick-links-wrap" id="index-back">
  <h1 class="qllabel">Index · Quick Links</h1>
  <p class="qlcap">All chapters, alphabetical-by-print-order. Identical to
  the front-of-doc Quick Links — restated here so the printed copy
  doesn't have to be flipped to find them.</p>
  {quick_links}
  <div class="end-mark">— end of document —</div>
</section>

</body>
</html>
"""


# ----------------------------------------------------------------------------
# CSS — EchoAurion brand: deep navy / gold (#c8a97e) / sand cream
# ----------------------------------------------------------------------------
PRINT_CSS = """
@page {
  size: Letter;
  margin: 0.75in 0.7in 0.95in 0.7in;
  @bottom-center {
    content: "EchoAurion · 409A Evidence Pack  ·  page " counter(page) " of " counter(pages);
    font-family: 'Georgia', serif;
    font-size: 9pt;
    color: #6b5b3e;
    letter-spacing: 0.04em;
  }
  @top-right {
    content: "Confidential · do not distribute";
    font-family: 'Georgia', serif;
    font-size: 8pt;
    color: #a08b65;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}

@page :first {
  margin: 0;
  @bottom-center { content: ""; }
  @top-right { content: ""; }
}

@page front-matter {
  @bottom-center {
    content: counter(page, lower-roman);
    font-family: 'Georgia', serif;
    font-size: 9pt;
    color: #6b5b3e;
  }
}

@page chapter-page {
  @bottom-center {
    content: "EchoAurion · 409A Evidence Pack  ·  page " counter(page) " of " counter(pages);
    font-family: 'Georgia', serif;
    font-size: 9pt;
    color: #6b5b3e;
  }
}

* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  font-family: 'Helvetica', 'Arial', sans-serif;
  color: #1a1f2e;
  font-size: 10.5pt;
  line-height: 1.6;
}

a { color: #6b4f1d; text-decoration: none; border-bottom: 1px dotted #c8a97e; }
a:hover { color: #1a1f2e; }

/* ── Title page ───────────────────────────────────────────────── */
.title-page {
  page: first;
  width: 100%; height: 100vh;
  page-break-after: always;
  background: #0a0e17;
  color: #e8e1d1;
  display: flex; align-items: center; justify-content: center;
  padding: 1.5in 0.9in;
  position: relative;
}
.title-frame {
  width: 100%; max-width: 5.6in;
  padding: 0.7in 0.6in 0.9in 0.6in;
  border: 1px solid #c8a97e;
  background:
    linear-gradient(180deg, rgba(200,169,126,0.02), rgba(0,0,0,0)),
    radial-gradient(ellipse at top, rgba(200,169,126,0.08), transparent 70%);
  text-align: center;
  position: relative;
}
.title-logo img { height: 1.2in; opacity: 0.95; }
.title-classification {
  margin-top: 0.18in;
  font-size: 9pt; letter-spacing: 0.36em;
  color: #c8a97e;
  font-weight: 700;
  text-transform: uppercase;
}
.title-h1 {
  margin: 0.36in 0 0 0;
  font-family: 'Georgia', serif;
  font-size: 36pt;
  font-weight: 400;
  letter-spacing: 0.04em;
  color: #f4ead4;
}
.title-h2 {
  margin: 0.1in 0 0 0;
  font-size: 13pt;
  font-weight: 400;
  color: #c8a97e;
  letter-spacing: 0.08em;
  line-height: 1.4;
}
.title-divider {
  width: 1.2in; height: 1px;
  background: #c8a97e;
  margin: 0.32in auto 0.28in;
}
.title-meta { font-size: 9.5pt; color: #d6c9aa; }
.title-meta > div {
  display: flex; justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(200,169,126,0.25);
}
.title-meta span { color: #a08b65; letter-spacing: 0.14em; text-transform: uppercase; font-size: 8pt; }
.title-meta strong { color: #f4ead4; font-weight: 600; }
.title-footer {
  margin-top: 0.4in;
  font-style: italic;
  font-size: 8.5pt;
  color: #a08b65;
  line-height: 1.55;
}

/* ── Quick Links / Index ───────────────────────────────────────── */
.quick-links-wrap {
  page: front-matter;
  page-break-after: always;
  padding-top: 0.3in;
}
.qllabel {
  font-family: 'Georgia', serif;
  font-size: 22pt; font-weight: 400;
  color: #1a1f2e;
  letter-spacing: 0.02em;
  margin: 0 0 0.05in 0;
  padding-bottom: 0.1in;
  border-bottom: 2px solid #c8a97e;
}
.qlcap { color: #4b4a3e; font-size: 10pt; margin: 0.05in 0 0.25in 0; line-height: 1.55; }
.quick-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 18px;
}
.ql-cell {
  display: block;
  padding: 10px 14px;
  background: #f9f4e8;
  border: 1px solid #e8dbc1;
  border-left: 3px solid #c8a97e;
  border-radius: 3px;
  color: #1a1f2e;
  font-size: 10pt;
  font-weight: 500;
}
.ql-cell:hover { background: #f0e6c8; }
.end-mark {
  text-align: center; margin-top: 0.4in;
  font-style: italic;
  color: #8a7a55;
  font-size: 9pt; letter-spacing: 0.2em; text-transform: uppercase;
}

/* ── Table of Contents ─────────────────────────────────────────── */
.toc-wrap {
  page: front-matter;
  page-break-after: always;
  padding-top: 0.3in;
}
.toc-wrap h1 {
  font-family: 'Georgia', serif;
  font-size: 22pt; font-weight: 400;
  color: #1a1f2e;
  margin: 0 0 0.05in 0;
  padding-bottom: 0.1in;
  border-bottom: 2px solid #c8a97e;
}
.toc { margin-top: 0.18in; display: flex; flex-direction: column; gap: 1.5pt; }
.toc-row {
  display: flex; align-items: baseline;
  text-decoration: none;
  border-bottom: none;
  color: #1a1f2e;
  padding: 3px 0;
}
.toc-row .toc-dots {
  flex: 1;
  border-bottom: 1px dotted #c8a97e;
  margin: 0 6px 4px 6px;
}
.toc-row .toc-page {
  color: #6b5b3e;
  font-variant-numeric: tabular-nums;
  font-size: 9pt;
}
.toc-row .toc-page::before { content: target-counter(attr(data-target url), page); }
.toc-l0 { font-weight: 700; font-size: 11.5pt; color: #1a1f2e; margin-top: 6pt; padding-top: 4pt; border-top: 1px solid #ede1c8; }
.toc-l1 { padding-left: 0.25in; font-weight: 600; color: #2a2a2a; }
.toc-l2 { padding-left: 0.55in; color: #4a4a4a; font-size: 10pt; }
.toc-l3 { padding-left: 0.85in; color: #6a6a6a; font-size: 9.5pt; }

/* ── Chapters ───────────────────────────────────────────────────── */
.chapter {
  page: chapter-page;
  page-break-before: always;
}
.chapter-title {
  font-family: 'Georgia', serif;
  font-size: 22pt; font-weight: 400;
  color: #1a1f2e;
  margin: 0 0 0.18in 0;
  padding-bottom: 0.1in;
  border-bottom: 2px solid #c8a97e;
  letter-spacing: 0.01em;
}
.chapter-body h1, .chapter-body h2, .chapter-body h3 {
  font-family: 'Georgia', serif;
  color: #1a1f2e;
  page-break-after: avoid;
}
.chapter-body h1 { font-size: 16pt; margin-top: 18pt; }
.chapter-body h2 { font-size: 13pt; margin-top: 14pt; color: #2a2a2a; }
.chapter-body h3 { font-size: 11.5pt; margin-top: 10pt; color: #3a3a3a; }
.chapter-body p { margin: 7pt 0; }
.chapter-body ul, .chapter-body ol { margin: 6pt 0 6pt 0.3in; }
.chapter-body li { margin: 3pt 0; }
.chapter-body blockquote {
  margin: 10pt 0;
  padding: 8pt 12pt;
  border-left: 3px solid #c8a97e;
  background: #faf6ec;
  color: #4a4032;
  font-style: italic;
}
.chapter-body code {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 9pt;
  background: #f4eedb;
  padding: 1pt 4pt;
  border-radius: 2pt;
  color: #4a3a18;
}
.chapter-body pre {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 8.5pt;
  background: #2a2a2a;
  color: #e8e1d1;
  padding: 10pt 12pt;
  border-radius: 3pt;
  line-height: 1.45;
  overflow: hidden;
  word-wrap: break-word;
  white-space: pre-wrap;
}
.chapter-body pre code {
  background: transparent;
  color: #e8e1d1;
  padding: 0;
}
.chapter-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 10pt 0;
  font-size: 9.2pt;
}
.chapter-body th, .chapter-body td {
  border: 1px solid #d8c89a;
  padding: 5pt 7pt;
  text-align: left;
  vertical-align: top;
}
.chapter-body th {
  background: #f4eedb;
  font-weight: 700;
  color: #1a1f2e;
}
.chapter-body tr:nth-child(even) td { background: #fbf8ee; }
.chapter-body hr {
  border: none;
  border-top: 1px solid #c8a97e;
  margin: 14pt 0;
}
.chapter-body a { word-break: break-word; }
"""


def main():
    html_str = render_html()
    css = CSS(string=PRINT_CSS)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=html_str, base_url=str(ROOT)).write_pdf(
        str(OUT_PATH),
        stylesheets=[css],
        optimize_images=True,
    )

    # Also copy to dist/spa so the preview server serves it under /
    try:
        DIST_OUT.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(OUT_PATH, DIST_OUT)
    except Exception as e:  # pragma: no cover
        print(f"warn: could not copy to dist: {e}")

    size_kb = OUT_PATH.stat().st_size // 1024
    print(f"✓ Wrote: {OUT_PATH} ({size_kb} KB)")
    print(f"✓ Also: {DIST_OUT}")


if __name__ == "__main__":
    main()
