/** iter247 · Mobile Module Drawer — "More" tab.
 *
 * Mirrors desktop sidebar groups on mobile: tap a group → see the modules
 * inside that group. Module access is governed by user profile (department).
 *
 * SECURITY: EchoAurium (P&L accounting) is HARD-BLOCKED on mobile per William.
 * Anything else available on desktop opens here as a webview into the
 * desktop panel route (so saved data stays in one place — true one-source-of-truth).
 */
import React from "react";

const ACCENT = "#d4af37";
const BLOCKED_ON_MOBILE = new Set([
  "echoaurium-pnl",   // accounting / P&L drilldown — financial security
  "echoaurium-gm",    // exec view of the same
  "aurium-gm",
]);

type ModuleGroup = {
  id: string; label: string; icon: string;
  // Whitelist of mobile-safe modules per group:
  modules: { id: string; label: string; icon: string; route: string;
                kind?: "mobile-native" | "desktop-link"; testid: string }[];
};

const GROUPS: ModuleGroup[] = [
  { id: "culinary", label: "Culinary", icon: "🍳", modules: [
    { id: "kitchen-war-room", label: "Kitchen War Room", icon: "🔥",
       route: "/m/ecw#linecheck", kind: "mobile-native", testid: "module-kitchen-war-room" },
    { id: "recipe-builder", label: "Recipe Builder", icon: "📖",
       route: "/m/ecw#recipes", kind: "mobile-native", testid: "module-recipe-builder" },
    { id: "food-gallery", label: "Food Gallery", icon: "🎨",
       route: "/m/ecw#photos", kind: "mobile-native", testid: "module-food-gallery" },
    { id: "waste", label: "ECW · Waste", icon: "♻️",
       route: "/m/ecw#waste", kind: "mobile-native", testid: "module-waste" },
  ]},
  { id: "pastry", label: "Pastry", icon: "🥐", modules: [
    { id: "pastry-dash", label: "Pastry Dashboard", icon: "🥐",
       route: "/m/ecw?dept=pastry", kind: "mobile-native", testid: "module-pastry-dash" },
    { id: "carissa-training", label: "Chef Carissa Training", icon: "💗",
       route: "/?panel=chef-carissa-training", kind: "desktop-link", testid: "module-carissa" },
    { id: "cake-viewer", label: "Cake Viewer · 3D", icon: "🎂",
       route: "/?panel=cake-viewer", kind: "desktop-link", testid: "module-cake-viewer" },
  ]},
  { id: "menu_eng", label: "Menu Engineering", icon: "📊", modules: [
    { id: "menu-design", label: "Menu Design Studio", icon: "🎨",
       route: "/?panel=menu-design-studio", kind: "desktop-link", testid: "module-menu-design" },
    { id: "dish-assembly", label: "Dish Assembly", icon: "🧱",
       route: "/?panel=dish-assembly", kind: "desktop-link", testid: "module-dish-assembly" },
    { id: "plate-costing", label: "Plate Costing", icon: "💰",
       route: "/?panel=plate-costing", kind: "desktop-link", testid: "module-plate-costing" },
    { id: "menu-eng", label: "Menu Engineering", icon: "📈",
       route: "/?panel=menu-engineering", kind: "desktop-link", testid: "module-menu-eng" },
  ]},
  { id: "events", label: "Events & Catering", icon: "🎩", modules: [
    { id: "maestro-bqt", label: "Maestro BQT", icon: "🎩",
       route: "/m/ecw#banquet", kind: "mobile-native", testid: "module-maestro-bqt" },
    { id: "chef-gio", label: "Chef Gio Training", icon: "🍳",
       route: "/?panel=chef-gio-training", kind: "desktop-link", testid: "module-chef-gio" },
  ]},
  { id: "financial", label: "Financial & Procurement", icon: "💵", modules: [
    // Note: NO P&L drill / EchoAurium on mobile per security requirement.
    { id: "purchasing", label: "Purchasing & Receiving", icon: "🛒",
       route: "/m/ecw#orders", kind: "mobile-native", testid: "module-purchasing" },
    { id: "vendor-intel", label: "Vendor & Supplier Intel", icon: "🏷️",
       route: "/?panel=vendor-intel", kind: "desktop-link", testid: "module-vendor-intel" },
    { id: "invoice-ocr", label: "Invoice Intelligence", icon: "🧾",
       route: "/?panel=invoice-ocr", kind: "desktop-link", testid: "module-invoice-ocr" },
  ]},
  { id: "hotel", label: "Hotel Operations", icon: "🛎", modules: [
    { id: "concierge", label: "Staff Concierge", icon: "🛎",
       route: "/m/ecw?launch=concierge", kind: "mobile-native", testid: "module-concierge" },
    { id: "tickets", label: "Tickets", icon: "🎟",
       route: "/m/ecw?launch=tickets", kind: "mobile-native", testid: "module-tickets" },
    { id: "hskp", label: "Housekeeping", icon: "🛏",
       route: "/?panel=hskp-command", kind: "desktop-link", testid: "module-hskp" },
    { id: "retail", label: "Retail Operations", icon: "🛍",
       route: "/?panel=retail-ops", kind: "desktop-link", testid: "module-retail" },
  ]},
  { id: "intel", label: "Intelligence & Reports", icon: "📊", modules: [
    { id: "reports-hub", label: "Reports Hub · One Source of Truth", icon: "📋",
       route: "/?panel=reports-hub", kind: "desktop-link", testid: "module-reports-hub" },
    { id: "weather", label: "Weather & Demand", icon: "☁️",
       route: "/m/ecw?launch=weather", kind: "mobile-native", testid: "module-weather" },
  ]},
];

export function MobileModuleDrawer({ onClose, department }:
                                            { onClose: () => void; department: string }) {
  const [openGroup, setOpenGroup] = React.useState<string | null>(() =>
    localStorage.getItem("ecw_more_lastgroup") || null);

  React.useEffect(() => {
    if (openGroup) localStorage.setItem("ecw_more_lastgroup", openGroup);
  }, [openGroup]);

  function pickModule(m: any) {
    if (BLOCKED_ON_MOBILE.has(m.id)) {
      alert("This module is restricted on mobile for security. Open on desktop.");
      return;
    }
    if (m.kind === "desktop-link") {
      // Open desktop panel via deep link (panel param is honored by RootShell)
      window.location.href = m.route;
    } else {
      // Mobile-native: navigate within /m/ecw
      window.location.href = m.route;
    }
    onClose();
  }

  // Filter groups by department where helpful (Pastry chef can still access all)
  const visibleGroups = GROUPS.filter((g) => {
    if (department === "pastry") return ["pastry", "menu_eng", "culinary", "events", "intel", "hotel"].includes(g.id);
    return true;
  });

  return (
    <div data-testid="mobile-module-drawer" style={{
      position: "fixed", inset: 0, zIndex: 1000000,
      background: "rgba(4,6,13,0.97)", backdropFilter: "blur(12px)",
      overflowY: "auto", paddingBottom: 90,
    }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 1, padding: "16px 18px",
        background: "rgba(4,6,13,0.94)", borderBottom: `1px solid rgba(212,175,55,0.18)`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 4, color: ACCENT, fontWeight: 700 }}>
            ECHO AURION · MORE
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: 22, fontWeight: 200, margin: "2px 0 0",
                          letterSpacing: -0.3, color: "#f5efe4" }}>
            All modules
          </h2>
        </div>
        <button data-testid="module-drawer-close" onClick={onClose} style={{
          padding: "6px 14px", borderRadius: 999, fontSize: 11,
          background: "rgba(255,255,255,0.04)", color: "#94a3b8",
          border: "1px solid rgba(255,255,255,0.1)", fontWeight: 600,
        }}>✕ CLOSE</button>
      </header>
      <div style={{ padding: 14 }}>
        {visibleGroups.map((g) => {
          const open = openGroup === g.id;
          return (
            <section key={g.id} data-testid={`module-group-${g.id}`} style={{ marginBottom: 10 }}>
              <button onClick={() => setOpenGroup(open ? null : g.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: 14, borderRadius: 8, background: open ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${open ? `${ACCENT}66` : "rgba(255,255,255,0.06)"}`,
                color: "#f5efe4", fontFamily: "inherit", textAlign: "left", cursor: "pointer",
              }}>
                <div style={{ fontSize: 24 }}>{g.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</div>
                  <div style={{ fontSize: 10, color: "#5a554d", marginTop: 2 }}>
                    {g.modules.length} modules
                  </div>
                </div>
                <div style={{ color: ACCENT, fontSize: 14 }}>{open ? "▾" : "▸"}</div>
              </button>
              {open && (
                <div style={{ display: "grid", gap: 6, marginTop: 6,
                                paddingLeft: 12, gridTemplateColumns: "1fr 1fr" }}>
                  {g.modules.map((m) => {
                    const blocked = BLOCKED_ON_MOBILE.has(m.id);
                    return (
                      <button key={m.id} data-testid={m.testid}
                        disabled={blocked} onClick={() => pickModule(m)}
                        style={{
                          padding: 12, borderRadius: 8, textAlign: "left",
                          background: blocked ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${blocked ? "#ef444466" : "rgba(255,255,255,0.06)"}`,
                          color: blocked ? "#ef4444" : "#f5efe4",
                          fontFamily: "inherit", cursor: blocked ? "not-allowed" : "pointer",
                          opacity: blocked ? 0.6 : 1,
                        }}>
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>
                          {m.label}
                        </div>
                        <div style={{ fontSize: 9, marginTop: 4,
                                          color: blocked ? "#ef4444" :
                                                       m.kind === "desktop-link" ? "#94a3b8" : ACCENT,
                                          textTransform: "uppercase", letterSpacing: 1 }}>
                          {blocked ? "🔒 Desktop only" :
                              m.kind === "desktop-link" ? "↗ Desktop view" : "● Native"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        <div style={{
          padding: 14, marginTop: 18, borderRadius: 8,
          background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)",
          fontSize: 10, color: "#ef4444", lineHeight: 1.5,
        }}>
          🔒 <strong>EchoAurium (P&L accounting)</strong> is restricted on mobile for security
          (financial data sandboxed to desktop). Open on a desktop session.
        </div>
      </div>
    </div>
  );
}
