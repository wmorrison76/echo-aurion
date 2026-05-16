// File: enforce_file_structure.js

const fs = require("fs");
const path = require("path");

const moves = [
  {
    from: "frontend/src/modules/kitchen/RecipeInputPage.jsx",
    to: "frontend/src/components/Kitchen/RecipeInput.jsx",
  },
  {
    from: "frontend/src/modules/kitchen/RecipeList.jsx",
    to: "frontend/src/components/Kitchen/RecipeList.jsx",
  },
  {
    from: "frontend/src/modules/kitchen/RecipeListTab.jsx",
    to: "frontend/src/components/Kitchen/KitchenTabView.jsx",
  },
  {
    from: "frontend/src/modules/kitchen/Reciptable.jsx",
    to: "frontend/src/components/Kitchen/KitchenLayout.jsx",
  },
  {
    from: "frontend/src/modules/kitchen/RightSidebar.jsx",
    to: "frontend/src/components/Sidebar/LeftSidebar.jsx",
  }
];

// Ensure destination folders exist
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

moves.forEach(({ from, to }) => {
  const fromPath = path.resolve(from);
  const toPath = path.resolve(to);
  const toDir = path.dirname(toPath);

  if (fs.existsSync(fromPath)) {
    ensureDir(toDir);
    fs.renameSync(fromPath, toPath);
    console.log(`✅ Moved: ${from} → ${to}`);
  } else {
    console.warn(`⚠️ Missing: ${from}`);
  }
});
