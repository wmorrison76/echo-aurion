/**
 * SommelierMixologyPanel — combined panel of wine + cocktail.
 */
import React, { useState } from "react";
import { SommelierPanel } from "../EchoSommelier/components/SommelierPanel.jsx";
import { EchoMixologyPanel } from "../EchoMixologyAI/EchoMixologyPanel.jsx";

export default function SommelierMixologyPanel(){
  const [mode, setMode] = useState("wine");
  return (
    <div className="sommelier-mixology p-4 rounded-2xl border border-white/10">
      <div className="flex gap-2 mb-3 text-sm">
        <button onClick={()=>setMode("wine")} className="px-2 py-1 bg-white/10 rounded">Wine</button>
        <button onClick={()=>setMode("cocktail")} className="px-2 py-1 bg-white/10 rounded">Cocktail</button>
      </div>
      {mode==="wine" ? <SommelierPanel/> : <EchoMixologyPanel/>}
    </div>
  );
}
