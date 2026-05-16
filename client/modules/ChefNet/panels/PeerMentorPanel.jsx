import React, { useState } from "react";
import { useChefNet } from "../state/chefnetStore";

export default function PeerMentorPanel() {
  const [state] = useChefNet();
  const [interest, setInterest] = useState("mentee");
  const [area, setArea] = useState("Culinary");
  const [note, setNote] = useState("");

  return (
    <div className="space-y-3 text-xs">
      <section className="border border-amber-200 dark:border-amber-600/60 rounded-xl p-3 bg-amber-50/80 dark:bg-amber-950/60">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-200 mb-1">
          Peer & mentor connections
        </div>
        <p className="text-xs text-amber-900/90 dark:text-amber-100/90">
          Not every question belongs to your direct boss. This panel lets people raise their hand
          as mentors or mentees, so ChefNet (and later Echo) can help connect skills with curiosity.
        </p>
      </section>

      <section className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white/90 dark:bg-slate-900/90">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-2 py-1 outline-none"
          >
            <option value="mentee">I'd like a mentor</option>
            <option value="mentor">I'm willing to mentor</option>
            <option value="both">Both mentor and mentee</option>
          </select>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-2 py-1 outline-none"
          >
            <option>Culinary</option>
            <option>Pastry</option>
            <option>Banquets</option>
            <option>Beverage</option>
            <option>Stewarding</option>
            <option>Rooms</option>
            <option>Engineering</option>
            <option>Leadership</option>
          </select>
          <button
            type="button"
            className="rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50/90 dark:bg-amber-900/80 px-2 py-1 font-semibold text-[11px] uppercase tracking-[0.14em] text-amber-900 dark:text-amber-100"
          >
            Register interest (stub)
          </button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 text-xs outline-none"
          placeholder="Optional: share what you'd like to learn or what you can teach (e.g., large‑scale banquets, menu engineering, wine basics)."
        />
        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
          In production, this would create a matchable profile for Echo and HR to use when pairing
          mentors and mentees. For now, it's a schema reference and UI shell.
        </p>
      </section>

      <section className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/80 dark:bg-slate-900/90">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-200 mb-1">
          Future: mentor map
        </h3>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300">
          <li>Map mentors by skill domain and language.</li>
          <li>Show "coverage gaps" where no mentors exist yet.</li>
          <li>Track session counts, feedback, and promotions over time.</li>
        </ul>
      </section>
    </div>
  );
}
