import React from "react";
import { createRoot } from "react-dom/client";
import SettingsSuite, { closeOverlay } from "./SettingsSuite.jsx";

let root=null, host=null;
function open(){ 
  if (!host){ host=document.createElement("div"); host.id="settings-suite-root"; document.body.appendChild(host); }
  if (!root){ root=createRoot(host); }
  root.render(<SettingsSuite/>);
}
function close(){
  if (root){ root.unmount(); root=null; }
  if (host){ host.remove(); host=null; }
}

export function registerSettingsOverlay(){
  window.addEventListener("open-panel", (e)=>{
    const id = e?.detail?.id;
    if (id==="settings-suite") open();
  });
  window.addEventListener("settings-suite:close", close);
}
