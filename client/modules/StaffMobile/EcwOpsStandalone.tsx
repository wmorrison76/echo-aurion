/**
 * iter224 · ECW Ops mobile — standalone 4-tab shell
 *
 * Route: /m/ecw  OR  /m/ecw/:token
 *
 * Tabs (left → right):
 *   ♻️ Waste       · existing capture UI (re-uses WasteTab)
 *   ✅ Line Check  · station-by-station walk-through + temp checks
 *   📖 Recipes     · searchable + SMS-to-cook
 *   📷 Photos      · capture → Sonnet auto-name → chef confirm
 *
 * Header: ECW brand + outlet switcher (for multi-outlet chefs)
 */
import React from "react";
import { useParams } from "react-router-dom";
import { WasteTab } from "./WasteTab";
import { LineCheckTab } from "./ecw-ops/LineCheckTab";
import { RecipesTab } from "./ecw-ops/RecipesTab";
import { PhotosTab } from "./ecw-ops/PhotosTab";
import { InventoryTab } from "./ecw-ops/InventoryTab";
import { OrdersTab } from "./ecw-ops/OrdersTab";
import { API } from "@/lib/api-url";
import { OutletSwitcher } from "./ecw-ops/OutletSwitcher";
import { EchoMiniButton } from "./ecw-ops/EchoMiniButton";
import { InvoiceModal } from "./ecw-ops/InvoiceModal";
import { WeatherStrip } from "./ecw-ops/WeatherStrip";
import { SplashScreen } from "./ecw-ops/SplashScreen";
import { DashboardTab } from "./ecw-ops/DashboardTab";
import { StandupTab, StandupModal } from "./ecw-ops/StandupTab";
import { ReservationsBanner, ConciergeAlertStrip } from "./ecw-ops/ReservationsLive";
import { VipTrackerTab } from "./ecw-ops/VipTrackerTab";
import { ScheduleEditor } from "./ecw-ops/ScheduleEditor";
import { MaestroBanquetTab } from "./ecw-ops/MaestroBanquetTab";
import { StorageMapTab } from "./ecw-ops/StorageMapTab";
import { VipAtDoorWidget } from "./ecw-ops/VipAtDoorWidget";
import { GalleryTab } from "./ecw-ops/GalleryTab";
import { Iter245Tab } from "./ecw-ops/Iter245Tab";
import { MobileModuleDrawer } from "./ecw-ops/MobileModuleDrawer";

type TabKey = "waste" | "linecheck" | "inventory" | "orders" | "recipes" | "photos" | "dashboard" | "standup" | "vip" | "schedule" | "banquet" | "storage" | "radio";
type Department = "culinary" | "foh" | "mixology-rd" | "pastry";

const VALID_TABS: TabKey[] = ["waste", "linecheck", "inventory", "orders", "recipes", "photos", "dashboard", "standup", "vip", "schedule", "banquet", "storage", "radio"];

const DEPARTMENTS: { id: Department; label: string; icon: string;
                      visibleTabs: TabKey[]; defaultTab: TabKey }[] = [
  // Culinary sees everything (chef-in-chief view)
  { id: "culinary",    label: "Culinary",     icon: "🍳",
     visibleTabs: ["dashboard", "standup", "vip", "radio", "schedule", "banquet", "storage", "waste", "linecheck", "inventory", "orders", "recipes", "photos"],
     defaultTab:  "linecheck" },
  // FOH: hospitality-forward — VIP front-and-center
  { id: "foh",         label: "FOH",          icon: "🛎",
     visibleTabs: ["dashboard", "standup", "vip", "radio", "schedule", "banquet", "recipes", "orders", "photos"],
     defaultTab:  "vip" },
  // Mixology R&D: drink development
  { id: "mixology-rd", label: "Mixology R&D", icon: "🍸",
     visibleTabs: ["dashboard", "standup", "radio", "schedule", "storage", "recipes", "inventory", "photos"],
     defaultTab:  "recipes" },
  // Pastry: prep-centric
  { id: "pastry",      label: "Pastry",       icon: "🥐",
     visibleTabs: ["dashboard", "standup", "radio", "schedule", "storage", "recipes", "linecheck", "waste", "inventory", "photos"],
     defaultTab:  "recipes" },
];

export default function EcwOpsStandalone() {
  const { token } = useParams<{ token?: string }>();
  const effectiveToken = token || "demo";
  // iter234 · session persistence — resume last tab on reload
  const [tab, setTab] = React.useState<TabKey>(() => {
    const saved = localStorage.getItem("ecw_last_tab");
    return (saved && VALID_TABS.includes(saved as TabKey)) ? (saved as TabKey) : "linecheck";
  });
  const [outletId, setOutletId] = React.useState<string>(
    () => localStorage.getItem("ecw_outlet_id") || "outlet-rooftop"
  );
  const [invoicesOpen, setInvoicesOpen] = React.useState(false);
  const [invoiceFilter, setInvoiceFilter] = React.useState<{ gl_code?: string; label?: string } | null>(null);
  const [splashDone, setSplashDone] = React.useState(false);
  const [department, setDepartment] = React.useState<Department>(() =>
    (localStorage.getItem("ecw_department") as Department) || "culinary"
  );
  const [moreOpen, setMoreOpen] = React.useState(false);

  React.useEffect(() => {
    localStorage.setItem("ecw_department", department);
  }, [department]);

  // iter243 · Allow other panels to switch tabs via event
  React.useEffect(() => {
    const handler = (e: any) => {
      const t = e?.detail?.tab;
      if (t && VALID_TABS.includes(t as TabKey)) setTab(t as TabKey);
    };
    window.addEventListener("echo:switch-tab", handler);
    return () => window.removeEventListener("echo:switch-tab", handler);
  }, []);

  const currentDept = DEPARTMENTS.find((d) => d.id === department) || DEPARTMENTS[0];

  // iter239 · When user switches department, auto-navigate to that dept's
  // default tab if the current tab isn't in the dept's visibleTabs set.
  React.useEffect(() => {
    if (!currentDept.visibleTabs.includes(tab)) {
      setTab(currentDept.defaultTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department]);

  // iter239 · Daily standup enforced on first load per session
  // (admin-togglable). 4s minimum + scroll-to-bottom before dismiss.
  const [standupOpen, setStandupOpen] = React.useState(false);
  React.useEffect(() => {
    if (!splashDone) return;
    const todayKey = `ecw_standup_seen_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(todayKey)) return;
    // Check admin toggle (defaults to on)
    fetch(`${API()}/api/ecw-ops/standup/settings`)
      .then((r) => r.ok ? r.json() : { enabled: true })
      .then((s) => {
        if (s?.enabled !== false) setStandupOpen(true);
      })
      .catch(() => setStandupOpen(true));
  }, [splashDone]);
  function onStandupDismiss() {
    const todayKey = `ecw_standup_seen_${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(todayKey, "1");
    setStandupOpen(false);
  }

  // iter234 · persist tab selection so refresh doesn't dump user on Line Check
  React.useEffect(() => {
    localStorage.setItem("ecw_last_tab", tab);
  }, [tab]);

  // iter233 · If saved outlet is the generic 'outlet-main' (has no
  // EchoAurium P&L data), auto-upgrade to the first EchoAurium outlet the
  // chef has access to. Fixes the blank-P&L report William saw.
  React.useEffect(() => {
    if (outletId !== "outlet-main") return;
    fetch(`${API()}/api/echoaurium/outlets`, {
      headers: { "X-User-Id": "chef-william" },
    }).then((r) => r.json()).then((d) => {
      const first = d?.rows?.find?.((o: any) => o.active)?.id || d?.rows?.[0]?.id;
      if (first) {
        setOutletId(first);
        localStorage.setItem("ecw_outlet_id", first);
      }
    }).catch(() => undefined);
  }, []);

  // iter228 · listen for "open invoices" event from Echo P&L rail
  // iter236 · capture gl_code/label filter from event.detail
  React.useEffect(() => {
    const onOpen = (e: any) => {
      const detail = e?.detail || {};
      setInvoiceFilter(detail.gl_code ? { gl_code: detail.gl_code, label: detail.label } : null);
      setInvoicesOpen(true);
    };
    window.addEventListener("echo:open-invoices", onOpen as EventListener);
    return () => window.removeEventListener("echo:open-invoices", onOpen as EventListener);
  }, []);

  // iter225 · Auto-center active tab so scrolling the tabbar feels natural
  // (fixes William's "make them scroll around to the other side" complaint
  // — every tab tap smoothly pans the active tab into view).
  const tabbarRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const bar = tabbarRef.current;
    if (!bar) return;
    const active = bar.querySelector(`[data-testid='ecw-tab-${tab}']`) as HTMLElement | null;
    if (!active) return;
    const barRect = bar.getBoundingClientRect();
    const elRect = active.getBoundingClientRect();
    const offset = elRect.left - barRect.left - (barRect.width - elRect.width) / 2;
    bar.scrollTo({ left: bar.scrollLeft + offset, behavior: "smooth" });
  }, [tab]);
  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        if (regs.length > 0) {
          Promise.all(regs.map((r) => r.unregister())).then(() => {
            // Clear any stale caches that the SW left behind
            if ("caches" in window) {
              caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
                .then(() => {
                  // Only reload if we actually nuked something — avoid infinite loops
                  const alreadyReloaded = sessionStorage.getItem("ecw_sw_nuked");
                  if (!alreadyReloaded) {
                    sessionStorage.setItem("ecw_sw_nuked", "1");
                    window.location.reload();
                  }
                });
            }
          });
        }
      }).catch(() => undefined);
    }
  }, []);

  // iter224 · Hide Emergent platform dev bubbles (⌘J · Solve, ECHO ⌘K,
  // ECHO ACTIVITY rail) on mobile standalone routes — they overlap the
  // bottom tab bar and aren't useful to chefs in the field.
  React.useEffect(() => {
    const style = document.createElement("style");
    style.id = "ecw-hide-dev-overlays";
    style.textContent = `
      /* Hide the floating Solve + Echo bubbles that render at the bottom of
         every preview page. Identified via text content since they lack
         stable class names. */
      body > div[class*="fixed"] button,
      body > button[class*="fixed"] {
        /* fallback — individual selectors below are more specific */
      }
    `;
    document.head.appendChild(style);

    const hideFn = () => {
      // Grab ALL fixed-position bottom-anchored nodes except our own tabbar
      document.querySelectorAll<HTMLElement>("*").forEach((el) => {
        if (el.hasAttribute("data-testid") && el.getAttribute("data-testid") === "ecw-tabbar") return;
        // Text-match first
        const txt = (el.textContent || "").trim();
        const isTarget =
          txt === "⌘J · Solve" || txt === "ECHO ⌘K"
          || /^ECHO\s*⌘K$/.test(txt) || /ECHO\s*ACTIVITY/.test(txt);
        if (isTarget) {
          let p: HTMLElement | null = el;
          while (p && p !== document.body) {
            const st = getComputedStyle(p);
            if (st.position === "fixed") {
              p.style.display = "none";
              p.setAttribute("data-ecw-hidden", "1");
              break;
            }
            p = p.parentElement;
          }
        }
      });
      // Also nuke any top-level floating children of <body> that aren't our
      // own router outlet (covers edge case: z-index-max bubble)
      const keep = ["ecw-ops-root"];
      Array.from(document.body.children).forEach((c) => {
        const el = c as HTMLElement;
        if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "LINK") return;
        if (el.id === "root" || el.id === "__next" || el.id === "app") return;
        const hasOurRoot = !!el.querySelector?.("[data-testid='ecw-ops-root']");
        if (hasOurRoot) return;
        const st = getComputedStyle(el);
        if (st.position === "fixed" && !keep.includes(el.id || "")) {
          // Only hide if it contains an Emergent dev marker
          const inner = (el.textContent || "").trim();
          if (inner.length < 60 && (inner.includes("Solve") || inner.includes("ECHO") || inner.includes("⌘"))) {
            el.style.display = "none";
            el.setAttribute("data-ecw-hidden", "1");
          }
        }
      });
    };
    hideFn();
    // Re-run on DOM mutations since Emergent may re-inject these
    const mo = new MutationObserver(() => hideFn());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      style.remove();
      // Restore on unmount so other routes still show them
      document.querySelectorAll("[data-ecw-hidden]").forEach((el) => {
        (el as HTMLElement).style.display = "";
        el.removeAttribute("data-ecw-hidden");
      });
    };
  }, []);

  const onSwitchOutlet = React.useCallback((oid: string) => {
    localStorage.setItem("ecw_outlet_id", oid);
    setOutletId(oid);
  }, []);

  return (
    <div data-testid="ecw-ops-root" style={{
      minHeight: "100vh", paddingBottom: 72,
      background: "linear-gradient(180deg, #0a0e1a 0%, #1a1f2e 100%)",
      color: "#f5efe4",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {!splashDone && <SplashScreen outletId={outletId} onDone={() => setSplashDone(true)} />}
      <header style={{
        padding: "14px 16px 8px", borderBottom: "1px solid rgba(212,175,55,0.15)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#d4af37", fontWeight: 700 }}>ECHO AURION</div>
          <h1 style={{ fontSize: 18, fontWeight: 400, margin: "2px 0 0", color: "#f5efe4" }}>
            {DEPARTMENTS.find((d) => d.id === department)?.label || "Operations"}
          </h1>
        </div>
        <OutletSwitcher outletId={outletId} onSwitch={onSwitchOutlet} />
      </header>
      <WeatherStrip />
      <ConciergeAlertStrip />

      {/* iter248 · Docked RESV card — replaces the floating banner that was
          clipping VIP cards / KPIs / inventory rows on small phones. Lives
          inside the header flow under the department title. Tap to expand. */}
      <div style={{ padding: "0 12px 0" }}>
        <ReservationsBanner outletId={outletId} variant="docked" />
      </div>

      {/* iter235 · Department selector — swap tab content without leaving the shell */}
      <nav data-testid="dept-selector" style={{
        display: "flex", gap: 6, padding: "8px 12px",
        overflowX: "auto", WebkitOverflowScrolling: "touch",
        borderBottom: "1px solid rgba(212,175,55,0.08)",
        scrollbarWidth: "none" as any, msOverflowStyle: "none" as any,
      }}>
        <style>{`[data-testid='dept-selector']::-webkit-scrollbar{display:none;height:0;}`}</style>
        {DEPARTMENTS.map((d) => (
          <button key={d.id} data-testid={`dept-btn-${d.id}`}
            onClick={() => setDepartment(d.id)}
            style={{
              flex: "0 0 auto", padding: "6px 14px", borderRadius: 999,
              background: department === d.id ? "rgba(212,175,55,0.14)" : "transparent",
              border: `1px solid ${department === d.id ? "rgba(212,175,55,0.55)" : "rgba(148,163,184,0.15)"}`,
              color: department === d.id ? "#d4af37" : "#94a3b8",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              letterSpacing: 0.5, whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            <span>{d.icon}</span>
            <span>{d.label}</span>
          </button>
        ))}
      </nav>

      <main data-testid={`ecw-tab-${tab}`}>
        {tab === "dashboard" && <DashboardTab outletId={outletId} onSwitchOutlet={onSwitchOutlet} />}
        {tab === "standup" && <StandupTab inline />}
        {tab === "waste" && <WasteTab token={effectiveToken} />}
        {tab === "linecheck" && <LineCheckTab outletId={outletId} />}
        {tab === "inventory" && <InventoryTab outletId={outletId} />}
        {tab === "orders" && <OrdersTab outletId={outletId} />}
        {tab === "recipes" && <RecipesTab outletId={outletId} />}
        {tab === "photos" && <GalleryTab outletId={outletId} />}
        {tab === "vip" && <VipTrackerTab />}
        {tab === "radio" && <Iter245Tab department={department} />}
        {tab === "schedule" && <ScheduleEditor outletId={outletId} />}
        {tab === "banquet" && <MaestroBanquetTab />}
        {tab === "storage" && <StorageMapTab />}
      </main>

      {/* Bottom tab bar — horizontally scrollable for future expansion.
          Scrollbar hidden (iter224·phase2). */}
      <nav ref={tabbarRef} data-testid="ecw-tabbar" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        display: "flex", flexDirection: "row", overflowX: "auto", overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none" as any,       // Firefox
        msOverflowStyle: "none" as any,      // IE/Edge legacy
        background: "rgba(10,14,26,0.98)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(200,169,126,0.18)",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        zIndex: 999999,
      }}>
        <style>{`
          /* Hide WebKit scrollbar on the tabbar */
          [data-testid='ecw-tabbar']::-webkit-scrollbar { display: none; width: 0; height: 0; }
        `}</style>
        {(() => {
          const allTabs: { key: TabKey; emoji: string; label: string }[] = [
            { key: "dashboard", emoji: "📊", label: "Dash" },
            { key: "standup",   emoji: "📣", label: "Standup" },
            { key: "vip",       emoji: "★",  label: "VIP" },
            { key: "radio",     emoji: "📻", label: "Radio" },
            { key: "schedule",  emoji: "🗓", label: "Schedule" },
            { key: "banquet",   emoji: "🎩", label: "Banquet" },
            { key: "storage",   emoji: "🗺", label: "Storage" },
            { key: "waste",     emoji: "♻️", label: "Waste" },
            { key: "linecheck", emoji: "✅", label: "Line" },
            { key: "inventory", emoji: "📦", label: "Inventory" },
            { key: "orders",    emoji: "🚚", label: "Orders" },
            { key: "recipes",   emoji: "📖", label: "Recipes" },
            { key: "photos",    emoji: "🎨", label: "Gallery" },
          ];
          return allTabs
            .filter((t) => currentDept.visibleTabs.includes(t.key))
            .map((t) => (
              <TabBtn key={t.key} testid={`ecw-tab-${t.key}`}
                emoji={t.emoji} label={t.label}
                active={tab === t.key} onClick={() => setTab(t.key)} />
            ))
            .concat([
              <TabBtn key="__more" testid="ecw-tab-more"
                emoji="⋯" label="More"
                active={false} onClick={() => setMoreOpen(true)} />,
            ] as any);
        })()}
        {/* iter231 · spacer so horizontal scroll carries the last tab past
            the Echo mini button at bottom-right (14px right + ~110px button
            width + 8 padding ≈ 130px reserved). */}
        <div aria-hidden data-testid="ecw-tabbar-spacer"
          style={{ flex: "0 0 130px", height: 1 }} />
      </nav>

      {/* iter231 · Single dark-blue Echo mini button (bottom-right). Short
          tap → quick launch sheet; long press → voice chat. Replaces the
          iter228 gold pill per William's feedback. */}
      <EchoMiniButton outletId={outletId} onSwitchOutlet={onSwitchOutlet} />
      <VipAtDoorWidget />
      {invoicesOpen && (
        <InvoiceModal outletId={outletId} filter={invoiceFilter}
          onClose={() => { setInvoicesOpen(false); setInvoiceFilter(null); }} />
      )}
      {standupOpen && <StandupModal onDismiss={onStandupDismiss} />}
      {moreOpen && (
        <MobileModuleDrawer department={department}
          onClose={() => setMoreOpen(false)} />
      )}
    </div>
  );
}

function TabBtn({ testid, emoji, label, active, onClick }: {
  testid: string; emoji: string; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button data-testid={testid} onClick={onClick} style={{
      flex: "0 0 auto", minWidth: 72,              // iter224·phase2 — fixed min-width so tabs scroll horizontally
      padding: "10px 14px", background: "transparent", border: "none",
      color: active ? "#c8a97e" : "#94a3b8", fontSize: 10,
      fontWeight: active ? 700 : 500, cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      borderTop: active ? "2px solid #c8a97e" : "2px solid transparent",
      whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <span style={{ letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
    </button>
  );
}
