import React, { useEffect, useState } from "react";

export default function SettingsSheet({ open, onClose, value, onChange }) {
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  const update = (patch) => setLocal((v) => ({ ...v, ...patch }));
  const save   = () => { onChange(local); onClose(); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-6 top-6 w-[360px] rounded-2xl bg-white dark:bg-slate-900 border border-black/10 dark:border-white/15 shadow-2xl p-4">
        <div className="text-lg font-semibold mb-3">Settings</div>

        <div className="space-y-4 text-sm">
          <div>
            <div className="font-semibold mb-1">Dock location</div>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1.5 rounded-lg border ${local.dockPosition==="bottom"?"bg-slate-100 dark:bg-slate-800":"bg-white dark:bg-slate-900"} border-black/10`}
                onClick={() => update({ dockPosition: "bottom" })}
              >Bottom (default)</button>
              <button
                className={`px-3 py-1.5 rounded-lg border ${local.dockPosition==="left-rail"?"bg-slate-100 dark:bg-slate-800":"bg-white dark:bg-slate-900"} border-black/10`}
                onClick={() => update({ dockPosition: "left-rail" })}
              >Left rail slot</button>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!local.sidebarTight}
                   onChange={(e)=>update({ sidebarTight: e.target.checked })} />
            Tighter sidebar spacing
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!local.sidebarHideScrollbar}
                   onChange={(e)=>update({ sidebarHideScrollbar: e.target.checked })} />
            Hide sidebar scrollbar (keep scroll)
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded-lg border border-black/10" onClick={onClose}>Cancel</button>
          <button className="px-3 py-1.5 rounded-lg border border-black/10 bg-slate-900 text-white dark:bg-white dark:text-slate-900" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
