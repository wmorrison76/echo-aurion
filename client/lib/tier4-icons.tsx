/**
 * Tier 4 — UI / system icon resolver (iter265).
 *
 * Scaffolding so commissioned PNGs drop in zero-touch.
 *
 * Usage:
 *   import { Tier4Icon } from "@/lib/tier4-icons";
 *   <Tier4Icon name="settings" fallback={Settings} className="w-4 h-4" />
 *
 * Behaviour:
 *   - If /public/brand-icons/tier4/<Name>.png exists at build time, render <img>
 *   - Else render the `fallback` lucide component
 *
 * No DOM-flicker fallback: the component pre-checks at module init by hitting
 * a HEAD request for each path. Result is cached in a module-scope Map so
 * subsequent renders are synchronous.
 */
import React, { useEffect, useState } from "react";

const TIER4 = "/brand-icons/tier4";

/** Stable name → asset-path mapping. Adding a new icon? Drop the PNG into
 *  /public/brand-icons/tier4/<Name>.png and the resolver will pick it up. */
export const TIER4_ICON_PATHS: Record<string, string> = {
  settings: `${TIER4}/Settings.png`,
  notifications: `${TIER4}/Notifications.png`,
  search: `${TIER4}/Search.png`,
  logout: `${TIER4}/Logout.png`,
  filter: `${TIER4}/Filter.png`,
  sort: `${TIER4}/Sort.png`,
  export: `${TIER4}/Export.png`,
  refresh: `${TIER4}/Refresh.png`,
  help: `${TIER4}/Help.png`,
  add: `${TIER4}/Add.png`,
  edit: `${TIER4}/Edit.png`,
  delete: `${TIER4}/Delete.png`,
  close: `${TIER4}/Close.png`,
  more: `${TIER4}/More.png`,
};

/** Module-scope cache. true = exists, false = 404, undefined = not yet checked. */
const existenceCache = new Map<string, boolean>();

async function checkExists(url: string): Promise<boolean> {
  if (existenceCache.has(url)) return existenceCache.get(url)!;
  try {
    const res = await fetch(url, { method: "HEAD" });
    const ok = res.ok;
    existenceCache.set(url, ok);
    return ok;
  } catch {
    existenceCache.set(url, false);
    return false;
  }
}

interface Tier4IconProps {
  name: keyof typeof TIER4_ICON_PATHS;
  fallback: React.ComponentType<{ className?: string; size?: number | string }>;
  className?: string;
  size?: number;
  alt?: string;
}

export function Tier4Icon({ name, fallback: Fallback, className, size = 16, alt }: Tier4IconProps) {
  const path = TIER4_ICON_PATHS[name];
  const [exists, setExists] = useState<boolean | undefined>(() => existenceCache.get(path));

  useEffect(() => {
    if (exists === undefined && path) {
      checkExists(path).then(setExists);
    }
  }, [path, exists]);

  // Render fallback while checking, or if asset isn't there
  if (!exists || !path) {
    return <Fallback className={className} size={size} />;
  }

  return (
    <img
      src={path}
      alt={alt ?? name}
      className={className}
      width={size}
      height={size}
      style={{ display: "inline-block", verticalAlign: "middle" }}
      data-testid={`tier4-icon-${name}`}
    />
  );
}

/**
 * Hook variant for non-component contexts.
 * Returns { path, exists } so the caller can decide what to render.
 */
export function useTier4Icon(name: keyof typeof TIER4_ICON_PATHS) {
  const path = TIER4_ICON_PATHS[name];
  const [exists, setExists] = useState<boolean | undefined>(() => existenceCache.get(path));
  useEffect(() => {
    if (exists === undefined && path) {
      checkExists(path).then(setExists);
    }
  }, [path, exists]);
  return { path, exists };
}

/** Force-warm the cache at app boot — runs HEAD checks for all 14 in parallel. */
export async function warmTier4Cache(): Promise<void> {
  await Promise.all(
    Object.values(TIER4_ICON_PATHS).map((p) => checkExists(p)),
  );
}
