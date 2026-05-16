#!/usr/bin/env bash
set -euo pipefail

PR_APP="client/modules/PurchasingReceiving/client/App.tsx"
WB_FILE="client/modules/Whiteboard/WhiteboardSession.tsx"
ts="$(date +%Y%m%d_%H%M%S)"

echo "📦 Backups..."
cp "$PR_APP" "$PR_APP.bak.$ts"
cp "$WB_FILE" "$WB_FILE.bak.$ts"

echo "🛠 PurchasingReceiving: replace <RouterWrapper>...</RouterWrapper> with clean block..."
python3 - <<'PY'
from pathlib import Path
import re

path = Path("client/modules/PurchasingReceiving/client/App.tsx")
s = path.read_text(encoding="utf-8", errors="ignore")

router_pat = re.compile(r"<RouterWrapper\b[^>]*>.*?</RouterWrapper>", re.S)
m = router_pat.search(s)
if not m:
    raise SystemExit("❌ Could not find <RouterWrapper>...</RouterWrapper> block in PurchasingReceiving App.tsx")

clean = """<RouterWrapper>
  <Suspense fallback={<LoadingFallback />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
</RouterWrapper>"""

s = s[:m.start()] + clean + s[m.end():]

# Ensure NotFound import exists
uses_notfound = "NotFound" in s
has_notfound_import = re.search(r"import\s+NotFound\s+from\s+['\"].+?['\"]\s*;", s) is not None
if uses_notfound and not has_notfound_import:
    idx = re.search(r"(import\s+Index\s+from\s+['\"].+?['\"]\s*;\s*)", s)
    if idx:
        insert_at = idx.end()
        s = s[:insert_at] + "\nimport NotFound from \"./pages/NotFound\";\n" + s[insert_at:]
    else:
        # insert after last import
        last_import = None
        for mi in re.finditer(r"^import .+?;\s*$", s, flags=re.M):
            last_import = mi
        if last_import:
            insert_at = last_import.end()
            s = s[:insert_at] + "\nimport NotFound from \"./pages/NotFound\";\n" + s[insert_at:]
        else:
            s = "import NotFound from \"./pages/NotFound\";\n" + s

path.write_text(s, encoding="utf-8")
print("✅ PurchasingReceiving RouterWrapper block rebuilt.")
PY

echo "🛠 WhiteboardSession: fix any '}; }, [deps])' corruption..."
python3 - <<'PY'
from pathlib import Path
import re

path = Path("client/modules/Whiteboard/WhiteboardSession.tsx")
s = path.read_text(encoding="utf-8", errors="ignore")

# Normalize the common corrupted pattern: "}; }, [deps]);" -> "};\n  }, [deps]);"
s2 = re.sub(r"\};\s*\},\s*(\[[^\]]*\]\s*\)\s*;)", r"};\n  }, \1", s)

# Also handle a slightly different spacing variant
s2 = re.sub(r"\};\s*\},\s*\[", r"};\n  }, [", s2)

path.write_text(s2, encoding="utf-8")
print("✅ WhiteboardSession.tsx cleanup endings normalized.")
PY

echo "🧼 Clearing Vite optimize cache..."
rm -rf node_modules/.vite || true
rm -rf client/node_modules/.vite 2>/dev/null || true

echo "🛑 Freeing 8080 (if needed)..."
kill -9 $(lsof -ti :8080) 2>/dev/null || true

echo "🚀 Restarting dev server..."
if command -v pnpm >/dev/null 2>&1; then
  pnpm dev -- --force
else
  npm run dev -- --force
fi
