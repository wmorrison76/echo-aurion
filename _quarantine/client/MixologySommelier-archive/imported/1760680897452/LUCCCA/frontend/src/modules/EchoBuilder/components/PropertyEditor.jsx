// 3. PropertyEditor.jsx
import React from "react";

export default function PropertyEditor({ selectedElement, onChange }) {
if (!selectedElement) return <div className="p-4 text-zinc-400">Nothing selected</div>;

const handleInput = (e) => {
const { name, value } = e.target;
onChange({ ...selectedElement, [name]: value });
};

return (
<div className="space-y-3 p-4">
<h3 className="text-sm font-semibold text-zinc-300">Edit Properties</h3>
<input
type="text"
name="label"
value={selectedElement.label || ""}
onChange={handleInput}
placeholder="Label"
className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-1 rounded"
/>
<input
type="text"
name="className"
value={selectedElement.className || ""}
onChange={handleInput}
placeholder="Custom classes"
className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-1 rounded"
/>
</div>
);
}
