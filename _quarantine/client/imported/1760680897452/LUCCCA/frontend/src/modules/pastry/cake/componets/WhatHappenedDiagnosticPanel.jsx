// src/modules/pastry/cake/components/WhatHappenedDiagnosticPanel.jsx

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const commonIssues = [
  {
    symptom: "Crumbly cake texture",
    causes: [
      "Too much flour or over-mixing",
      "Not enough fat or liquid",
      "Baked too long or too hot",
    ],
    fixes: [
      "Use cake flour instead of all-purpose",
      "Check fat/liquid ratios",
      "Reduce oven temp by 25°F next time",
    ],
  },
  {
    symptom: "Cake collapsed in center",
    causes: [
      "Underbaked",
      "Overmixed batter (too much air)",
      "Oven opened too early",
    ],
    fixes: [
      "Bake until toothpick comes out clean",
      "Fold gently after mixing",
      "Avoid opening oven before 75% bake time",
    ],
  },
  {
    symptom: "Fondant cracked or dried out",
    causes: [
      "Fondant exposed too long before applying",
      "Not enough buttercream support underneath",
    ],
    fixes: [
      "Cover fondant tightly before use",
      "Apply on smooth, sealed surface (crumb coat + chilled)",
    ],
  },
];

export const WhatHappenedDiagnosticPanel = () => {
  const [query, setQuery] = useState("");

  const result = commonIssues.find((issue) =>
    issue.symptom.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Card className="p-4 border border-red-400 bg-red-50 space-y-4">
      <h3 className="text-sm font-semibold text-red-700">“WhatHappened” – Cake Issue Diagnosis</h3>

      <Input
        placeholder="Describe the issue (e.g. crumbly, sunken, cracked)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {result && (
        <div className="text-xs space-y-2 mt-2">
          <div>
            <strong>Likely Causes:</strong>
            <ul className="list-disc ml-5">
              {result.causes.map((cause, i) => (
                <li key={i}>{cause}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Fixes to Try:</strong>
            <ul className="list-disc ml-5">
              {result.fixes.map((fix, i) => (
                <li key={i}>{fix}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
};

export default WhatHappenedDiagnosticPanel;
