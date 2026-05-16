/**
 * ===========================================================================
 * Voice button — the persistent invocation surface
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Master doc §5.3: a single button. Tap to start, tap to end.
 *           No hold-to-talk by default — that's a competitive-app
 *           ergonomic; hospitality wants a calm tap-toggle. Hold mode
 *           remains available via prop for the staff-whisper context
 *           where directional control matters.
 *
 *           Position 'floating' lands bottom-right; 'inline' renders
 *           in-flow for trip pages and venue actions.
 * ===========================================================================
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { MicState } from './MicState';
import { useAurionVoice } from '../../lib/aurion/use-aurion';
import type { VoiceSession } from '../../../shared/types/aurion';

type SessionContext = VoiceSession['context'];
type ButtonContextProp = SessionContext | 'in-app' | 'in-room' | 'staff-whisper';

const CONTEXT_TO_SESSION: Record<ButtonContextProp, SessionContext> = {
  'in-app': 'in-stay-ambient',
  'in-room': 'in-room-come-alive',
  'staff-whisper': 'staff-whisper',
  'pre-arrival': 'pre-arrival',
  'arrival-handoff': 'arrival-handoff',
  'in-room-come-alive': 'in-room-come-alive',
  'in-stay-ambient': 'in-stay-ambient',
  'departure': 'departure',
  'post-stay-followup': 'post-stay-followup',
};

export interface AurionVoiceButtonProps {
  context: ButtonContextProp;
  voiceProfileId: string;
  guestId?: string;
  staffId?: string;
  position?: 'floating' | 'inline';
  /** Hold-to-talk: only true when callers explicitly need staff-style direction. */
  holdToTalk?: boolean;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: () => void;
  className?: string;
}

export const AurionVoiceButton: React.FC<AurionVoiceButtonProps> = (props) => {
  const {
    context,
    voiceProfileId,
    guestId,
    staffId,
    position = 'floating',
    holdToTalk = false,
    onSessionStart,
    onSessionEnd,
    className,
  } = props;

  const sessionContext = CONTEXT_TO_SESSION[context] ?? 'in-stay-ambient';
  const voice = useAurionVoice({ context: sessionContext, voiceProfileId, guestId, staffId });
  const startedSessionRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (voice.session && voice.session.id !== startedSessionRef.current) {
      startedSessionRef.current = voice.session.id;
      onSessionStart?.(voice.session.id);
    }
    if (!voice.session && startedSessionRef.current !== null) {
      startedSessionRef.current = null;
      onSessionEnd?.();
    }
  }, [voice.session, onSessionStart, onSessionEnd]);

  const active = voice.state !== 'idle' && voice.state !== 'error';
  const label = active ? 'End voice session' : 'Start voice session';

  const handleClick = () => {
    if (holdToTalk) return;
    if (active) {
      void voice.stop();
    } else {
      void voice.start();
    }
  };

  const handleHoldStart = () => {
    if (!holdToTalk) return;
    if (!active) void voice.start();
  };
  const handleHoldEnd = () => {
    if (!holdToTalk) return;
    if (active) void voice.stop();
  };

  const positionalClasses =
    position === 'floating'
      ? 'fixed bottom-6 right-6 z-40 shadow-lg'
      : 'inline-flex';

  return (
    <button
      type="button"
      aria-label={label}
      onClick={handleClick}
      onPointerDown={handleHoldStart}
      onPointerUp={handleHoldEnd}
      onPointerLeave={handleHoldEnd}
      disabled={voice.busy}
      className={cn(
        'h-14 w-14 items-center justify-center rounded-full border border-border bg-card transition-all hover:scale-[1.03] active:scale-95',
        positionalClasses,
        voice.busy && 'opacity-60 cursor-wait',
        className,
      )}
      title={voice.error ?? label}
    >
      <span className="flex items-center justify-center">
        <MicState state={voice.state} size="md" />
      </span>
    </button>
  );
};
