// 1. ThemeControl.jsx
import React from "react";

export default function ThemeControl({ theme, setTheme }) {
return (
<div className="flex items-center space-x-4 p-4 bg-zinc-800 text-white rounded">
<label className="text-sm font-medium">Theme:</label>
<select
value={theme}
onChange={(e) => setTheme(e.target.value)}
className="bg-zinc-700 px-3 py-1 rounded border border-zinc-600"
>
<option value="light">Light</option>
<option value="dark">Dark</option>
<option value="system">System</option>
</select>
</div>
);
}