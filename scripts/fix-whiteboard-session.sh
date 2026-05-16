#!/usr/bin/env bash
set -euo pipefail

FILE="client/modules/Whiteboard/WhiteboardSession.tsx"
ts="$(date +%Y%m%d_%H%M%S)"

echo "📦 Backup: $FILE -> $FILE.bak.$ts"
cp "$FILE" "$FILE.bak.$ts"

echo "🛠 Fixing broken cleanup line + removing stray 'canvas;' lines..."
python3 - <<'PY'
from pathlib import Path
import re

path = Path("client/modules/Whiteboard/WhiteboardSession.tsx")
s = path.read_text(encoding="utf-8", errors="ignore")

# 1) Remove stray lines that are exactly "canvas;" (often produced by bad regex edits)
s = re.sub(r'^\s*canvas;\s*$', '', s, flags=re.M)

# 2) Fix the exact corrupt tail you have:
#    canvas.removeEventListener("drop", handleDrop); }; }, [userId]);
# -> canvas.removeEventListener("drop", handleDrop);
#    };
# }, [userId]);
s = re.sub(
    r'canvas\.removeEventListener\("drop",\s*handleDrop\);\s*\};\s*\},\s*\[userId\]\s*\)\s*;',
    'canvas.removeEventListener("drop", handleDrop);\n      };\n  }, [userId]);',
    s
)

# 3) Also fix a common nearby corruption pattern:
#    ... removeEventListener(...); }; }, [userId]);
s = re.sub(
    r'(removeEventListener\([^;]+;\s*)\};\s*\},\s*\[userId\]\s*\)\s*;',
    r'\1};\n  }, [userId]);',
    s
)

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
