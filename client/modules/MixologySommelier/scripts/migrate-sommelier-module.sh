#!/bin/bash

################################################################################
# SommelierAI Module Migration Script
# Copies all remaining files from client/ to client/modules/SommelierAI/
# and updates import paths from @/ to relative imports
################################################################################

set -e

MODULE_PATH="client/modules/SommelierAI"
SOURCE_PATH="client"

echo "🚀 Starting SommelierAI Module File Migration..."
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track progress
TOTAL_FILES=0
COPIED_FILES=0
UPDATED_FILES=0

################################################################################
# FUNCTION: Copy file and update imports
################################################################################
copy_and_update() {
  local source="$1"
  local dest="$2"
  local relative_depth="$3"  # "lib", "page", "component" etc.
  
  if [ ! -f "$source" ]; then
    return 1
  fi
  
  ((TOTAL_FILES++))
  
  # Copy file
  cp "$source" "$dest"
  ((COPIED_FILES++))
  
  # Determine relative import path based on file location
  case "$relative_depth" in
    "page")
      # Pages are in pages/ so they go up 2 levels: ../../lib, ../../components
      sed -i 's|from "@/lib/|from "../lib/|g' "$dest"
      sed -i 's|from "@/components/|from "../../components/|g' "$dest"
      ;;
    "component")
      # Components go up 2 levels: ../../lib, ../../components
      sed -i 's|from "@/lib/|from "../../lib/|g' "$dest"
      sed -i 's|from "@/components/|from "../../components/|g' "$dest"
      ;;
    "lib")
      # Lib files go up 1 level: ../
      sed -i 's|from "@/lib/|from "./|g' "$dest"
      sed -i 's|from "@/components/|from "../components/|g' "$dest"
      ;;
  esac
  
  # Fix any remaining relative imports that were already using ../
  sed -i 's|from "\.\./lib/|from "../lib/|g' "$dest" 2>/dev/null || true
  sed -i 's|from "\.\./components/|from "../../components/|g' "$dest" 2>/dev/null || true
  
  ((UPDATED_FILES++))
  echo -e "${GREEN}✓${NC} $(basename "$dest")"
}

################################################################################
# Step 1: Copy remaining lib files (if not already present)
################################################################################
echo -e "${BLUE}📁 Lib Files${NC}"
for libfile in api pos-api wines theme file-scanner; do
  if [ -f "$SOURCE_PATH/lib/$libfile.ts" ]; then
    copy_and_update "$SOURCE_PATH/lib/$libfile.ts" "$MODULE_PATH/lib/$libfile.ts" "lib" 2>/dev/null || true
  fi
done
echo ""

################################################################################
# Step 2: Copy component files
################################################################################
echo -e "${BLUE}📁 Component Files${NC}"
for component in Navigation.tsx ThemeProvider.tsx WineCard.tsx AlertsNotificationPanel.tsx WinePairingPanel.tsx; do
  if [ -f "$SOURCE_PATH/components/$component" ]; then
    copy_and_update "$SOURCE_PATH/components/$component" "$MODULE_PATH/components/$component" "component" 2>/dev/null || true
  fi
done

# Copy UI components folder
if [ -d "$SOURCE_PATH/components/ui" ]; then
  cp -r "$SOURCE_PATH/components/ui"/* "$MODULE_PATH/components/ui/" 2>/dev/null || true
  find "$MODULE_PATH/components/ui" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|from "@/|from "../../../|g' {} + 2>/dev/null || true
  echo -e "${GREEN}✓${NC} UI components"
fi

# Copy echo folder
if [ -d "$SOURCE_PATH/components/echo" ]; then
  cp -r "$SOURCE_PATH/components/echo"/* "$MODULE_PATH/components/echo/" 2>/dev/null || true
  find "$MODULE_PATH/components/echo" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's|from "@/|from "../../../|g' {} + 2>/dev/null || true
  echo -e "${GREEN}✓${NC} Echo components"
fi

echo ""

################################################################################
# Step 3: Copy all 22 page files
################################################################################
echo -e "${BLUE}📄 Page Files (22 total)${NC}"
PAGES=(
  "Home" "Catalog" "Recommendations" "TastingNotes"
  "Inventory" "LiquorInventory" "TransferWorkflow" "CompedDrinks"
  "VarianceAudit" "PurchaseOrders" "CostingReport" "Analytics"
  "AdvancedAnalytics" "CellarMonitoring" "POSDashboard" "POSSettings"
  "WineArchive" "SommelierTraining" "MenuSommelierBridge" "Settings"
  "Onboarding" "NotFound"
)

PAGE_COUNT=0
for page in "${PAGES[@]}"; do
  if [ -f "$SOURCE_PATH/pages/${page}.tsx" ]; then
    copy_and_update "$SOURCE_PATH/pages/${page}.tsx" "$MODULE_PATH/pages/${page}.tsx" "page" 2>/dev/null || true
    ((PAGE_COUNT++))
  fi
done

echo -e "${GREEN}✓${NC} Copied $PAGE_COUNT pages"
echo ""

################################################################################
# Step 4: Fix import paths in specific files
################################################################################
echo -e "${BLUE}🔧 Fixing import paths...${NC}"

# Fix pages that use relative imports that already have ../lib/api
find "$MODULE_PATH/pages" -name "*.tsx" -exec sed -i 's|from "\.\./lib/|from "../lib/|g' {} + 2>/dev/null || true

# Fix components that import from React Router
find "$MODULE_PATH/components" -name "*.tsx" -exec sed -i 's|from "react-router-dom"|from "react-router-dom"|g' {} + 2>/dev/null || true

# Fix App.tsx imports
sed -i 's|from "@/|from "./|g' "$MODULE_PATH/App.tsx" 2>/dev/null || true

echo -e "${GREEN}✓${NC} Import paths fixed"
echo ""

################################################################################
# Step 5: Verify directory structure
################################################################################
echo -e "${BLUE}📊 Migration Summary${NC}"
echo "Module location: $MODULE_PATH"
echo "Total files copied: $COPIED_FILES"
echo "Import paths updated: $UPDATED_FILES"
echo ""

# Count actual files
PAGE_COUNT=$(ls "$MODULE_PATH/pages"/*.tsx 2>/dev/null | wc -l)
COMP_COUNT=$(ls "$MODULE_PATH/components"/*.tsx 2>/dev/null | wc -l)
LIB_COUNT=$(ls "$MODULE_PATH/lib"/*.ts 2>/dev/null | wc -l)

echo "Pages: $PAGE_COUNT/22"
echo "Components: $COMP_COUNT"
echo "Lib files: $LIB_COUNT"
echo ""

################################################################################
# Step 6: Next steps
################################################################################
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Run type checking: npm run typecheck"
echo "2. Build the module: npm run build"
echo "3. Test locally: npm run dev"
echo "4. Review any remaining @/ imports with: grep -r '@/' $MODULE_PATH"
echo ""
echo -e "${GREEN}✅ Migration script complete!${NC}"
echo ""
echo "Note: If you see any import errors, check MIGRATION_HELPER.md for troubleshooting"
