import { useEffect } from "react";
if (!window.__registerHudSetter) {
  window.__registerHudSetter = function(setter){
    window.__luccca_hud_setter = setter;
    const q = window.__luccca_hud_queue || [];
    q.splice(0).forEach(ev => tryAdd(ev));
  };
}
function shape(detail){
  const w = detail || {};
  return { id: w.id || ("widget-" + Math.random().toString(36).slice(2,8)), title: w.title || "New Widget", type: w.type || w.id || "custom", x:0,y:0,w:4,h:3, payload:w };
}
function tryAdd(detail){
  if (typeof window.__luccca_hud_setter === "function"){
    const setter = window.__luccca_hud_setter;
    setter(arr => arr.concat(shape(detail)));
  } else {
    (window.__luccca_hud_queue ||= []).push(detail);
  }
}
(function(){
  if (window.__luccca_hud_listener_installed) return;
  window.__luccca_hud_listener_installed = true;
  window.addEventListener("hud-internal-add-widget", (e) => tryAdd(e.detail));
  window.addEventListener("hud-add-widget", (e) => {
    window.dispatchEvent(new CustomEvent("hud-internal-add-widget", { detail: e.detail }));
  });
})();
export function useHudAddListener(setHudWidgets){
  useEffect(() => { window.__registerHudSetter?.(setHudWidgets); }, [setHudWidgets]);
}
