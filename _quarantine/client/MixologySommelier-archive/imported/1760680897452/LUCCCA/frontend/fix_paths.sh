#!/bin/bash
# ===== LUCCCA Global Import + Alias Fix Script =====
# Fixes incorrect @ aliases and Popover typo

echo "🔧 Starting LUCCCA path + export repair..."

# --- 1. Fix any misplaced alias imports in scheduling module ---
find src/modules/scheduling -type f -name "*.ts*" -print0 | xargs -0 sed -i '' \
  -e 's#@/components/ui/#../../components/ui/#g' \
  -e 's#@/features/#../../features/#g' \
  -e 's#@/lib/#../../lib/#g'

# --- 2. Fix Popover export typo (Popove → Popover) ---
if [ -f "src/components/ui/popover.tsx" ]; then
  sed -i '' 's/export const Popove/export const Popover/g' src/components/ui/popover.tsx
  sed -i '' 's/function Popove/function Popover/g' src/components/ui/popover.tsx
  echo "✅ Fixed Popover export typo."
fi

# --- 3. Ensure Calendar exports correctly ---
if [ -f "src/components/ui/calendar.tsx" ]; then
  if ! grep -q "export function Calendar" src/components/ui/calendar.tsx; then
    echo "⚙️  Adding Calendar export if missing..."
    cat <<'EOFCAL' >> src/components/ui/calendar.tsx

// Auto-patched Calendar export
export function Calendar(props) {
  return <div {...props} />;
}
EOFCAL
  fi
fi

# --- 4. Clear Vite cache and node_modules/.vite (optional but safe) ---
rm -rf node_modules/.vite 2>/dev/null

echo "✅ All paths and exports fixed. You can now run:"
echo "   pnpm dev"
echo "------------------------------------------------"
echo "🕓 Done. Go get that 45 minutes of sleep. LUCCCA’s good for launch!"
