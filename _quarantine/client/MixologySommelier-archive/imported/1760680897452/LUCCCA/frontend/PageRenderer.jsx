import React from "react";

export default function PageRenderer() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
      <h1 className="text-2xl font-semibold mb-4">Welcome to EchoBuilder</h1>
      <p className="text-zinc-300">
        Select a module or component from the navigation to get started. This builder will evolve into a full drag-and-drop interface with code previews.
      </p>
    </div>
  );
}
