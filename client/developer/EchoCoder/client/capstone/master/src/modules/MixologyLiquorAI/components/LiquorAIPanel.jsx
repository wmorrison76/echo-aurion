import React, { useState } from "react";
import * as Rules from "../lib/liquor-rules.js";

export default function LiquorAIPanel() {
  const [base, setBase] = useState("gin");
  const subs = Rules.suggestSubstitute(base);

  return (
    <div className="liquor-ai p-4 rounded-2xl border border-white/10">
      <h3 className="font-semibold">Liquor AI</h3>
      <label className="text-sm">Base spirit:
        <select value={base} onChange={e=>setBase(e.target.value)} className="ml-2">
          <option value="gin">Gin</option>
          <option value="vodka">Vodka</option>
          <option value="rum">Rum</option>
          <option value="whiskey">Whiskey</option>
          <option value="tequila">Tequila</option>
        </select>
      </label>
      <div className="mt-2 text-sm">Substitutes: {subs.join(", ")||"none"}</div>
    </div>
  );
}
