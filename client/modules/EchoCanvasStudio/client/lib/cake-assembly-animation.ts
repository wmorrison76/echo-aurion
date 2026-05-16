/**
 * Cake Assembly Animation Timeline
 * Manages the sequenced animation of cake layer assembly
 * Supports tier rise, frosting spread, and filling insertion animations
 */

export type AnimationType = "tier-rise" | "frosting-spread" | "filling-insert";

export interface AnimationKeyframe {
  time: number; // milliseconds from start
  property: string; // e.g., "position.y", "scale.x", "opacity"
  value: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

export interface AnimationTrack {
  id: string;
  tierIndex: number;
  type: AnimationType;
  startTime: number; // milliseconds from animation start
  duration: number; // milliseconds
  keyframes: AnimationKeyframe[];
  label: string;
}

export interface AssemblyAnimationTimeline {
  id: string;
  name: string;
  totalDuration: number;
  tracks: AnimationTrack[];
  speed: number; // 0.5x, 1x, 2x, etc.
  autoLoop: boolean;
  createdAt: string;
}

/**
 * Easing functions for smooth animations
 */
export const easingFunctions = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutBounce: (t: number) => {
    if (t < 0.36363) return 7.5625 * t * t;
    if (t < 0.72727) return 7.5625 * (t -= 0.54545) * t + 0.75;
    if (t < 0.90909) return 7.5625 * (t -= 0.81818) * t + 0.9375;
    return 7.5625 * (t -= 0.95454) * t + 0.984375;
  },
  easeOutElastic: (t: number) => {
    const c5 = (2 * Math.PI) / 4.5;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c5) + 1;
  },
};

/**
 * Timeline Manager
 */
export class AssemblyAnimationTimelineManager {
  private timeline: AssemblyAnimationTimeline;
  private currentTime = 0;
  private isPlaying = false;
  private isLooping = false;
  private onUpdateCallback?: (currentTime: number, progress: number) => void;
  private onTrackUpdateCallback?: (
    track: AnimationTrack,
    progress: number,
  ) => void;

  constructor(
    name: string = "Default Assembly",
    tierCount: number = 1,
    speed: number = 1,
  ) {
    this.timeline = {
      id: `timeline-${Date.now()}`,
      name,
      totalDuration: 0,
      tracks: this.generateDefaultTracks(tierCount),
      speed,
      autoLoop: false,
      createdAt: new Date().toISOString(),
    };

    // Calculate total duration
    this.updateTotalDuration();
  }

  /**
   * Generate default animation tracks for tier assembly
   */
  private generateDefaultTracks(tierCount: number): AnimationTrack[] {
    const tracks: AnimationTrack[] = [];
    const tierDuration = 1500; // 1.5 seconds per tier
    const frostingDelay = 800;
    const fillingDelay = 300;

    for (let i = 0; i < tierCount; i++) {
      const tierStartTime = i * tierDuration;

      // Tier rise animation
      tracks.push({
        id: `tier-rise-${i}`,
        tierIndex: i,
        type: "tier-rise",
        startTime: tierStartTime,
        duration: 1000,
        label: `Tier ${i + 1} Rise`,
        keyframes: [
          {
            time: tierStartTime,
            property: "position.y",
            value: -50, // Start below
            easing: "easeOut",
          },
          {
            time: tierStartTime + 1000,
            property: "position.y",
            value: 0, // End at correct position
            easing: "easeOut",
          },
        ],
      });

      // Frosting spread animation
      tracks.push({
        id: `frosting-spread-${i}`,
        tierIndex: i,
        type: "frosting-spread",
        startTime: tierStartTime + frostingDelay,
        duration: 800,
        label: `Tier ${i + 1} Frosting`,
        keyframes: [
          {
            time: tierStartTime + frostingDelay,
            property: "scale.x",
            value: 0.5,
            easing: "easeOut",
          },
          {
            time: tierStartTime + frostingDelay + 800,
            property: "scale.x",
            value: 1,
            easing: "easeOut",
          },
        ],
      });

      // Filling insertion animation (not for top tier)
      if (i < tierCount - 1) {
        tracks.push({
          id: `filling-insert-${i}`,
          tierIndex: i,
          type: "filling-insert",
          startTime: tierStartTime + fillingDelay,
          duration: 600,
          label: `Tier ${i + 1} Filling`,
          keyframes: [
            {
              time: tierStartTime + fillingDelay,
              property: "opacity",
              value: 0,
              easing: "linear",
            },
            {
              time: tierStartTime + fillingDelay + 600,
              property: "opacity",
              value: 1,
              easing: "linear",
            },
          ],
        });
      }
    }

    return tracks;
  }

  /**
   * Calculate total duration from all tracks
   */
  private updateTotalDuration(): void {
    let maxTime = 0;
    this.timeline.tracks.forEach((track) => {
      const trackEnd = track.startTime + track.duration;
      maxTime = Math.max(maxTime, trackEnd);
    });
    this.timeline.totalDuration = maxTime;
  }

  /**
   * Start playing the animation
   */
  play(): void {
    this.isPlaying = true;
    this.isLooping = this.timeline.autoLoop;
  }

  /**
   * Pause the animation
   */
  pause(): void {
    this.isPlaying = false;
  }

  /**
   * Stop and reset to beginning
   */
  stop(): void {
    this.isPlaying = false;
    this.currentTime = 0;
    this.onUpdateCallback?.(0, 0);
  }

  /**
   * Update animation (call every frame)
   */
  update(deltaTime: number): void {
    if (!this.isPlaying) return;

    const scaledDeltaTime = deltaTime * this.timeline.speed;
    this.currentTime += scaledDeltaTime;

    // Handle looping
    if (this.currentTime >= this.timeline.totalDuration) {
      if (this.isLooping) {
        this.currentTime = 0;
      } else {
        this.isPlaying = false;
        this.currentTime = this.timeline.totalDuration;
      }
    }

    const progress =
      this.timeline.totalDuration > 0
        ? this.currentTime / this.timeline.totalDuration
        : 0;

    // Notify listeners
    this.onUpdateCallback?.(this.currentTime, progress);

    // Update each track
    this.timeline.tracks.forEach((track) => {
      if (
        this.currentTime >= track.startTime &&
        this.currentTime <= track.startTime + track.duration
      ) {
        const trackProgress =
          (this.currentTime - track.startTime) / track.duration;
        this.onTrackUpdateCallback?.(track, trackProgress);
      }
    });
  }

  /**
   * Seek to specific time
   */
  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.timeline.totalDuration));
    const progress =
      this.timeline.totalDuration > 0
        ? this.currentTime / this.timeline.totalDuration
        : 0;
    this.onUpdateCallback?.(this.currentTime, progress);
  }

  /**
   * Seek by percentage (0-1)
   */
  seekByProgress(progress: number): void {
    this.seek(progress * this.timeline.totalDuration);
  }

  /**
   * Get current animation state
   */
  getState(): {
    currentTime: number;
    duration: number;
    progress: number;
    isPlaying: boolean;
  } {
    const progress =
      this.timeline.totalDuration > 0
        ? this.currentTime / this.timeline.totalDuration
        : 0;
    return {
      currentTime: this.currentTime,
      duration: this.timeline.totalDuration,
      progress,
      isPlaying: this.isPlaying,
    };
  }

  /**
   * Get timeline
   */
  getTimeline(): AssemblyAnimationTimeline {
    return this.timeline;
  }

  /**
   * Update speed
   */
  setSpeed(speed: number): void {
    this.timeline.speed = Math.max(0.25, Math.min(4, speed)); // 0.25x to 4x
  }

  /**
   * Get current track values for a specific tier
   */
  getCurrentTrackValues(tierIndex: number): Record<string, number> {
    const values: Record<string, number> = {};

    this.timeline.tracks
      .filter((track) => track.tierIndex === tierIndex)
      .forEach((track) => {
        if (
          this.currentTime >= track.startTime &&
          this.currentTime <= track.startTime + track.duration
        ) {
          const trackProgress =
            (this.currentTime - track.startTime) / track.duration;
          const easing =
            easingFunctions[track.keyframes[0]?.easing || "linear"];
          const easedProgress = easing(trackProgress);

          // Interpolate between keyframes
          track.keyframes.forEach((kf, idx) => {
            if (idx < track.keyframes.length - 1) {
              const nextKf = track.keyframes[idx + 1];
              const start = kf.value;
              const end = nextKf.value;
              values[kf.property] = start + (end - start) * easedProgress;
            }
          });
        }
      });

    return values;
  }

  /**
   * Register update callback
   */
  onUpdate(callback: (currentTime: number, progress: number) => void): void {
    this.onUpdateCallback = callback;
  }

  /**
   * Register track update callback
   */
  onTrackUpdate(
    callback: (track: AnimationTrack, progress: number) => void,
  ): void {
    this.onTrackUpdateCallback = callback;
  }

  /**
   * Add custom animation track
   */
  addTrack(track: AnimationTrack): void {
    this.timeline.tracks.push(track);
    this.updateTotalDuration();
  }

  /**
   * Remove animation track
   */
  removeTrack(trackId: string): void {
    this.timeline.tracks = this.timeline.tracks.filter((t) => t.id !== trackId);
    this.updateTotalDuration();
  }

  /**
   * Export timeline for storage
   */
  export(): string {
    return JSON.stringify(this.timeline, null, 2);
  }

  /**
   * Import timeline from stored data
   */
  static import(data: string): AssemblyAnimationTimelineManager {
    const parsed = JSON.parse(data) as AssemblyAnimationTimeline;
    const manager = new AssemblyAnimationTimelineManager();
    manager.timeline = parsed;
    manager.updateTotalDuration();
    return manager;
  }
}

/**
 * Preset animation configurations
 */
export const ANIMATION_PRESETS = {
  slow: { speed: 0.5, name: "Slow" },
  normal: { speed: 1, name: "Normal" },
  fast: { speed: 1.5, name: "Fast" },
  veryFast: { speed: 2, name: "Very Fast" },
  dramatic: { speed: 0.3, name: "Dramatic" },
  cinematic: { speed: 0.7, name: "Cinematic" },
};
