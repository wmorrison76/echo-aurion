
// src/routes/SchedulesPage.jsx
import React from "react";
import SchedulerPanel from "../../frontend/src/modules/scheduling/SchedulerPanel";

export default function SchedulesPage(){
  return <div style={{height:"100%", overflow:"auto"}}>
    <SchedulerPanel />
  </div>;
}
