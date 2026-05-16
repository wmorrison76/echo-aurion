/**
 * D28 · Echo AI³ event log — types.
 *
 * The append-only event log is the system's memory substrate. Per the
 * Echo AI³ Integrated Technical Specification (§3.1):
 *   "Echo AI³ does not compress its memory. Every signal, prediction,
 *    intervention, outcome, dismissal — every meaningful event — is
 *    written to an append-only event log. The log is never edited.
 *    It is never summarized."
 *
 * What this file owns:
 *   - The shape of an EchoEvent row
 *   - The seven event kinds (signal / prediction / intervention /
 *     outcome / dismissal / correction / calibration)
 *   - The four voice registers (guest / staff / operator / pass_dev)
 *   - Tenet 2/7 contract: sensitive types carry expires_at
 *   - Tenet 8 contract: forbidden-sensitivity stored with
 *     surfaceable=false; never returned to operator surfaces
 *
 * What this file does NOT own:
 *   - Compression. There is none. By design.
 *   - Update semantics. Events are immutable.
 *   - Embedding storage. Phase 2 adds embedding columns alongside;
 *     the structured row stays as the source of truth.
 */

/**
 * The seven event kinds, derived from §4.2 (training signal sources)
 * plus the structural events (signal, prediction, intervention) from
 * §3.1's example list.
 */
export type EchoEventKind =
  | "signal"        // raw input observed (POS punch, sensor read,
                    // guest interaction, BEO update, etc.)
  | "prediction"    // Echo's output produced from signals
                    // (forecast row, ranking, intervention candidate)
  | "intervention"  // Echo's recommendation surfaced to staff
                    // (whisper, intervention card)
  | "outcome"       // what actually happened — keyed to a parent
                    // prediction or intervention; the retrospective
                    // signal source per §2.4
  | "dismissal"     // operator dismissed an intervention; carries
                    // the dismissal context for retrospective
  | "correction"    // explicit correction from a senior operator
                    // ("this was wrong, should have done X")
  | "calibration";  // confidence vs. actual accuracy delta;
                    // automatic, continuous (§4.2.5)

/**
 * Voice registers per §1.4 of the doctrine. Every output-producing
 * event is tagged with the register it was authored in. Validation
 * at the API boundary refuses register mismatches — a `staff` register
 * event cannot be served to a guest-facing surface, and vice versa.
 *
 * `pass_dev` is reserved for engineering / diagnostic output and
 * never surfaces outside the dev console.
 */
export type VoiceRegister = "guest" | "staff" | "operator" | "pass_dev";

/**
 * The forbidden-sensitivity flag per Tenet 8. Some signals must be
 * retained for audit (legal hold, regulatory, security investigation)
 * but MUST NEVER be surfaced to operator dashboards or any UI. The
 * contract test in `tests/tenet8.spec` ensures these rows persist
 * with `surfaceable=false` and `expires_at` set.
 */
export type SensitivityClass =
  | "ordinary"     // normal operational data
  | "guest_pii"    // names, room numbers, payment, contact
  | "staff_pii"    // wages, addresses, performance reviews
  | "regulated"    // alcohol service, controlled substance, minors
  | "forbidden";   // surfaceable=false; audit-only

/**
 * Each row in the append-only echo_events collection.
 *
 * The row is born once and never edited. Updates produce NEW rows
 * keyed by parent_event_id (e.g. an outcome row links back to the
 * prediction it's measuring). The retrospective practice (§2.4)
 * queries the log for "all rows under this prediction" rather than
 * looking at a single mutable row.
 */
export interface EchoEvent {
  /** Stable id; never changes. */
  id: string;
  /** When the event was observed (UTC ISO). Used by every index. */
  occurred_at: string;
  /** Tenant scoping (D27). Required. */
  tenant_id: string;

  /** What kind of event this is. */
  kind: EchoEventKind;
  /** Voice register the event content was authored in. Required for
   *  prediction/intervention/correction; optional for raw signal/
   *  outcome/calibration where there's no human-language content. */
  voice_register?: VoiceRegister;

  /** When this event ties back to a prior one (outcome→prediction,
   *  dismissal→intervention, correction→prediction), the link. */
  parent_event_id?: string;

  /** Optional context — everything the system needs to replay this
   *  decision later. The retrospective practice depends on these
   *  being preserved verbatim. */
  context?: {
    outlet_id?: string;
    user_id?: string;
    user_name?: string;
    role?: string;
    surface?: string;          // chronos | myecho | beo | …
    correlation_id?: string;   // ties multiple events from one workflow
    [k: string]: unknown;
  };

  /** Free-form payload — the actual content of the event. For a
   *  prediction this is the model output + confidence. For an
   *  intervention it's the recommended action. For an outcome it's
   *  what actually happened. */
  payload?: Record<string, unknown>;

  /** For predictions: the model's stated confidence (0..1) so the
   *  calibration training signal (§4.2.5) can compare against
   *  actuals when the outcome row arrives. */
  confidence?: number;

  /** Sensitivity class. Drives Tenet 8 enforcement. */
  sensitivity: SensitivityClass;
  /** Tenet 8: when false, the row is auditable but never returned
   *  to any non-pass_dev surface. */
  surfaceable: boolean;
  /** Tenet 2/7: every sensitive type carries an expiry. For the
   *  forbidden class this is set to occurred_at (immediate decay
   *  to "audit-only" status). For ordinary it may be null. */
  expires_at?: string | null;

  /** Author identity (system component, model, or human user). */
  authored_by: {
    kind: "system" | "model" | "human";
    id: string;                   // module name, model id, or user_id
    version?: string;             // model version, code release tag
  };
}

/**
 * Retrospective metadata attached to predictions per §2.4. When a
 * prediction event is recorded, this block is included in `payload`
 * so the Monte Carlo replay can later reconstruct the decision space.
 *
 * The doctrine: "All meaningful predictions log retrospective
 * metadata (inputs, decision features, output with confidence band,
 * outcome, variance, downstream consequence). Without this metadata,
 * retrospective is impossible."
 */
export interface RetrospectiveMetadata {
  /** Inputs the prediction consumed. */
  inputs: Record<string, unknown>;
  /** Decision features the model weighted. */
  decision_features: Record<string, number>;
  /** Confidence band the prediction was published with. */
  confidence_band: { lower: number; upper: number };
  /** Variance vs. actual gets filled in on the matching outcome row. */
}
