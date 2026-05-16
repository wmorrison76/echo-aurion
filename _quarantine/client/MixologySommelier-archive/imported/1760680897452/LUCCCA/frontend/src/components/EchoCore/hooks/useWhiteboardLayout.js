// File: src/components/EchoCore/hooks/useWhiteboardLayout.js
import { useState, useEffect } from "react";

// [TEAM LOG: Whiteboard] - Persistent module layout manager
export default function useWhiteboardLayout(defaultModules) {
  const [modules, setModules] = useState(() => {
    const saved = localStorage.getItem("echo_whiteboard_modules");
    return saved ? JSON.parse(saved) : defaultModules;
  });

  useEffect(() => {
    localStorage.setItem("echo_whiteboard_modules", JSON.stringify(modules));
  }, [modules]);

  return [modules, setModules];
}
