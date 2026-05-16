// src/modules/pastry/cake/components/CupcakeLinerSelector.jsx

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

import { cupcakeLinerLibrary } from "../data/cupcakeLinerLibrary";

export const CupcakeLinerSelector = ({ onSelect }) => {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);

  const handleSearch = (value) => {
    setQuery(value);
    const match = cupcakeLinerLibrary.filter((liner) =>
      liner.name.toLowerCase().includes(value.toLowerCase()) ||
      liner.ref.toLowerCase().includes(value.toLowerCase())
    );
    setFiltered(match.slice(0, 10));
  };

  return (
    <Card className="p-4 space-y-3 border border-pink-400 bg-pink-50">
      <h3 className="text-sm font-semibold text-pink-700">Cupcake Liner Selector</h3>

      <Input
        placeholder="Search by name, style, or reference #"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />

      {filtered.length > 0 && (
        <ul className="text-xs text-slate-700 mt-2 space-y-1">
          {filtered.map((liner) => (
            <li
              key={liner.ref}
              className="cursor-pointer hover:bg-pink-100 px-2 py-1 rounded"
              onClick={() => onSelect(liner)}
            >
              <strong>{liner.name}</strong> ({liner.size}, {liner.material}) — Ref: {liner.ref}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default CupcakeLinerSelector;
