import { useEffect, useMemo } from "react";
import { fuzzyMatch } from "@/lib/fuzzy";
import { suggestionScopes, type FuzzySuggestionScope, useSuggestionBuckets } from "@/hooks/use-fuzzy-suggestions";

const GLOBAL_DATALIST_ID = "fusion-fuzzy-suggestions";
const TEXT_INPUT_TYPES = new Set(["", "text", "search", "tel", "email", "url"]);
const DEFAULT_THRESHOLD = 0.38;
const DEFAULT_LIMIT = 8;
const DEFAULT_MIN_QUERY = 2;

const scopeSet = new Set<FuzzySuggestionScope>(suggestionScopes);

function parseScopes(attribute: string | null): FuzzySuggestionScope[] {
  if (!attribute) return ["general"];
  const scopes = attribute
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as string[];
  const resolved = scopes.filter((value): value is FuzzySuggestionScope => scopeSet.has(value as FuzzySuggestionScope));
  return resolved.length ? resolved : ["general"];
}

function parseNumberAttribute(attribute: string | null, fallback: number): number {
  if (!attribute) return fallback;
  const parsed = Number(attribute);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isEligibleInput(element: Element | null): element is HTMLInputElement {
  if (!(element instanceof HTMLInputElement)) return false;
  if (element.readOnly || element.disabled) return false;
  const type = (element.type || "text").toLowerCase();
  if (!TEXT_INPUT_TYPES.has(type)) return false;
  if (element.dataset.fuzzy === "off") return false;
  return true;
}

export function FuzzySuggestionManager() {
  const buckets = useSuggestionBuckets();

  const dictionaries = useMemo(() => {
    const map = new Map<FuzzySuggestionScope, string[]>();
    for (const scope of suggestionScopes) {
      map.set(scope, buckets[scope]);
    }
    return map;
  }, [buckets]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let datalist = document.getElementById(GLOBAL_DATALIST_ID) as HTMLDataListElement | null;
    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = GLOBAL_DATALIST_ID;
      datalist.style.display = "none";
      document.body.appendChild(datalist);
    }

    const dictionaryCache = new Map<string, string[]>();
    let activeInput: HTMLInputElement | null = null;

    const ensureCleared = (target?: HTMLInputElement | null) => {
      if (datalist) {
        datalist.innerHTML = "";
      }
      if (target && target.dataset.fuzzyAttached === "true") {
        if (target.getAttribute("list") === GLOBAL_DATALIST_ID) {
          target.removeAttribute("list");
        }
        target.removeAttribute("aria-autocomplete");
        target.removeAttribute("aria-expanded");
        delete target.dataset.fuzzyAttached;
        delete target.dataset.fuzzyCount;
      }
    };

    const getDictionary = (scopes: FuzzySuggestionScope[]) => {
      const cacheKey = scopes.slice().sort().join("|");
      if (dictionaryCache.has(cacheKey)) {
        return dictionaryCache.get(cacheKey)!;
      }
      const combined = new Set<string>();
      for (const scope of scopes) {
        const values = dictionaries.get(scope) ?? [];
        for (const entry of values) {
          combined.add(entry);
        }
      }
      if (combined.size === 0) {
        const general = dictionaries.get("general") ?? [];
        for (const entry of general) {
          combined.add(entry);
        }
      }
      const list = Array.from(combined);
      dictionaryCache.set(cacheKey, list);
      return list;
    };

    const updateSuggestions = (input: HTMLInputElement) => {
      const raw = input.value ?? "";
      const term = raw.trim();
      const minLength = parseNumberAttribute(input.getAttribute("data-fuzzy-min"), DEFAULT_MIN_QUERY);
      if (term.length < minLength) {
        ensureCleared(input);
        return;
      }
      const scopes = parseScopes(input.getAttribute("data-fuzzy-scope"));
      const dictionary = getDictionary(scopes);
      if (dictionary.length === 0) {
        ensureCleared(input);
        return;
      }
      const threshold = parseNumberAttribute(input.getAttribute("data-fuzzy-threshold"), DEFAULT_THRESHOLD);
      const limit = parseNumberAttribute(input.getAttribute("data-fuzzy-limit"), DEFAULT_LIMIT);
      const results = fuzzyMatch(term, dictionary, { limit, threshold });
      const normalized = term.toLowerCase();
      const suggestions: string[] = [];
      const seen = new Set<string>();
      for (const entry of results) {
        const value = entry.value;
        const key = value.toLowerCase();
        if (key === normalized) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        suggestions.push(value);
      }
      if (!datalist) return;
      datalist.innerHTML = "";
      if (suggestions.length === 0) {
        ensureCleared(input);
        return;
      }
      for (const suggestion of suggestions) {
        const option = document.createElement("option");
        option.value = suggestion;
        datalist.appendChild(option);
      }
      input.setAttribute("list", GLOBAL_DATALIST_ID);
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-expanded", "true");
      input.dataset.fuzzyAttached = "true";
      input.dataset.fuzzyCount = String(suggestions.length);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!isEligibleInput(target as Element)) return;
      activeInput = target as HTMLInputElement;
      updateSuggestions(activeInput);
    };

    const handleInput = (event: Event) => {
      const target = event.target;
      if (!isEligibleInput(target as Element)) return;
      activeInput = target as HTMLInputElement;
      updateSuggestions(activeInput);
    };

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target;
      if (target === activeInput) {
        ensureCleared(activeInput);
        activeInput = null;
      }
    };

    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("focusout", handleFocusOut, true);

    return () => {
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("focusout", handleFocusOut, true);
    };
  }, [dictionaries]);

  return null;
}
