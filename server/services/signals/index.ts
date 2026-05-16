/**
 * ===========================================================================
 * Signal services — public exports
 * ===========================================================================
 * Layer:    Substrate: Signal Graph
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Re-exports for signal graph services. Consumers should import
 *           from '../signals' rather than the individual files; this gives
 *           a stable surface and lets internal refactors (file moves,
 *           helper extraction) happen without touching every caller.
 * ===========================================================================
 */

export * from './signal-recorder';
export * from './signal-query';
export * from './signal-decay';
