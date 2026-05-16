#!/usr/bin/env bash
set -euo pipefail

PR_APP="client/modules/PurchasingReceiving/client/App.tsx"
WB_FILE="client/modules/Whiteboard/WhiteboardSession.tsx"
ts="$(date +%Y%m%d_%H%M%S)"

echo "📦 Backing up files..."
cp "$PR_APP" "$PR_APP.bak.$ts"
cp "$WB_FILE" "$WB_FILE.bak.$ts"

echo "🛠 Fixing PurchasingReceiving App.tsx (remove corrupted NotFound fragment + ensure NotFound import)..."
python3 - <<'PY'
import re
from pathlib import Path

path = Path("client/modules/PurchasingReceiving/client/App.tsx")
s = path.read_text(encoding="utf-8", errors="ignore")
orig = s

# 1) Remove the known corrupted token chunk that breaks JSX:
#    ... )}otFound />} />
# We'll remove just that garbage and replace with a valid NotFound Route.
# We keep it conservative: only touch lines that contain ")}otFound"
lines = s.splitlines(True)
out = []
replaced = False
for line in lines:
    if ")}otFound" in line:
        # Replace the whole line with a safe NotFound route
        out.append('                                <Route path="*" element={<NotFound />} />\n')
        replaced = True
    else:
        out.append(line)
s = "".join(out)

# 2) If the corruption somehow appears without newline boundaries, do a fallback regex cleanup.
# This targets the exact ")}otFound" token and converts it into a proper Route.
s2 = re.sub(r"\)\}\s*otFound\s*/>\s*\}\s*/>\s*/>\s*", '<Route path="*" element={<NotFound />} />', s)
s = s2

# 3) Ensure NotFound import exists (ONLY if missing)
if re.search(r'from\s+[\'"]\./pages/NotFound[\'"]', s) is None:
    # Prefer inserting after Index import if present
    m = re.search(r'(^import\s+Index\s+from\s+[\'"]\./pages/Index[\'"];\s*$)', s, re.M)
    if m:
        insert_at = m.end(1)
        s = s[:insert_at] + "\nimport NotFound from \"./pages/NotFound\";" + s[insert_at:]
    else:
        # Otherwise insert after last import statement
        imports = list(re.finditer(r"^import .+?;\s*$", s, re.M))
        if imports:
            insert_at = imports[-1].end()
            s = s[:insert_at] + "\nimport NotFound from \"./pages/NotFound\";\n" + s[insert_at:]
        else:
            s = "import NotFound from \"./pages/NotFound\";\n" + s

# 4) Quick sanity: avoid writing if nothing changed
if s == orig:
    print("ℹ️  No changes detected in App.tsx (corruption token not found).")
else:
    path.write_text(s, encoding="utf-8")
    print("✅ App.tsx updated.")

PY

echo "🛠 Fixing WhiteboardSession.tsx (canvas.; -> canvas;)..."
python3 - <<'PY'
from pathlib import Path
import re

path = Path("client/modules/Whiteboard/WhiteboardSession.tsx")
s = path.read_text(encoding="utf-8", errors="ignore")
orig = s
s = re.sub(r"\bcanvas\.\s*;\s*", "canvas;\n", s)
if s != orig:
    path.write_text(s, encoding="utf-8")
    print("✅ WhiteboardSession.tsx updated.")
else:
    print("ℹ️  No 'canvas.;' found (no changes).")
PY

echo "🧼 Clearing Vite optimize cache..."
rm -rf node_modules/.vite || true
rm -rf client/node_modules/.vite 2>/dev/null || true

echo "🛑 If port 8080 is taken, freeing it..."
kill -9 $(lsof -ti :8080) 2>/dev/null || true

echo "🚀 Restarting dev server with force..."
if command -v pnpm >/dev/null 2>&1; then
  pnpm dev -- --force
else
  npm run dev -- --force
fi
