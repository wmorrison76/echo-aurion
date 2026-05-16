/**
 * D13 · Third-Party Module Host
 *
 * Mounts a third-party module in a sandboxed iframe with a
 * postMessage bridge for the small set of permissions the manifest
 * declared and the admin approved. This is the safe-by-default
 * wrap-around: no remote code runs in our DOM, no shared globals,
 * permissions checked on every inbound message.
 *
 * Usage:
 *   <ThirdPartyModuleHost
 *     module={installedModule}
 *     userContext={{ userId, role, tenantId, propertyId }}
 *   />
 *
 * Where `installedModule` is the row returned by GET /registry's
 * `third_party[]` array. The host validates the iframe's origin
 * against `module.origin` on every inbound postMessage.
 */
import React, { useEffect, useRef, useState } from "react";

export interface InstalledThirdPartyModule {
  id: string;
  name: string;
  version: string;
  publisher: string;
  iframe_url: string;
  origin: string;
  permissions: string[];
  ui?: { sidebar_label?: string; icon_url?: string; default_tier?: string } | null;
  enabled: boolean;
}

export interface ThirdPartyUserContext {
  userId?: string;
  role?: string;
  tenantId?: string;
  propertyId?: string;
  userName?: string;
  outletIds?: string[];
}

interface Props {
  module: InstalledThirdPartyModule;
  userContext: ThirdPartyUserContext;
  className?: string;
  /** Called when the module's host bridge logs an event we want to
   *  audit (open:url, write:notifications). */
  onAuditEvent?: (e: { kind: string; payload: unknown }) => void;
}

/**
 * What we hand to the module per its declared+granted permissions.
 * Each permission is a key here; if the permission was not declared,
 * the corresponding fields are stripped before sending.
 */
function buildPermissionedPayload(
  perms: string[],
  ctx: ThirdPartyUserContext,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (perms.includes("read:user_id")) out.user_id = ctx.userId;
  if (perms.includes("read:user_profile")) {
    out.user = { name: ctx.userName, role: ctx.role, tenant_id: ctx.tenantId };
  }
  if (perms.includes("read:outlet_list")) out.outlet_ids = ctx.outletIds || [];
  if (perms.includes("read:property_id")) out.property_id = ctx.propertyId;
  return out;
}

export function ThirdPartyModuleHost({
  module,
  userContext,
  className,
  onAuditEvent,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Listen for the module → host postMessage protocol.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Origin guard — drop anything not from the module's declared
      // origin. This is the primary security boundary.
      if (event.origin !== module.origin) return;
      if (!event.data || typeof event.data !== "object") return;

      const { type, requestId, payload } = event.data as {
        type?: string; requestId?: string; payload?: unknown;
      };
      if (!type) return;

      const post = (responseType: string, body: unknown) => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: responseType, requestId, payload: body },
          module.origin,
        );
      };

      switch (type) {
        case "luccca:hello":
          // The module has loaded and is requesting its handshake.
          post("luccca:welcome", {
            module_id: module.id,
            granted_permissions: module.permissions,
            context: buildPermissionedPayload(module.permissions, userContext),
          });
          setReady(true);
          break;

        case "luccca:request":
          // Generic request. The module is asking for something — we
          // only fulfill if the corresponding permission was granted.
          handleRequest(payload, module, userContext, post, onAuditEvent);
          break;

        default:
          // Unknown message — ignored. We don't echo errors back to
          // a third party because that's a fingerprinting vector.
          break;
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [module, userContext, onAuditEvent]);

  if (!module.enabled) {
    return (
      <div className={className} data-third-party-module={module.id}>
        <p className="text-sm opacity-70">
          {module.name} is installed but disabled.
        </p>
      </div>
    );
  }

  return (
    <div className={className} data-third-party-module={module.id}>
      {err ? (
        <div role="alert" className="text-destructive text-sm p-4">
          {module.name}: failed to load — {err}
        </div>
      ) : null}
      {!ready ? (
        <div className="text-sm opacity-60 p-2">Loading {module.name}…</div>
      ) : null}
      <iframe
        ref={iframeRef}
        title={`${module.publisher} · ${module.name}`}
        src={module.iframe_url}
        // Sandbox: scripts + same-origin enabled because most modules
        // need IndexedDB / fetch to their own origin. Forms + popups
        // disabled. NOT allow-top-navigation — module can't redirect
        // the parent.
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        onError={() => setErr("iframe load error")}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 360,
          border: 0,
          background: "transparent",
        }}
      />
    </div>
  );
}

function handleRequest(
  payload: unknown,
  module: InstalledThirdPartyModule,
  ctx: ThirdPartyUserContext,
  reply: (type: string, body: unknown) => void,
  onAudit?: Props["onAuditEvent"],
) {
  if (!payload || typeof payload !== "object") {
    return reply("luccca:error", { error: "payload required" });
  }
  const req = payload as { method?: string; params?: Record<string, unknown> };
  switch (req.method) {
    case "context":
      // Re-fetch current context (in case the user switched property).
      return reply("luccca:result", buildPermissionedPayload(module.permissions, ctx));

    case "open_url": {
      if (!module.permissions.includes("open:url")) {
        return reply("luccca:error", { error: "permission_denied: open:url" });
      }
      const url = String(req.params?.url ?? "");
      try {
        const u = new URL(url);
        if (u.protocol !== "https:" && u.protocol !== "http:") {
          return reply("luccca:error", { error: "url_scheme_not_allowed" });
        }
        onAudit?.({ kind: "open_url", payload: { module_id: module.id, url } });
        window.open(url, "_blank", "noopener,noreferrer");
        return reply("luccca:result", { ok: true });
      } catch {
        return reply("luccca:error", { error: "url_invalid" });
      }
    }

    case "notify": {
      if (!module.permissions.includes("write:notifications")) {
        return reply("luccca:error", { error: "permission_denied: write:notifications" });
      }
      const text = String(req.params?.text ?? "");
      if (!text) return reply("luccca:error", { error: "text_required" });
      onAudit?.({ kind: "notify", payload: { module_id: module.id, text } });
      // Surface as a transient toast — the host app's toast system
      // is intentionally not coupled here; emit a CustomEvent the
      // app's notification layer can consume.
      try {
        window.dispatchEvent(new CustomEvent("luccca:third-party-notify", {
          detail: { module_id: module.id, text },
        }));
      } catch { /* no-op */ }
      return reply("luccca:result", { ok: true });
    }

    default:
      return reply("luccca:error", { error: `unknown_method: ${req.method}` });
  }
}
