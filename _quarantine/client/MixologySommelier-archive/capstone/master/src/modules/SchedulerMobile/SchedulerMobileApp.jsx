import React from "react";
import { useScheduleStore } from "./useScheduleStore.js";
import DayView from "./views/DayView.jsx";

export default function SchedulerMobileApp() {
  const { entries, add, remove, update } = useScheduleStore([
    { id:"1", title:"AM Prep", start:"08:00", end:"10:00" },
    { id:"2", title:"Lunch Service", start:"11:30", end:"15:00" }
  ]);

  return (
    <div className="scheduler-mobile p-2">
      <h2 className="text-lg font-semibold mb-2">Mobile Scheduler</h2>
      <DayView entries={entries} />
    </div>
  );
}
