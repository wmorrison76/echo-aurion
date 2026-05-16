/**
 * FeatureFlags — lightweight runtime flags with persistence.
 * - Reads defaults from flags.json (baked at build), overrides via localStorage.
 * - No external deps; can run on server (guarded) or browser.
 */
import defaults from "./flags.json";

const KEY = "echo:feature-flags:v1";

function safeRead(){
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function safeWrite(data){
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export function all(){
  return { ...defaults, ...safeRead() };
}

export function isOn(flag){
  const merged = all();
  return !!merged[String(flag)] ;
}

export function set(flag, value){
  const merged = { ...safeRead(), [String(flag)]: !!value };
  safeWrite(merged);
  return merged;
}

export function reset(){
  safeWrite({});
}

export default { all, isOn, set, reset };
