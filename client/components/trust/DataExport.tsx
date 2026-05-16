/**
 * ===========================================================================
 * Data export — GDPR-style portability
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Master doc §8.3 / Tenet 5: "see my data". Generates a
 *           downloadable archive of all data tied to the guest. Phase 2
 *           supports two response shapes from the server:
 *             - { url, status: 'ready' }   — server prepared a URL
 *             - { data, status: 'ready' }  — server returned JSON inline
 *             - { status: 'pending' }      — server queued; check back
 *           The component handles all three.
 *
 *           Inline JSON download: when the server returns data, the
 *           component uses a Blob + downloadable anchor to trigger a
 *           local download. No server-side storage of the export blob.
 * ===========================================================================
 */

import * as React from 'react';
import { requestDataExport, TrustApiError } from '../../lib/trust/api';
import { cn } from '../../lib/utils';

export interface DataExportProps {
  className?: string;
}

export const DataExport: React.FC<DataExportProps> = ({ className }) => {
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleExport(): Promise<void> {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await requestDataExport();
      if (result.status === 'pending') {
        setStatus('Your export is being prepared. Check back in a few minutes.');
        return;
      }
      if (result.url) {
        // Server returned a download URL — open it in a new tab
        window.open(result.url, '_blank', 'noopener');
        setStatus('Download started.');
        return;
      }
      if (result.data !== undefined) {
        // Server returned inline JSON; produce a local download
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `echo-resonance-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('Download saved to your device.');
        return;
      }
      setStatus('Export complete, but the response was empty.');
    } catch (err) {
      setError(err instanceof TrustApiError ? err.message : 'Could not prepare export.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border border-border bg-card p-4',
        className,
      )}
    >
      <div>
        <h3 className="text-sm font-medium text-foreground">Your data</h3>
        <p className="text-xs text-muted-foreground">
          A copy of everything we hold about you, in a portable format. Nothing of yours is locked up here.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={busy}
          className={cn(
            'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors',
            busy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90',
          )}
        >
          {busy ? 'Preparing…' : 'Download my data'}
        </button>
        {status && <span className="text-xs text-muted-foreground">{status}</span>}
      </div>
      {error && (
        <p className="text-xs text-rose-700 dark:text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
