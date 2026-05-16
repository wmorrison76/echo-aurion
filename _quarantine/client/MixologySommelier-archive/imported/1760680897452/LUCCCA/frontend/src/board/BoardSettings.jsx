import React from "react";

export default function BoardSettings({
  autoDock, setAutoDock,
  dockPos, setDockPos,
  allowOffscreen, setAllowOffscreen,
  toolbarPinned, setToolbarPinned,
}) {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold mb-2">Board Settings</h2>

      <section className="space-y-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={autoDock} onChange={e=>setAutoDock(e.target.checked)} />
          <span>Auto-dock new panels</span>
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allowOffscreen} onChange={e=>setAllowOffscreen(e.target.checked)} />
          <span>Allow panels to move partially off-screen</span>
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={toolbarPinned} onChange={e=>setToolbarPinned(e.target.checked)} />
          <span>Pin toolbar (disable auto-hide)</span>
        </label>
      </section>

      <section>
        <div className="font-semibold mb-1">Dock position</div>
        <div className="flex gap-2">
          {["top","right","bottom","left"].map(pos=>(
            <button
              key={pos}
              onClick={()=>setDockPos(pos)}
              className={`px-3 py-1 rounded border ${dockPos===pos ? "bg-cyan-600 text-white border-cyan-500" : "border-black/20 dark:border-white/20"}`}
            >
              {pos}
            </button>
          ))}
        </div>
      </section>

      <p className="text-xs opacity-70 mt-4">
        Shortcuts: ⌘/Ctrl+Shift+H docks all windows. ⌘/Ctrl+Shift+R restores docked windows.
      </p>
    </div>
  );
}
