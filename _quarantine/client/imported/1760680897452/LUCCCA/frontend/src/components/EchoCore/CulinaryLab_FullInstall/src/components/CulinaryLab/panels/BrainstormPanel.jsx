import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const defaultPrompts = [
  { label: "🧠 Culinary Concept", placeholder: "What inspired this idea?" },
  { label: "🍽️ Flavors to Explore", placeholder: "List any flavor combinations or themes..." },
  { label: "🎯 Challenge / Goal", placeholder: "Is there a technique or goal to achieve?" },
  { label: "🔬 Scientific Hypothesis", placeholder: "What do you think will happen?" },
  { label: "🧂 Desired Texture(s)", placeholder: "Crispy, velvety, gelled, etc..." },
  { label: "🧪 Experimental Method", placeholder: "Planned test or procedure?" },
];

export default function BrainstormPanel() {
  const [responses, setResponses] = useState({});

  const handleChange = (field, value) => {
    setResponses((prev) => ({ ...prev, [field]: value }));
  };

  const handleClear = () => {
    setResponses({});
  };

  return (
    <Card className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md mb-4">
      <CardContent className="space-y-4 p-4">
        <h2 className="text-xl font-semibold text-white">🧠 Culinary Brainstorming Lab</h2>
        <p className="text-sm text-slate-400">
          Begin your experiment with a creative brief using the scientific method.
        </p>

        {defaultPrompts.map((prompt, index) => (
          <div key={index} className="space-y-1">
            <label className="text-slate-300 text-sm font-medium">{prompt.label}</label>
            <Textarea
              rows={2}
              placeholder={prompt.placeholder}
              className="bg-slate-800 text-white border border-slate-700"
              value={responses[prompt.label] || ""}
              onChange={(e) => handleChange(prompt.label, e.target.value)}
            />
          </div>
        ))}

        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={handleClear}>
            Clear All
          </Button>
          <Button variant="default">Save Notes</Button>
        </div>
      </CardContent>
    </Card>
  );
}
