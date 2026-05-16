// src/modules/pastry/cake/components/SavedCakeArchivePanel.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const mockSavedCakes = [
  {
    id: "cake-2024-0622-01",
    name: "Gatsby Garden Wedding",
    client: "Alicia Bennett",
    date: "2024-06-22",
    servings: 124,
    tags: ["wedding", "fondant", "3-tier"],
    imageURL: "/saved/gatsby-garden.png",
    notes: "Used flavored lemon simple syrup. 3-day build with offsite assembly.",
  },
  {
    id: "cake-2024-0408-02",
    name: "Monster Truck Birthday",
    client: "Lucas Raymond",
    date: "2024-04-08",
    servings: 32,
    tags: ["birthday", "chocolate", "structure"],
    imageURL: "/saved/monster-truck.png",
    notes: "Had minor crumb issues — next time reduce mixing time.",
  },
];

export const SavedCakeArchivePanel = ({ onReorder }) => {
  const [query, setQuery] = useState("");

  const filtered = mockSavedCakes.filter((cake) =>
    cake.name.toLowerCase().includes(query.toLowerCase()) ||
    cake.client.toLowerCase().includes(query.toLowerCase()) ||
    cake.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <Card className="p-4 space-y-4 border border-gray-400 bg-gray-50">
      <h3 className="text-sm font-semibold text-gray-800">Saved Cake Archive</h3>

      <Input
        placeholder="Search by name, client, tag..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <ul className="space-y-2 text-xs">
        {filtered.map((cake) => (
          <li key={cake.id} className="border-b pb-2">
            <div className="font-medium">{cake.name}</div>
            <div className="text-slate-600">Client: {cake.client} | {cake.date}</div>
            <div className="text-slate-500 italic">{cake.notes}</div>
            <button
              className="mt-1 text-xs text-blue-600 underline"
              onClick={() => onReorder(cake)}
            >
              Reorder or Clone
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default SavedCakeArchivePanel;
