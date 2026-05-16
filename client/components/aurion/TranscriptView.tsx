/**
 * ===========================================================================
 * Transcript view — optional visual transcript during voice
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Master doc §5.3 + Tenet 2: transcripts are off by default for
 *           guests; on by default for accessibility profiles. The bridge
 *           emits `transcript-partial` and `transcript-final` events; this
 *           component is a thin renderer that accepts a controlled list of
 *           lines from the speech client. No persistence happens here.
 *
 *           Persistence rule: if the parent route did not mark
 *           transcriptOptIn, the upstream session-manager already prevents
 *           storage. This view never writes anything; it only displays.
 * ===========================================================================
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TranscriptLine {
  speaker: 'guest' | 'aurion';
  text: string;
  isFinal: boolean;
}

export interface TranscriptViewProps {
  sessionId: string;
  lines?: TranscriptLine[];
  /** When true, the component announces final lines via aria-live. */
  accessibilityMode?: boolean;
  className?: string;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  sessionId,
  lines = [],
  accessibilityMode = false,
  className,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div
      ref={containerRef}
      data-session-id={sessionId}
      role="log"
      aria-live={accessibilityMode ? 'polite' : 'off'}
      aria-label="Voice transcript"
      className={cn(
        'max-h-72 overflow-y-auto rounded-md border border-border bg-card p-3 text-sm',
        className,
      )}
    >
      {lines.length === 0 ? (
        <p className="text-xs text-muted-foreground">Transcript will appear here while voice is active.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {lines.map((line, idx) => (
            <li
              key={`${idx}:${line.text.length}`}
              className={cn(
                'leading-snug',
                line.speaker === 'aurion' ? 'text-foreground' : 'text-muted-foreground',
                !line.isFinal && 'opacity-60 italic',
              )}
            >
              <span className="mr-1 text-xs font-medium uppercase tracking-wide">
                {line.speaker === 'aurion' ? 'Aurion' : 'You'}
              </span>
              {line.text}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
