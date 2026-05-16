// File: src/components/EchoCore/components/interaction/EchoNotepad.jsx

import React, { useState, useEffect } from "react";
import UIActionButton from "./UIActionButton";

const EchoNotepad = () => {
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (notes) {
      setStatus("Saving...");
      const saveTimer = setTimeout(() => {
        localStorage.setItem("echo-notes", notes);
        setStatus("Saved");
      }, 800);
      return () => clearTimeout(saveTimer);
    }
  }, [notes]);

  useEffect(() => {
    const savedNotes = localStorage.getItem("echo-notes");
    if (savedNotes) setNotes(savedNotes);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3">Echo Notepad</h3>
      <textarea
        className="w-full p-2 border border-gray-300 rounded mb-2"
        rows={5}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write your thoughts or tasks here..."
      />
      <p className="text-xs text-gray-500 mb-2">{status}</p>
      <UIActionButton label="Clear" onClick={() => setNotes("")} />
    </div>
  );
};

export default EchoNotepad;