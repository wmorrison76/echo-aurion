import React, { useState } from "react";
import { useChefNet } from "../state/chefnetStore";
import { createJobPost } from "../api/apiClient";

export default function JobBoardPanel() {
  const [state, dispatch] = useChefNet();
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Culinary");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!trimmedTitle || !trimmedDesc) return;

    setSubmitting(true);
    try {
      const job = await createJobPost({
        title: trimmedTitle,
        department,
        description: trimmedDesc,
        postedBy: "HR Team",
      });
      dispatch({ type: "ADD_JOB", job });
      setTitle("");
      setDescription("");
      setDepartment("Culinary");
    } catch (err) {
      dispatch({ type: "ERROR", error: err?.message || "Unable to post job right now." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border border-emerald-100 dark:border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/50 rounded-xl p-3">
        <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-emerald-700 dark:text-emerald-200 mb-1">
          Internal Job Board • Growth & opportunity
        </div>
        <p className="text-xs text-emerald-900/80 dark:text-emerald-100/80">
          See openings within the LUCCCA family before they're posted externally. Move up, move around,
          or find a role that better suits your skills and goals.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Job title"
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/60"
          />
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            <option>Culinary</option>
            <option>Pastry</option>
            <option>Banquets</option>
            <option>Beverage</option>
            <option>Stewarding</option>
            <option>Rooms</option>
            <option>Engineering</option>
            <option>Leadership</option>
            <option>Front Desk</option>
          </select>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/60 mb-2"
          placeholder="Job description, requirements, and how to apply..."
        />
        <div className="flex items-center justify-end gap-2 text-[11px]">
          <button
            type="submit"
            disabled={submitting || !title.trim() || !description.trim()}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.16em] disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            {submitting ? "Posting…" : "Post Job"}
          </button>
        </div>
      </form>

      <div className="mt-2 space-y-2 max-h-96 chefnet-scroll overflow-y-auto">
        {state.jobs.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No open positions at the moment. Check back soon!
          </p>
        )}
        {state.jobs.map((job) => (
          <article
            key={job.id}
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white/80 dark:bg-slate-900/80"
          >
            <div className="flex items-start justify-between mb-1">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {job.title}
              </h4>
              <span className="chefnet-badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-200 dark:border-emerald-500/60 text-[10px]">
                {job.department}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {job.description}
            </p>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>Posted by {job.postedBy}</span>
              <span>{new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
