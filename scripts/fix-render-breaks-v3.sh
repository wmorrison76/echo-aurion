#!/usr/bin/env bash
set -euo pipefail

PR_APP="client/modules/PurchasingReceiving/client/App.tsx"
WB_FILE="client/modules/Whiteboard/WhiteboardSession.tsx"
ts="$(date +%Y%m%d_%H%M%S)"

echo "📦 Backups..."
cp "$PR_APP" "$PR_APP.bak.$ts"
cp "$WB_FILE" "$WB_FILE.bak.$ts"

echo "🛠 Fixing PurchasingReceiving App.tsx: rebuild <Routes> block cleanly..."
python3 - <<'PY'
from pathlib import Path
import re

path = Path("client/modules/PurchasingReceiving/client/App.tsx")
s = path.read_text(encoding="utf-8", errors="ignore")

# Replace the first <Routes>...</Routes> block with a clean minimal block
routes_pat = re.compile(r"<Routes>.*?</Routes>", re.S)
m = routes_pat.search(s)
if not m:
    raise SystemExit("❌ Could not find <Routes>...</Routes> block in PurchasingReceiving App.tsx")

clean_routes = """<Routes>
  <Route path="/" element={<Index />} />
  <Route path="*" element={<NotFound />} />
</Routes>"""

s = s[:m.start()] + clean_routes + s[m.end():]

# Ensure NotFound is imported if referenced but not imported
uses_notfound = "NotFound" in s
has_notfound_import = re.search(r"import\s+NotFound\s+from\s+['\"].+?['\"]\s*;", s) is not None

if uses_notfound and not has_notfound_import:
    # Try to insert a standard import near Index import
    # If Index import exists, add NotFound right after it.
    idx = re.search(r"(import\s+Index\s+from\s+['\"].+?['\"]\s*;\s*)", s)
    if idx:
        insert_at = idx.end()
        s = s[:insert_at] + "\nimport NotFound from \"./pages/NotFound\";\n" + s[insert_at:]
    else:
        # fallback: insert after the last import line
        last_import = None
        for mi in re.finditer(r"^import .+?;\s*$", s, flags=re.M):
            last_import = mi
        if last_import:
            insert_at = last_import.end()
            s = s[:insert_at] + "\nimport NotFound from \"./pages/NotFound\";\n" + s[insert_at:]
        else:
            s = "import NotFound from \"./pages/NotFound\";\n" + s

path.write_text(s, encoding="utf-8")
print("✅ PurchasingReceiving App.tsx patched.")
PY

echo "🛠 Fixing WhiteboardSession.tsx: repair drag/drop useEffect cleanup closure..."
python3 - <<'PY'
from pathlib import Path
import re

path = Path("client/modules/Whiteboard/WhiteboardSession.tsx")
s = path.read_text(encoding="utf-8", errors="ignore")

# 1) Remove stray lines that are exactly "canvas;"
s = re.sub(r'^\s*canvas;\s*$', '', s, flags=re.M)

# 2) Replace the corrupted cleanup tail for the effect that references handleDrop
# Find: return () => { ... removeEventListener("drop", handleDrop) ... } , [userId]);
pat = re.compile(
    r"return\s*\(\)\s*=>\s*\{.*?removeEventListener\(\"drop\",\s*handleDrop\);\s*.*?\}\s*,\s*\[userId\]\s*\)\s*;",
    re.S
)

replacement = """return () => {
      canvas.removeEventListener("dragover", handleDragOver);
      canvas.removeEventListener("dragleave", handleDragLeave);
      canvas.removeEventListener("drop", handleDrop);
    };
  }, [userId]);"""

if pat.search(s):
    s = pat.sub(replacement, s, count=1)
else:
    # fallback: if the comma line exists but pattern didn't match, fix just the tail line
    s = s.replace("}; }, [userId]);", "};\n  }, [userId]);")

path.write_text(s, encoding="utf-8")
print("✅ WhiteboardSession.tsx patched.")
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
