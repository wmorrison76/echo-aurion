/** iter251 · UserAvatarMenu — fixed top-right pill with current user, profile
 *  switcher, notifications bell, logout, AND notification-prefs settings.
 *  iter253: Uses Echo_B/F/M/R avatar photos (set via Settings → Avatar).
 *  Briefing & Review pills only show contextually.
 */
import React from "react";
import { useAuth } from "@/lib/auth-context";
import { clearAllPanelPersistence } from "@/lib/panel-persistence";
import PaystubsPanel from "@/components/site/PaystubsPanel";
import { openPanel } from "@/lib/open-panel";

const API = (window as any).location.origin;
const BASE = `${API}/api/auth/jwt`;

const ROLE_COLORS: Record<string, string> = {
  "regional-director": "#fbbf24", director: "#8b5cf6", admin: "#d4af37",
  "exec-dir-finance": "#22d3ee",
  "general-manager": "#10b981",
  "executive-chef": "#ef4444", "sous-chef": "#f59e0b",
  "pastry-chef": "#ec4899", "fb-director": "#6366f1",
  "dining-room-manager": "#3b82f6", "events-manager": "#a855f7",
  controller: "#06b6d4", "spa-manager": "#84cc16",
  "dir-engineering": "#94a3b8", "purchasing-manager": "#0ea5e9",
  staff: "#10b981", default: "#94a3b8",
};

// iter253 · Echo brand avatars (Bold/Fresh/Modern/Radiant)
const ECHO_AVATARS: Record<string, string> = {
  Echo_B: "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F39958189ec2246e4be04ec1175c785ab?format=webp&width=400",
  Echo_F: "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2Fcb864730c3ee4d1e958b4fab1ed482c8?format=webp&width=400",
  Echo_M: "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2Ff3fc2b0a09db4996942ac5450acf92b0?format=webp&width=400",
  Echo_R: "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2Ff3ac2b1108c24085972e35e79ae182a5?format=webp&width=400",
};
const AVATAR_NAMES: Record<string, string> = {
  Echo_B: "Bold", Echo_F: "Fresh", Echo_M: "Modern", Echo_R: "Radiant",
};

function resolveAvatarUrl(userPicture?: string | null): string | null {
  if (typeof window === "undefined") return null;
  // iter256 · Honour the user's server-side `picture` first, then localStorage,
  // then fallback to Echo_B brand avatar.
  if (userPicture && ECHO_AVATARS[userPicture]) return ECHO_AVATARS[userPicture];
  if (userPicture && userPicture.startsWith("http")) return userPicture;
  const stored = localStorage.getItem("user-avatar") || "Echo_B";
  if (ECHO_AVATARS[stored]) return ECHO_AVATARS[stored];
  if (stored.startsWith("data:image/")) return stored;
  if (stored.startsWith("avatar-")) return `/api/avatar/file/${stored}`;
  return ECHO_AVATARS.Echo_B;
}

function initials(name: string): string {
  return (name || "?").trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

const EVENT_LABELS: Record<string, string> = {
  approval_pending: "Approval needed (you're the approver)",
  approval_decision: "Decision on my submission",
  po_received: "Purchase order received",
  shift_swap_requested: "Shift swap requested",
  shift_swap_decision: "Shift swap decision",
  callout_filed: "Call-out filed",
  huddle_posted: "Pre-shift huddle posted",
  vip_arrival: "VIP arrival",
  save_the_ticket: "Save-the-ticket alert",
  tonights_playbook: "Tonight's playbook (4 pm)",
};
const CHANNEL_LABELS: Record<string, string> = {
  in_app: "In-app", email: "Email", text: "Text", push: "Push",
};

export default function UserAvatarMenu() {
  const { user, logout, refresh } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifs, setNotifs] = React.useState<any[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [briefing, setBriefing] = React.useState<any>(null);
  const [loadingBriefing, setLoadingBriefing] = React.useState(false);
  const [showPrefs, setShowPrefs] = React.useState(false);
  const [showPaystubs, setShowPaystubs] = React.useState(false);
  const [pendingApprovals, setPendingApprovals] = React.useState(0);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [avatarSize, setAvatarSize] = React.useState<number>(() => {
    const v = parseInt(localStorage.getItem("avatar-size") || "32", 10);
    return Number.isFinite(v) ? Math.max(24, Math.min(56, v)) : 32;
  });

  React.useEffect(() => {
    setAvatarUrl(resolveAvatarUrl((user as any)?.picture));
    const onChange = () => setAvatarUrl(resolveAvatarUrl((user as any)?.picture));
    window.addEventListener("avatar-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("avatar-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [user]);

  React.useEffect(() => {
    if (!open || profiles.length) return;
    fetch(`${BASE}/profiles`, { credentials: "include" })
      .then(r => r.json()).then(d => setProfiles(d.rows || []));
  }, [open, profiles.length]);

  React.useEffect(() => {
    if (!user) return;
    const load = () => {
      fetch(`${API}/api/myecho/notifications`, {
        credentials: "include", headers: { "X-User-Id": user.id },
      }).then(r => r.ok ? r.json() : { rows: [], unread_count: 0 })
        .then(d => { setNotifs(d.rows || []); setUnread(d.unread_count || 0); })
        .catch(() => undefined);
      // pending approvals count for the Review pill
      fetch(`${API}/api/approvals/banner?for_user=${user.id}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(d => setPendingApprovals(d.count || 0))
        .catch(() => undefined);
    };
    load();
    const t = setInterval(load, 30_000);
    const onUpdate = () => load();
    window.addEventListener("approvals:refresh", onUpdate);
    return () => { clearInterval(t); window.removeEventListener("approvals:refresh", onUpdate); };
  }, [user]);

  async function switchTo(uid: string) {
    // iter257 · Persist switch via COOKIE (survives reload + PWA service workers)
    // and also localStorage as a fallback header injector.
    try {
      const isPreview = (window.location.hostname || "").includes("preview.emergentagent.com")
        || (window.location.hostname || "").includes("localhost");
      const params = new URLSearchParams(window.location.search);
      const dev = isPreview || params.get("devAuth") === "1";
      if (dev) {
        // 1y cookie, path=/ so backend reads it on every request
        const oneYear = 60 * 60 * 24 * 365;
        document.cookie = `echo_dev_user=${encodeURIComponent(uid)};path=/;max-age=${oneYear};SameSite=Lax`;
        document.cookie = `echo_dev_auth=1;path=/;max-age=${oneYear};SameSite=Lax`;
        localStorage.setItem("dev-user-override", uid);
        setOpen(false);
        // Wipe the prior user's panel layout (both localStorage + IndexedDB)
        // before reloading so the next signed-in user opens a clean shell.
        await clearAllPanelPersistence();
        // Hard reload to ensure ALL components (including SW-cached fetches) refetch
        window.location.reload();
        return;
      }
    } catch { /* ignore */ }
    // Real JWT switch (admin/director only)
    const r = await fetch(`${BASE}/switch-profile`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: uid }),
    });
    if (r.ok) {
      await refresh();
      setOpen(false);
      await clearAllPanelPersistence();
      window.location.reload();
    }
  }

  async function handleLogout() {
    // iter257 · Clear dev override cookie + localStorage on logout
    try {
      localStorage.removeItem("dev-user-override");
      document.cookie = "echo_dev_user=;path=/;max-age=0;SameSite=Lax";
      document.cookie = "echo_dev_auth=;path=/;max-age=0;SameSite=Lax";
    } catch { /* */ }
    await logout();
    await clearAllPanelPersistence();
    window.location.href = "/login";
  }

  async function fetchBriefing() {
    setLoadingBriefing(true);
    const r = await fetch(`${API}/api/briefing/today`, { credentials: "include" });
    setBriefing(await r.json());
    setLoadingBriefing(false);
  }

  async function markRead(id: string) {
    if (!user) return;
    await fetch(`${API}/api/myecho/notifications/${id}/read`, {
      method: "POST", credentials: "include", headers: { "X-User-Id": user.id },
    });
    setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    setUnread(u => Math.max(0, u - 1));
  }

  function openReviewPanel() {
    // iter254 · Open Purchasing & Receiving with the Approvals tab pre-selected
    window.dispatchEvent(new CustomEvent("open-panel",
      { detail: { id: "purchasing-receiving", initialPage: "approvals" } }));
  }

  function changeAvatarSize(delta: number) {
    setAvatarSize((s) => {
      const next = Math.max(24, Math.min(56, s + delta));
      localStorage.setItem("avatar-size", String(next));
      return next;
    });
  }

  if (!user) {
    // iter256 · Render a sign-in pill instead of returning null so the
    // top-right is never visually empty.
    return (
      <div data-testid="user-avatar-menu" style={{
      position: "fixed", top: 14, right: 16, zIndex: 2147483647,
        display: "flex", gap: 8, alignItems: "center",
        pointerEvents: "auto",
      }}>
        <a href="/login" data-testid="topbar-signin-link"
          style={{
            padding: "8px 16px", borderRadius: 999,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(212,175,55,0.5)", color: "#d4af37",
            cursor: "pointer", fontFamily: "inherit", fontSize: 11,
            fontWeight: 800, letterSpacing: 1.5, textDecoration: "none",
          }}>
          ✦ SIGN IN
        </a>
      </div>
    );
  }
  const color = ROLE_COLORS[user.role] || ROLE_COLORS.default;

  return (
    <div data-testid="user-avatar-menu" style={{
      position: "fixed", top: 14, right: 16, zIndex: 2147483647,    // iter263 · moved up per William
      display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end",
      pointerEvents: "auto",
    }}>
      {/* Top row: Briefing · Notif · Avatar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button data-testid="topbar-briefing-btn" onClick={fetchBriefing}
          style={pillBtn} title="Daily AI Briefing">
          <span style={{ fontSize: 12 }}>📋</span>
          <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>BRIEFING</span>
        </button>

        <button data-testid="topbar-notif-btn"
          onClick={() => setNotifOpen(v => !v)} style={{ ...pillBtn, position: "relative" }}>
          🔔
          {unread > 0 && <span data-testid="topbar-notif-unread" style={badgeStyle("#ef4444")}>{unread}</span>}
        </button>

        {/* Avatar pill */}
        <button data-testid="topbar-avatar-btn"
          onClick={() => setOpen(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "3px 12px 3px 3px", borderRadius: 999,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
            border: `1px solid ${color}88`, color: "#f5efe4",
            cursor: "pointer", fontFamily: "inherit",
          }}>
          {avatarUrl ? (
            <img data-testid="topbar-avatar-img" src={avatarUrl} alt={user.name}
              style={{
                width: avatarSize, height: avatarSize, borderRadius: "50%",
                objectFit: "cover", border: `2px solid ${color}`,
                background: "#04060d",
              }} />
          ) : (
            <span data-testid="topbar-avatar-initials" style={{
              width: avatarSize, height: avatarSize, borderRadius: "50%",
              background: color, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: avatarSize * 0.36,
              fontWeight: 700, color: "#04060d",
            }}>{initials(user.name)}</span>
          )}
          <span style={{ fontSize: 11, lineHeight: 1.2, textAlign: "left" }}>
            <div style={{ fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
              {(user.role || "").replace(/-/g, " ")}
            </div>
          </span>
        </button>
      </div>

      {/* Review pill — only when there are approvals waiting on this user */}
      {pendingApprovals > 0 && (
        <button data-testid="topbar-review-pill" onClick={openReviewPanel}
          style={{
            padding: "6px 14px", borderRadius: 999,
            background: "linear-gradient(180deg, rgba(212,175,55,0.28), rgba(212,175,55,0.08))",
            border: "1px solid rgba(212,175,55,0.7)",
            backdropFilter: "blur(10px)", color: "#d4af37",
            fontSize: 10, letterSpacing: 1.5, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 6px 20px rgba(212,175,55,0.18)",
          }}>
          {pendingApprovals} INVOICE{pendingApprovals === 1 ? "" : "S"} TO REVIEW →
        </button>
      )}

      {/* Avatar dropdown */}
      {open && (
        <div data-testid="avatar-dropdown" style={dropdownStyle}>
          <Section label="SIGNED IN AS" />
          <div style={{
            marginBottom: 12, padding: 10, borderRadius: 8,
            background: `${color}11`, border: `1px solid ${color}55`,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{user.email}</div>
            <div style={{ fontSize: 9, marginTop: 6, color, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
              {user.role} · {user.kind}{user.title ? ` · ${user.title}` : ""}
            </div>
          </div>

          {/* Avatar size + change */}
          <Section label="AVATAR" />
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <button data-testid="avatar-size-down" onClick={() => changeAvatarSize(-4)}
              style={miniBtn}>−</button>
            <span style={{ fontSize: 10, color: "#94a3b8", minWidth: 30, textAlign: "center" }}>
              {avatarSize}px
            </span>
            <button data-testid="avatar-size-up" onClick={() => changeAvatarSize(4)}
              style={miniBtn}>+</button>
            <button data-testid="avatar-change"
              onClick={() => window.dispatchEvent(new CustomEvent("open-settings",
                { detail: { tab: "avatar" } }))}
              style={{ ...miniBtn, marginLeft: "auto", padding: "4px 10px" }}>
              CHANGE
            </button>
          </div>

          {/* MyEcho · Paystubs (gated by PIN re-auth) — matches help-agent tour target `myecho-paystubs-link` */}
          <button data-testid="myecho-paystubs-link" onClick={() => { setShowPaystubs(true); setOpen(false); }}
            style={{
              width: "100%", marginBottom: 8, padding: "8px 10px",
              borderRadius: 6, background: "rgba(200,169,126,0.08)",
              color: "#c8a97e", border: "1px solid rgba(200,169,126,0.3)",
              cursor: "pointer", fontSize: 11, fontWeight: 700,
              letterSpacing: 1, fontFamily: "inherit",
            }}>
            🔒 MYECHO · PAYSTUBS &amp; TAX DOCS
          </button>

          {/* Guest Companion · QR / Magic-Link (iter 5.6) — surfaces the existing
              concierge-mobile-admin panel from the avatar, per audit recommendation. */}
          <button data-testid="profile-companion-link"
            onClick={() => {
              setOpen(false);
              openPanel("concierge-mobile-admin");
            }}
            style={{
              width: "100%", marginBottom: 8, padding: "8px 10px",
              borderRadius: 6, background: "rgba(200,169,126,0.08)",
              color: "#c8a97e", border: "1px solid rgba(200,169,126,0.3)",
              cursor: "pointer", fontSize: 11, fontWeight: 700,
              letterSpacing: 1, fontFamily: "inherit",
            }}>
            📱 GUEST COMPANION · MINT QR / MAGIC-LINK
          </button>

          {/* Notification prefs button */}
          <button data-testid="open-notif-prefs" onClick={() => setShowPrefs(true)}
            style={{
              width: "100%", marginBottom: 12, padding: "8px 10px",
              borderRadius: 6, background: "rgba(99,102,241,0.1)",
              color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)",
              cursor: "pointer", fontSize: 11, fontWeight: 700,
              letterSpacing: 1, fontFamily: "inherit",
            }}>
            ✦ NOTIFICATION SETTINGS · EMAIL · TEXT · PUSH
          </button>

          <Section label="SWITCH PROFILE" />
          <div style={{ marginBottom: 14, maxHeight: 240, overflowY: "auto" }}>
            {profiles.length === 0 && <div style={{ color: "#5a554d", fontSize: 11, padding: 8 }}>Loading…</div>}
            {profiles.map((p, idx) => {
              const c = ROLE_COLORS[p.role] || ROLE_COLORS.default;
              const me = p.id === user.id;
              const picKey = p.picture as string | undefined;
              const picUrl = picKey && ECHO_AVATARS[picKey] ? ECHO_AVATARS[picKey]
                : (picKey && picKey.startsWith("http") ? picKey : null);
              return (
                <button key={`${p.id}-${idx}`} data-testid={`switch-profile-${p.id}`}
                  onClick={() => !me && switchTo(p.id)} disabled={me}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "8px 10px", marginBottom: 3, borderRadius: 6,
                    background: me ? "rgba(212,175,55,0.1)" : "transparent",
                    border: `1px solid ${me ? `${c}66` : "transparent"}`,
                    color: "#f5efe4", cursor: me ? "default" : "pointer",
                    textAlign: "left", fontFamily: "inherit", opacity: me ? 0.7 : 1,
                  }}>
                  {picUrl ? (
                    <img src={picUrl} alt={p.name}
                      data-testid={`switch-profile-img-${p.id}`}
                      style={{
                        width: 28, height: 28, borderRadius: "50%",
                        objectFit: "cover", border: `2px solid ${c}`,
                        background: "#04060d", flexShrink: 0,
                      }} />
                  ) : (
                    <span style={{
                      width: 28, height: 28, borderRadius: "50%", background: c,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: "#04060d", flexShrink: 0,
                    }}>{initials(p.name)}</span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {(p.role || "").replace(/-/g, " ")}
                    </div>
                  </div>
                  {me && <span style={{ fontSize: 9, color: "#d4af37" }}>● HERE</span>}
                </button>
              );
            })}
          </div>
          <button data-testid="topbar-logout" onClick={handleLogout} style={signOutStyle}>
            SIGN OUT
          </button>
        </div>
      )}

      {/* Notifications drawer */}
      {notifOpen && (
        <div data-testid="notif-drawer" style={notifDrawerStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#d4af37", fontWeight: 700 }}>NOTIFICATIONS</div>
            <button onClick={() => setNotifOpen(false)} style={closeBtn}>×</button>
          </div>
          {notifs.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#5a554d", fontSize: 11 }}>
            All caught up.
          </div>}
          {notifs.map(n => (
            <div key={n.id} data-testid={`topbar-notif-${n.id}`}
              onClick={() => !n.read && markRead(n.id)}
              style={{
                padding: 10, borderRadius: 8, marginBottom: 4,
                background: n.read ? "rgba(255,255,255,0.02)" : "rgba(212,175,55,0.05)",
                border: `1px solid ${n.read ? "transparent" : "rgba(212,175,55,0.18)"}`,
                cursor: n.read ? "default" : "pointer", opacity: n.read ? 0.6 : 1,
              }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{n.title}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{n.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* Notification prefs modal */}
      {showPrefs && <NotifPrefsModal userId={user.id} role={user.role}
        onClose={() => setShowPrefs(false)} />}

      {/* Briefing modal */}
      {(briefing || loadingBriefing) && (
        <div data-testid="briefing-modal" onClick={() => setBriefing(null)}
          style={modalOverlay}>
          <div onClick={e => e.stopPropagation()} style={{
            ...modalContent, border: `1px solid ${color}55`,
            boxShadow: `0 20px 60px ${color}22`,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 4, color: "#d4af37", fontWeight: 700 }}>
              DAILY AI BRIEFING · {(briefing?.role || user.role).toUpperCase()} VIEW
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                            fontSize: 28, fontWeight: 200, margin: "8px 0 18px",
                            letterSpacing: -0.5 }}>Today at the resort</h2>
            {loadingBriefing && <div style={{ padding: 30, color: "#94a3b8", textAlign: "center" }}>
              ✨ Claude is analyzing today's data…
            </div>}
            {briefing && (
              <>
                <div data-testid="briefing-narrative" style={{
                  fontSize: 14, lineHeight: 1.7, color: "#f5efe4",
                  whiteSpace: "pre-wrap", padding: 16, borderRadius: 8,
                  background: "rgba(212,175,55,0.04)",
                  border: "1px solid rgba(212,175,55,0.2)", marginBottom: 14,
                }}>{briefing.narrative}</div>
                <div style={{ marginTop: 14, fontSize: 9, color: "#5a554d", textAlign: "center" }}>
                  Generated {briefing.generated_at ? new Date(briefing.generated_at).toLocaleTimeString() : ""}
                </div>
              </>
            )}
            <button onClick={() => setBriefing(null)} style={closeModalBtn}>CLOSE</button>
          </div>
        </div>
      )}

      {/* Paystubs & Tax Docs · PIN-gated modal */}
      {showPaystubs && (
        <PaystubsPanel
          userId={user.id}
          userName={user.name}
          onClose={() => setShowPaystubs(false)}
        />
      )}
    </div>
  );
}

/* ─────────── Notification Prefs Modal ─────────── */
function NotifPrefsModal({ userId, role, onClose }: { userId: string; role: string; onClose: () => void }) {
  const [prefs, setPrefs] = React.useState<Record<string, string[]>>({});
  const [eventKeys, setEventKeys] = React.useState<string[]>([]);
  const [channelKeys, setChannelKeys] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`${API}/api/notif-prefs/${userId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setPrefs(d.prefs || {});
        setEventKeys(d.event_keys || Object.keys(EVENT_LABELS));
        setChannelKeys(d.channel_keys || Object.keys(CHANNEL_LABELS));
      });
  }, [userId]);

  function toggle(event: string, channel: string) {
    setPrefs(p => {
      const cur = p[event] || [];
      const next = cur.includes(channel) ? cur.filter(c => c !== channel) : [...cur, channel];
      return { ...p, [event]: next };
    });
  }

  async function save() {
    setSaving(true);
    await fetch(`${API}/api/notif-prefs/${userId}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, prefs }),
    });
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <div data-testid="notif-prefs-modal" onClick={onClose} style={modalOverlay}>
      <div onClick={e => e.stopPropagation()} style={{
        ...modalContent, width: "min(720px, 95%)",
        border: "1px solid rgba(99,102,241,0.4)",
      }}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: "#a5b4fc", fontWeight: 700 }}>
          NOTIFICATION PREFERENCES · {role.toUpperCase()}
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: 24, fontWeight: 200, margin: "6px 0 16px" }}>
          How would you like to be alerted?
        </h2>
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 6,
                       background: "rgba(99,102,241,0.05)",
                       border: "1px solid rgba(99,102,241,0.18)",
                       fontSize: 11, color: "#cbd5e1", lineHeight: 1.5 }}>
          <b style={{ color: "#a5b4fc" }}>Cascade:</b> some events fan out to your team
          automatically — e.g. when an Executive Chef's PO is received, the Sous Chef is
          also notified by text. Defaults are smart per role; uncheck anything you don't want.
        </div>
        <div style={{ overflowX: "auto", marginBottom: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)",
                             color: "#94a3b8" }}>
                <th style={{ textAlign: "left", padding: "8px 10px",
                              fontSize: 9, letterSpacing: 1.5, fontWeight: 700 }}>EVENT</th>
                {channelKeys.map(c => (
                  <th key={c} style={{ textAlign: "center", padding: "8px 10px",
                                         fontSize: 9, letterSpacing: 1.5, fontWeight: 700 }}>
                    {CHANNEL_LABELS[c] || c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eventKeys.map(ev => (
                <tr key={ev} data-testid={`prefs-row-${ev}`}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px", color: "#cbd5e1" }}>
                    {EVENT_LABELS[ev] || ev}
                  </td>
                  {channelKeys.map(ch => {
                    const on = (prefs[ev] || []).includes(ch);
                    return (
                      <td key={ch} style={{ textAlign: "center", padding: "6px 10px" }}>
                        <input type="checkbox" checked={on}
                          data-testid={`prefs-${ev}-${ch}`}
                          onChange={() => toggle(ev, ch)}
                          style={{ width: 16, height: 16, accentColor: "#a5b4fc",
                                    cursor: "pointer" }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#5a554d" }}>
            {savedAt ? `Saved ${savedAt}` : ""}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={closeModalBtn}>CLOSE</button>
            <button data-testid="prefs-save" onClick={save} disabled={saving}
              style={{
                padding: "10px 22px", borderRadius: 8,
                background: "rgba(99,102,241,0.18)", color: "#a5b4fc",
                border: "1px solid rgba(99,102,241,0.5)", cursor: "pointer",
                fontSize: 11, fontWeight: 800, letterSpacing: 1.5,
                fontFamily: "inherit",
              }}>{saving ? "SAVING…" : "SAVE PREFERENCES"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Styles ─────────── */
const Section: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ fontSize: 9, letterSpacing: 3, color: "#d4af37",
                  fontWeight: 700, marginBottom: 8 }}>{label}</div>
);

const pillBtn: React.CSSProperties = {
  padding: "5px 11px", borderRadius: 999,
  background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
  // iter 5.6 · brand gold-on-black to match DesktopTaskbar + EchoHelpMascot
  border: "1px solid rgba(200,169,126,0.35)", color: "#f5efe4",
  cursor: "pointer", fontFamily: "inherit", fontSize: 12,
};
const miniBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, padding: 0,
  background: "rgba(0,0,0,0.5)", color: "#c8a97e",
  border: "1px solid rgba(200,169,126,0.35)", cursor: "pointer",
  fontFamily: "inherit", fontSize: 12, fontWeight: 700,
};
const badgeStyle = (bg: string): React.CSSProperties => ({
  position: "absolute", top: -4, right: -4, background: bg,
  color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 999,
  padding: "1px 5px", minWidth: 16, textAlign: "center",
});
const dropdownStyle: React.CSSProperties = {
  position: "absolute", top: 56, right: 0, width: 320,
  background: "rgba(8,12,20,0.96)", backdropFilter: "blur(14px)",
  border: "1px solid rgba(200,169,126,0.35)", borderRadius: 12,
  padding: 14, color: "#f5efe4", maxHeight: "80vh", overflowY: "auto",
  boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
};
const notifDrawerStyle: React.CSSProperties = {
  position: "absolute", top: 56, right: 100, width: 380,
  background: "rgba(8,12,20,0.96)", backdropFilter: "blur(14px)",
  border: "1px solid rgba(200,169,126,0.35)", borderRadius: 12,
  padding: 14, color: "#f5efe4", maxHeight: "80vh", overflowY: "auto",
  boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
};
const closeBtn: React.CSSProperties = {
  background: "transparent", border: 0, color: "#94a3b8",
  cursor: "pointer", fontSize: 18,
};
const signOutStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  background: "rgba(239,68,68,0.1)", color: "#ef4444",
  border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer",
  fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "inherit",
};
const modalOverlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
  backdropFilter: "blur(8px)", zIndex: 999999,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modalContent: React.CSSProperties = {
  width: "min(640px, 95%)", maxHeight: "85vh", overflowY: "auto",
  padding: 28, background: "linear-gradient(180deg, #0c1018 0%, #04060d 100%)",
  borderRadius: 14, color: "#f5efe4",
};
const closeModalBtn: React.CSSProperties = {
  marginTop: 12, padding: "10px 22px", borderRadius: 8,
  background: "rgba(212,175,55,0.1)", color: "#d4af37",
  border: "1px solid rgba(212,175,55,0.4)", cursor: "pointer",
  fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "inherit",
};
