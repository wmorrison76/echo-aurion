import React from "react";

export default function SideNav() {
  return (
    <div className="w-64 bg-zinc-900 text-white h-full p-4 space-y-4">
      <div className="text-lg font-semibold">Echo Builder</div>
      <nav className="space-y-2">
        <a href="#" className="block hover:text-cyan-400">Dashboard</a>
        <a href="#" className="block hover:text-cyan-400">Components</a>
        <a href="#" className="block hover:text-cyan-400">Layouts</a>
        <a href="#" className="block hover:text-cyan-400">Pages</a>
        <a href="#" className="block hover:text-cyan-400">Settings</a>
      </nav>
    </div>
  );
}

// Optional future use:
const navItems = [
  "Pages", "Components", "Theme", "Code", "Preview", "Settings", "SuperAdmin"
];
