import json
import re
import sys
from pathlib import Path

from PyPDF2 import PdfReader


# ========== PDF READER ==========

def read_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    texts = []
    for page in reader.pages:
        try:
            texts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(texts)


# ========== TEXT CLEANING ==========

def clean_text(text: str) -> str:
    """
    Normalize typical PDF mess:
    - Remove CR
    - Fix hyphenated line breaks
    - Collapse multiple blank lines
    - Merge lines that should be single sentences
    - Strip weird non-ASCII artifacts
    """
    text = text.replace("\r", "")
    # remove hyphen at end of line that splits a word
    text = re.sub(r"-\n", "", text)
    # collapse 3+ blank lines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # merge lines that start with lowercase into previous line
    text = re.sub(r"\n(?=[a-z])", " ", text)
    # strip non-ASCII junk
    text = re.sub(r"[^\x09-\x0d\x20-\x7e]", "", text)
    return text.strip()


# ========== GLOSSARY / TERM EXTRACTION ==========

def extract_glossary_entries(text: str):
    """
    Extracts 'Term – Definition' pairs using several patterns:
    - TERM  Definition
    - TERM — Definition
    - TERM: Definition
    - TERM\ndefinition...
    """
    lines = text.split("\n")
    entries = []

    # patterns like: Term  Definition
    inline_patterns = [
        re.compile(r"^([A-Z][A-Za-z0-9''()\-\/\s]+?)\s{2,}(.+)$"),
        re.compile(r"^([A-Z][A-Za-z0-9''()\-\/\s]+?)\s*[:—-]\s+(.+)$"),
    ]

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        matched_inline = False
        for pattern in inline_patterns:
            m = pattern.match(line)
            if m:
                term = m.group(1).strip()
                definition = m.group(2).strip()
                entries.append((term, definition))
                matched_inline = True
                break
        if matched_inline:
            continue

        # Term on one line, definition on next
        # e.g. "Hollandaise" then "A warm emulsion of egg yolks and butter..."
        if re.match(r"^[A-Z][A-Za-z0-9''()\-\/\s]+$", line):
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if next_line and re.match(r"^[a-z0-9]", next_line):
                    term = line
                    definition = next_line
                    entries.append((term, definition))

    # Deduplicate by term + definition combo
    seen = set()
    unique_entries = []
    for term, definition in entries:
        key = (term, definition)
        if key not in seen:
            seen.add(key)
            unique_entries.append((term, definition))

    return unique_entries


# ========== GLOSSARY CLASSIFICATION FOR ECHO ==========

INGREDIENT_KEYWORDS = [
    "herb", "spice", "salt", "pepper", "flour", "fat", "oil", "vinegar", "cheese",
    "meat", "fish", "shellfish", "bean", "grain", "rice", "fruit", "vegetable",
    "nut", "seed", "sugar", "honey", "chile", "pepper", "mushroom", "wine"
]

TECHNIQUE_KEYWORDS = [
    "method", "technique", "process", "to cook", "to bake", "to roast", "cooked by",
    "to simmer", "to braise", "to poach", "to sauté", "to fry", "used to thicken",
    "emulsion", "whipped", "folded", "fermented", "ferment", "knead", "proof"
]

EQUIPMENT_KEYWORDS = [
    "pan", "skillet", "pot", "mold", "mould", "mixer", "knife", "grill",
    "baking sheet", "baking stone", "tongs", "spatula", "whisk",
    "oven", "tandoor", "griddle"
]

WINE_KEYWORDS = [
    "wine", "grape", "varietal", "vineyard", "appellation", "fortified",
    "liqueur", "spirit", "beer", "ale", "lager", "cider"
]

PASTRY_KEYWORDS = [
    "dough", "pastry", "cream", "custard", "icing", "frosting", "batter",
    "sponge", "meringue", "ganache", "laminated", "crust", "crumb"
]

DISH_KEYWORDS = [
    "dish", "soup", "stew", "salad", "sauce", "rice dish", "curry",
    "served with", "often served", "traditional", "classic", "dessert"
]


def classify_glossary_entry(term: str, definition: str):
    """
    Very simple heuristic classification for now.
    You can later replace/augment this with an EchoAI³ or LLM call.
    """
    text = (term + " " + definition).lower()
    categories = []

    def contains_any(keywords):
        return any(k in text for k in keywords)

    if contains_any(INGREDIENT_KEYWORDS):
        categories.append("ingredient")
    if contains_any(TECHNIQUE_KEYWORDS):
        categories.append("technique")
    if contains_any(EQUIPMENT_KEYWORDS):
        categories.append("equipment")
    if contains_any(WINE_KEYWORDS):
        categories.append("wine/beverage")
    if contains_any(PASTRY_KEYWORDS):
        categories.append("pastry/baking")
    if contains_any(DISH_KEYWORDS):
        categories.append("dish")

    if not categories:
        categories.append("general")

    return categories


def build_term_object(term: str, definition: str):
    categories = classify_glossary_entry(term, definition)
    obj = {
        "term": term,
        "slug": slugify(term),
        "letter": first_letter(term),
        "definition": definition,
        "categories": categories,
        "aliases": [],
        "source_work": "",
        "source_page": None
    }
    return obj


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s or "term"


def first_letter(s: str) -> str:
    for ch in s:
        if ch.isalpha():
            return ch.upper()
    return "#"


# ========== RECIPE EXTRACTION ==========

def extract_recipes(text: str):
    """
    Very heuristic recipe extractor:
    - Title lines: ALL CAPS / Title Case with >= 2 words
    - Ingredient lines: start with a quantity
    - Step lines: numbered "1. ..." or "1) ..."
    """
    lines = text.split("\n")
    recipes = []
    current = None

    ingredient_pattern = re.compile(
        r"^(\d+([\/\.\s]\d+)?\s*[A-Za-z]{0,8})\s+(.+)$"  # "1 cup sugar", "2 1/2 tsp salt", etc.
    )
    step_pattern = re.compile(r"^\s*\d+[\.\)]\s+.+")     # "1. Do this", "2) Do that"

    for line in lines:
        raw = line.rstrip()
        stripped = raw.strip()
        if not stripped:
            continue

        # Detect potential recipe title
        # e.g. "LEMON TART" or "Chocolate Sponge Cake"
        if looks_like_title(stripped):
            # Close previous recipe
            if current and (current["ingredients"] or current["steps"]):
                recipes.append(current)
            current = {
                "title": stripped,
                "slug": slugify(stripped),
                "ingredients": [],
                "steps": []
            }
            continue

        if current:
            # Ingredient line
            if ingredient_pattern.match(stripped):
                current["ingredients"].append(stripped)
                continue

            # Step line
            if step_pattern.match(stripped):
                current["steps"].append(stripped)
                continue

    if current and (current["ingredients"] or current["steps"]):
        recipes.append(current)

    return recipes


def looks_like_title(line: str) -> bool:
    # Heuristic: length, not ending with '.', not obviously a paragraph
    if len(line) < 5 or len(line) > 80:
        return False
    # Many recipe titles are Title Case or ALL CAPS and don't end in a period
    if line.endswith("."):
        return False

    # Count uppercase vs lowercase
    letters = [c for c in line if c.isalpha()]
    if not letters:
        return False
    upper = sum(1 for c in letters if c.isupper())
    lower = sum(1 for c in letters if c.islower())

    # All caps or mostly caps
    if upper > 0 and lower == 0:
        return True
    # Title case: each word capitalized
    words = line.split()
    capitalized_words = sum(1 for w in words if w[:1].isupper())
    if capitalized_words >= max(2, len(words) - 1):
        return True

    return False


# ========== MAIN PIPELINE ==========

def scan_culinary_pdf(pdf_path: Path, out_path: Path):
    raw = read_pdf_text(pdf_path)
    if not raw.strip():
        raise RuntimeError("No text extracted from PDF (this one might be image-only; OCR would be needed).")

    cleaned = clean_text(raw)

    # Extract glossary / term definitions
    glossary_pairs = extract_glossary_entries(cleaned)
    glossary_terms = [build_term_object(term, definition) for term, definition in glossary_pairs]

    # Extract recipes
    recipes = extract_recipes(cleaned)

    knowledge = {
        "source_file": str(pdf_path.name),
        "terms": glossary_terms,
        "recipes": recipes,
        "stats": {
            "terms_count": len(glossary_terms),
            "recipes_count": len(recipes)
        }
    }

    out_path.write_text(json.dumps(knowledge, indent=2, ensure_ascii=False))
    return knowledge


# ========== CLI ENTRYPOINT ==========

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 echo_culinary_scanner.py <input.pdf> [output.json]")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        sys.exit(1)

    if len(sys.argv) >= 3:
        out_path = Path(sys.argv[2])
    else:
        out_path = pdf_path.with_name("echo_culinary_knowledge.json")

    knowledge = scan_culinary_pdf(pdf_path, out_path)

    print(f"\nDone. Extracted:")
    print(f"  Terms:   {knowledge['stats']['terms_count']}")
    print(f"  Recipes: {knowledge['stats']['recipes_count']}")
    print(f"Saved to: {out_path}")


if __name__ == "__main__":
    main()
