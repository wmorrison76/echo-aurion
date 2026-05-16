/**
 * ===========================================================================
 * Mic state visualization — the orb
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Master doc §5.3: the visual companion to the voice. Orb
 *           breathes during listening, pulses harder when the guest is
 *           speaking, glows when Aurion speaks back. State map is pure —
 *           visual cues only, no copy.
 *
 *           ARIA-live announcements are intentionally omitted: every
 *           voice state is also surfaced by AurionVoiceButton's accessible
 *           label, and a chatty live region during voice would compete
 *           with the actual audio (Tenet 1: silent service).
 * ===========================================================================
 */

import * as React from 'react';
import type { VoiceState } from '../../lib/aurion/voice-state-machine';
import { cn } from '../../lib/utils';

export interface MicStateProps {
  state: VoiceState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP: Record<NonNullable<MicStateProps['size']>, string> = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
};

const STATE_VISUALS: Record<VoiceState, { ring: string; pulse: string; label: string }> = {
  idle: { ring: 'bg-muted', pulse: '', label: 'Voice off' },
  connecting: { ring: 'bg-amber-200 dark:bg-amber-900', pulse: 'animate-pulse', label: 'Connecting' },
  listening: { ring: 'bg-emerald-200 dark:bg-emerald-900', pulse: 'animate-[pulse_2s_ease-in-out_infinite]', label: 'Listening' },
  thinking: { ring: 'bg-sky-200 dark:bg-sky-900', pulse: 'animate-pulse', label: 'Thinking' },
  speaking: { ring: 'bg-primary', pulse: 'animate-[pulse_1s_ease-in-out_infinite]', label: 'Aurion speaking' },
  paused: { ring: 'bg-muted', pulse: '', label: 'Paused' },
  error: { ring: 'bg-rose-200 dark:bg-rose-900', pulse: '', label: 'Voice error' },
};

export const MicState: React.FC<MicStateProps> = ({ state, size = 'md', className }) => {
  const visual = STATE_VISUALS[state];
  return (
    <span
      role="img"
      aria-label={visual.label}
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        SIZE_MAP[size],
        visual.ring,
        visual.pulse,
        className,
      )}
    >
      <span className={cn('rounded-full bg-foreground/80', size === 'sm' ? 'h-1.5 w-1.5' : size === 'md' ? 'h-2.5 w-2.5' : 'h-4 w-4')} />
    </span>
  );
};
