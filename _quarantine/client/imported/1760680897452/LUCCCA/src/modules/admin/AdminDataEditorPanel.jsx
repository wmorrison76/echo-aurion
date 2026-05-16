// src/modules/admin/data/AdminDataEditorPanel.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminDataEditorPanel } from "@/modules/admin/data/AdminDataEditorPanel";


export const AdminDataEditorPanel = () => {
  const [dataType, setDataType] = useState("flowers");
  const [newEntry, setNewEntry] = useState("");
  const [entries, setEntries] = useState([]);

  const handleAdd = () => {
    if (newEntry.trim()) {
      setEntries([...entries, newEntry.trim()]);
      setNewEntry("");
    }
  };

  return (
    <Card className="p-4 space-y-4 border border-slate-300 bg-slate-50">
      <h3 className="text-sm font-semibold text-slate-700">Admin Data Control</h3>

      <select
        value={dataType}
        onChange={(e) => {
          setDataType(e.target.value);
          setEntries([]); // reset on change
        }}
        className="border p-1 rounded text-sm"
      >
        <option value="flowers">Flower Library</option>
        <option value="liners">Cupcake Liners</option>
        <option value="stands">Cake Stands</option>
        <option value="regions">Regions</option>
        <option value="seasons">Seasons</option>
      </select>

      <div className="flex space-x-2">
        <Input
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          placeholder={`Add new ${dataType.slice(0, -1)}`}
        />
        <Button onClick={handleAdd}>Add</Button>
      </div>

      <ul className="text-xs space-y-1">
        {entries.map((entry, i) => (
          <li key={i} className="px-2 py-1 bg-white rounded shadow-sm">
            {entry}
          </li>
        ))}
      </ul>
    </Card>
  );
};
