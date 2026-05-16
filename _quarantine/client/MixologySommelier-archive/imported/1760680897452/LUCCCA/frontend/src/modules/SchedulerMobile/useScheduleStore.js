/**
 * useScheduleStore — zustand-lite store for schedules.
 * Provides unified state for mobile components.
 */
import { useState } from "react";

export function useScheduleStore(initial=[]) {
  const [entries, setEntries] = useState(initial);

  function add(entry) { setEntries([...entries, { ...entry, id:crypto.randomUUID() }]); }
  function remove(id) { setEntries(entries.filter(e=>e.id!==id)); }
  function update(id, patch) { setEntries(entries.map(e=> e.id===id ? { ...e, ...patch } : e)); }

  return { entries, add, remove, update };
}

export default useScheduleStore;
