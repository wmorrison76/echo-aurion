#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
PR_APP="client/modules/PurchasingReceiving/client/App.tsx"
WB_FILE="client/modules/Whiteboard/WhiteboardSession.tsx"

ts="$(date +%Y%m%d_%H%M%S)"
echo "📦 Backing up files..."
cp "$PR_APP" "$PR_APP.bak.$ts"
cp "$WB_FILE" "$WB_FILE.bak.$ts"

echo "🛠 Fixing PurchasingReceiving App.tsx corruption..."
# 1) Replace the corrupted ')}otFound' junk with a valid NotFound route line.
# This targets the exact broken token sequence that esbuild is complaining about.
perl -0777 -i -pe '
  s/\)\}\s*otFound\s*\/>\s*\}\s*\/>\s*\/>\s*/<Route path="*" element={<NotFound />} \/>/g;
' "$PR_APP"

# 2) If a broken fragment still exists like ")}otFound" (slightly different spacing), remove the junk safely.
perl -0777 -i -pe '
  s/\)\}\s*otFound\s*.*?\n/\n/g;
' "$PR_APP"

# 3) Ensure NotFound import exists (only add if missing)
perl -0777 -i -pe '
  if ($_ !~ /from\s+["\x27]\.\/pages\/NotFound["\x27]/) {
    # Insert after the last existing import from "./pages/..."
    if ($_ =~ /(import\s+[^\n]+from\s+["\x27]\.\/pages\/[^\n]+;\n)(?!.*import\s+[^\n]+from\s+["\x27]\.\/pages\/)/s) {
      $_ =~ s/(import\s+[^\n]+from\s+["\x27]\.\/pages\/[^\n]+;\n)(?!.*import\s+[^\n]+from\s+["\x27]\.\/pages\/)/$1import NotFound from "\.\/pages\/NotFound";\n/s;
    } else {
      # Fallback: add it near the other imports
      $_ =~ s/(import\s+[^\n]+;\n)/$1import NotFound from "\.\/pages\/NotFound";\n/s;
    }
  }
' "$PR_APP"

echo "🛠 Fixing WhiteboardSession.tsx 'canvas.;' typo..."
perl -0777 -i -pe 's/\bcanvas\.\s*;\s*/canvas;\n/g' "$WB_FILE"

echo "🧼 Clearing Vite optimize cache..."
rm -rf node_modules/.vite || true
rm -rf client/node_modules/.vite 2>/dev/null || true

echo "✅ Done. Now restart dev..."
if command -v pnpm >/dev/null 2>&1; then
  echo "🚀 Running: pnpm dev -- --force"
  pnpm dev -- --force
else
  echo "🚀 Running: npm run dev -- --force"
  npm run dev -- --force
fi
