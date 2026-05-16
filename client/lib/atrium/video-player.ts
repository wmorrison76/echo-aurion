/**
 * ===========================================================================
 * Hero video player - silent-by-default ambient loop
 * ===========================================================================
 * Layer:    Atrium
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Loop player for hero assets. Silent default with optional sound toggle. Auto-pauses when off-screen.
 *
 * Pending implementation:
 *   - [ ] Looping playback with seamless transition
 *   - [ ] Silent by default; tap to enable audio
 *   - [ ] IntersectionObserver pauses off-screen videos to save battery
 *   - [ ] Reports view duration as a signal
 *   - [ ] Definition of Done: hero loop plays silently on venue page open, tapping unmutes, scrolling away pauses, signal recorded
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

export interface VideoPlayerOptions {
  url: string;
  silentByDefault: boolean;
  loop: boolean;
  onViewDuration?: (ms: number) => void;
}

export class HeroVideoPlayer {
  constructor(private opts: VideoPlayerOptions) {}

  attach(element: HTMLVideoElement): void {
    throw new Error('Not implemented (Phase 5)');
  }

  setMuted(muted: boolean): void {
    throw new Error('Not implemented (Phase 5)');
  }

  detach(): void {
    throw new Error('Not implemented (Phase 5)');
  }
}
