/**
 * iter209 · P2 · WhiteLabelProvider
 *
 * On mount, fetches `/api/tenant/config` and injects brand tokens as CSS vars
 * onto `<html>` so the rest of the app's Tailwind / inline styles can consume
 * them via `hsl(var(--brand-primary))` etc.
 *
 * Per William's directive all UI is EchoEvents-first — this provider wraps the
 * EchoEventsPanel's outer container so no global App.tsx changes are needed
 * yet. Future: promote to root when white-label is ready for GA.
 */
import React from "react";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return (
    env.VITE_REACT_APP_BACKEND_URL ||
    env.REACT_APP_BACKEND_URL ||
    env.VITE_BACKEND_URL ||
    ""
  );
};

type TenantConfig = {
  tenant_id: string;
  name: string;
  brand_primary: string;
  brand_accent: string;
  logo_url?: string;
  favicon_url?: string;
  domain?: string;
  features?: Record<string, boolean>;
};

const TenantContext = React.createContext<TenantConfig | null>(null);

export function useTenant(): TenantConfig | null {
  return React.useContext(TenantContext);
}

/** Convenience hook — returns the feature flag value from tenant config,
 *  defaulting to `true` when no config is loaded (fail-open during boot). */
export function useFeature(name: string): boolean {
  const tenant = useTenant();
  const v = tenant?.features?.[name];
  return v === undefined ? true : Boolean(v);
}

export default function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = React.useState<TenantConfig | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/tenant/config`);
        if (r.ok) {
          const j = await r.json();
          if (j?.config) {
            setTenant(j.config);
            const root = document.documentElement;
            if (j.config.brand_primary) root.style.setProperty("--brand-primary", j.config.brand_primary);
            if (j.config.brand_accent) root.style.setProperty("--brand-accent", j.config.brand_accent);
            // Optional favicon swap
            if (j.config.favicon_url) {
              let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
              if (!link) {
                link = document.createElement("link");
                link.rel = "icon";
                document.head.appendChild(link);
              }
              link.href = j.config.favicon_url;
            }
          }
        }
      } catch { /* ignore — app still runs on defaults */ }
    })();
  }, []);

  return (
    <TenantContext.Provider value={tenant}>
      <div data-testid="white-label-root" data-tenant={tenant?.tenant_id || "loading"}>
        {children}
      </div>
    </TenantContext.Provider>
  );
}
