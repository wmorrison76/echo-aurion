/**
 * LUCCCA Unified Command Layer
 * All UI actions that cause side effects MUST go through commands.
 * This prevents fragmented orchestration and bypass paths.
 */

import { osBus } from "@/lib/os-bus";
import { isLegacyAllowed, logLegacyBlocked } from "@/lib/feature-flags";

// ---- Types ----
export type CommandResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ---- Helpers ----
function now() {
  return Date.now();
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Create Event (Unified)
 * UI should call this instead of calling fetch directly from multiple locations.
 */
export async function createEventUnified(
  payload: Record<string, any>,
): Promise<CommandResult<any>> {
  try {
    // Canonical route (already used by CreateEventModal)
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      return {
        ok: false,
        error: `createEventUnified failed: ${res.status} ${msg}`,
      };
    }

    const data = await res.json().catch(() => ({}));

    osBus.emit?.("calendar:event_created", {
      eventId: data?.id ?? data?.eventId ?? uid("event"),
      createdAt: now(),
      source: "commands.createEventUnified",
    });

    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "createEventUnified error" };
  }
}

/**
 * Legacy create event (blocked unless explicitly allowed)
 * Kept for revert safety.
 */
export async function createEventLegacyBlocked(
  payload: Record<string, any>,
): Promise<CommandResult<any>> {
  if (!isLegacyAllowed("ALLOW_LEGACY_EVENT_CREATE_PATH")) {
    logLegacyBlocked(
      "ALLOW_LEGACY_EVENT_CREATE_PATH",
      "commands.createEventLegacyBlocked",
    );
    return {
      ok: false,
      error:
        "Legacy event create path is disabled (Genesis unified orchestration).",
    };
  }

  // If you ever re-enable legacy (not recommended), this is the old path.
  const res = await fetch("/api/events/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    return {
      ok: false,
      error: `legacy create failed: ${res.status} ${msg}`,
    };
  }

  const data = await res.json().catch(() => ({}));

  osBus.emit?.("calendar:event_created", {
    eventId: data?.id ?? data?.eventId ?? uid("event"),
    createdAt: now(),
    source: "commands.createEventLegacyBlocked",
  });

  return { ok: true, data };
}

/**
 * Open Panel (Unified)
 * Always use this for cross-module UI opens.
 */
export function openPanel(
  panelKey: string,
  payload?: any,
  focus: boolean = true,
) {
  osBus.emit?.("ui:open_panel", {
    panelKey,
    payload,
    focus,
    source: "commands.openPanel",
  });
}

/**
 * Emit procurement planning (Unified)
 */
export function emitProcurementPlanGenerated(plan: any) {
  osBus.emit?.("procurement:plan_generated", {
    planId: plan?.planId ?? uid("proc_plan"),
    generatedAt: now(),
    plan,
    source: "commands.emitProcurementPlanGenerated",
  });
}

/**
 * Emit inventory transfer proposal (Unified)
 */
export function emitInventoryTransferProposed(proposal: any) {
  osBus.emit?.("inventory:transfer_proposed", {
    ...proposal,
    source: "commands.emitInventoryTransferProposed",
  });
}

/**
 * Emit journal entry created (Unified)
 */
export function emitAurumJournalEntryCreated(entry: any) {
  osBus.emit?.("aurum:journal_entry_created", {
    ...entry,
    source: "commands.emitAurumJournalEntryCreated",
  });
}
