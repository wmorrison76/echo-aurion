import React from "react";

/**
 * Simple About page. You can pipe your app version in at build time, or
 * fetch from package.json if you wire a small endpoint. For now it’s static.
 */

export default function About(){
  return (
    <div className="rounded-2xl p-5 border border-white/10 bg-white/[.03] space-y-4">
      <div className="text-xl font-bold">About</div>
      <div className="text-sm opacity-80">
        LUCCCA — internal tools suite.
      </div>

      <ul className="text-sm list-disc pl-5 space-y-1 opacity-90">
        <li>Global theming via CSS variables (see <code>src/lib/theme.js</code>)</li>
        <li>Avatars live in <code>src/assets/Echo_*.png</code> (upload supported)</li>
        <li>Settings stored in localStorage (per-browser)</li>
      </ul>

      <div className="text-xs opacity-60">
        © {new Date().getFullYear()} LUCCCA. All rights reserved.
      </div>
    </div>
  );
}
