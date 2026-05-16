// src/components/cake/IntakeDrawer.jsx
import React, { useMemo, useState } from "react";
import { estimateTimePlan, suggestTiers, servingsForTier, STANDARD_TIER_HEIGHT_IN } from "@/modules/pastry/cake/utils/servings";
import { Button } from "@/components/ui/button";

export default function IntakeDrawer({ open, onClose, onCommit }) {
  const [client, setClient] = useState({ name: "", phone: "", email: "" });
  const [event, setEvent] = useState({ date: "", type: "Wedding", guests: 120 });
  const [cake, setCake] = useState({ shape: "round" });
  const [logistics, setLogistics] = useState({ delivery: "pickup", refNo: "" });

  const tiers = useMemo(
    () => suggestTiers({ guests: Number(event.guests || 0), shape: cake.shape, maxTiers: 4 }),
    [event.guests, cake.shape]
  );
  const servings = tiers.reduce((s,t)=> s + servingsForTier(t), 0);
  const timePlan = useMemo(() => estimateTimePlan({ tiers }), [tiers]);

  const commit = () => {
    onCommit?.({
      client, event, logistics,
      design: { shape: cake.shape, tiers, standardTierHeightIn: STANDARD_TIER_HEIGHT_IN },
      timePlan,
      // Production anchors: bake day = event.date - 1, decorate day = event.date
      scheduleAnchors: { bake: -1, decorate: 0 }
    });
    onClose?.();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1200] bg-black/50 flex">
      <div className="ml-auto w-[560px] h-full bg-slate-900 text-slate-100 p-6 overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Intake • Cake Order</h2>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        {/* Client & Event */}
        <section className="space-y-3 mb-6">
          <h3 className="text-sm uppercase tracking-wide text-slate-400">Client & Event</h3>
          <input className="w-full rounded bg-slate-800 px-3 py-2" placeholder="Client name"
                 value={client.name} onChange={e=>setClient({...client, name:e.target.value})}/>
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded bg-slate-800 px-3 py-2" placeholder="Phone"
                   value={client.phone} onChange={e=>setClient({...client, phone:e.target.value})}/>
            <input className="rounded bg-slate-800 px-3 py-2" placeholder="Email"
                   value={client.email} onChange={e=>setClient({...client, email:e.target.value})}/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input type="date" className="rounded bg-slate-800 px-3 py-2"
                   value={event.date} onChange={e=>setEvent({...event, date:e.target.value})}/>
            <select className="rounded bg-slate-800 px-3 py-2"
                    value={event.type} onChange={e=>setEvent({...event, type:e.target.value})}>
              {["Wedding","Birthday","Anniversary","Corporate","Other"].map(x=><option key={x}>{x}</option>)}
            </select>
            <input type="number" min="1" className="rounded bg-slate-800 px-3 py-2"
                   value={event.guests} onChange={e=>setEvent({...event, guests:e.target.value})}
                   placeholder="Guests"/>
          </div>
        </section>

        {/* Cake Specs */}
        <section className="space-y-3 mb-6">
          <h3 className="text-sm uppercase tracking-wide text-slate-400">Cake Specs</h3>
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-3 text-slate-300">Shape</label>
            <button className={`px-3 py-2 rounded ${cake.shape==="round"?"bg-cyan-700":"bg-slate-800"}`}
                    onClick={()=>setCake({...cake, shape:"round"})}>Round</button>
            <button className={`px-3 py-2 rounded ${cake.shape==="square"?"bg-cyan-700":"bg-slate-800"}`}
                    onClick={()=>setCake({...cake, shape:"square"})}>Square</button>
            <button className={`px-3 py-2 rounded ${cake.shape==="sheet"?"bg-cyan-700":"bg-slate-800"}`}
                    onClick={()=>setCake({...cake, shape:"sheet"})}>Sheet</button>
          </div>

          <div className="mt-3 rounded border border-slate-700 p-3 bg-slate-800">
            <div className="flex items-center justify-between">
              <div className="font-medium">Suggested Tiers</div>
              <div className="text-sm text-slate-400">{servings} servings</div>
            </div>
            <ul className="mt-2 text-sm space-y-1">
              {tiers.map((t,i)=>(
                <li key={i} className="flex items-center justify-between">
                  <span>Tier {i+1}: {t.size}" {t.shape}</span>
                  <span className="text-slate-400">{servingsForTier(t)} servings</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Logistics */}
        <section className="space-y-3 mb-6">
          <h3 className="text-sm uppercase tracking-wide text-slate-400">Logistics</h3>
          <div className="grid grid-cols-2 gap-3">
            <select className="rounded bg-slate-800 px-3 py-2"
                    value={logistics.delivery} onChange={e=>setLogistics({...logistics, delivery:e.target.value})}>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>
            <input className="rounded bg-slate-800 px-3 py-2" placeholder="BEO/REO #"
                   value={logistics.refNo} onChange={e=>setLogistics({...logistics, refNo:e.target.value})}/>
          </div>
        </section>

        {/* Time Plan Summary */}
        <section className="space-y-2 mb-6">
          <h3 className="text-sm uppercase tracking-wide text-slate-400">Production Time Plan</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {Object.entries(timePlan).filter(([k])=>k!=="total").map(([k,v])=>(
              <div key={k} className="flex justify-between"><span className="capitalize">{k}</span><span>{v} min</span></div>
            ))}
          </div>
          <div className="mt-2 text-right text-slate-400 text-sm">Total: {timePlan.total} min (hands-on + passive)</div>
        </section>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={commit}>Add to Builder</Button>
        </div>
      </div>
    </div>
  );
}
