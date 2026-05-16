// CanvasHistoryManager.jsx
// Manages undo/redo history stack for the EchoBuilder canvas

import { useRef } from "react";

export default function CanvasHistoryManager() {
  const history = useRef([]);
  const pointer = useRef(-1);

  const pushState = (state) => {
    history.current = history.current.slice(0, pointer.current + 1);
    history.current.push(state);
    pointer.current++;
  };

  const undo = () => {
    if (pointer.current > 0) pointer.current--;
    return history.current[pointer.current];
  };

  const redo = () => {
    if (pointer.current < history.current.length - 1) pointer.current++;
    return history.current[pointer.current];
  };

  return { pushState, undo, redo };
}