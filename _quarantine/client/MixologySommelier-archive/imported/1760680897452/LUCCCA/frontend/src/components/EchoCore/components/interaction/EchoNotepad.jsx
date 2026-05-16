// File: src/components/EchoCore/components/interaction/EchoNotepad.jsx
import React, { useState, useEffect } from "react";

// [TEAM LOG: Interaction] - EchoNotepad with autosave confirmation
export default function EchoNotepad() {
  const [note, setNote] = useState(localStorage.getItem("echo_notepad") || "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem("echo_notepad", note);
      setSaved(true);
      setTimeout(() => setSaved(false), 1000);
    }, 500);
    return () => clearTimeout(timeout);
  }, [note]);

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Echo Notes</h2>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Type your thoughts..."
        className="w-full h-32 p-2 border rounded-lg focus:ring focus:ring-blue-200"
      />
      {saved && <span className="text-green-500 text-sm">✓ Saved</span>}
    </div>
  );
}
