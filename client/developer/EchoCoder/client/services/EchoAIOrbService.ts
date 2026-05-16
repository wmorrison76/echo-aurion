import * as Sentry from "@sentry/react";

/**
 * Mood types and their associated personalities
 */
export type OrbMood =
  | "idle"
  | "thinking"
  | "excited"
  | "stressed"
  | "creative"
  | "focused"
  | "calm";

/**
 * Visual parameters for each mood
 */
export interface OrbVisuals {
  color: {
    primary: string;
    secondary: string;
    glow: string;
    accent: string;
  };
  animation: {
    speed: number; // 0.5 - 2.0
    wobbleIntensity: number; // 0 - 1
    pulseSize: number; // 0.8 - 1.2 (scale)
    rotationDirection: "cw" | "ccw" | "none";
  };
  pattern: "smooth" | "energetic" | "spiral" | "ripple" | "wave";
  glow: {
    intensity: number; // 0 - 1
    blur: number; // 0 - 32
    radius: number; // 0 - 100
  };
}

/**
 * Mood definitions with visual parameters
 */
const MOOD_DEFINITIONS: Record<OrbMood, OrbVisuals> = {
  idle: {
    color: {
      primary: "rgba(100, 150, 255, 0.8)", // Cool blue
      secondary: "rgba(150, 200, 255, 0.6)",
      glow: "rgba(100, 150, 255, 0.3)",
      accent: "rgba(200, 220, 255, 0.4)",
    },
    animation: {
      speed: 0.5,
      wobbleIntensity: 0.1,
      pulseSize: 1.0,
      rotationDirection: "cw",
    },
    pattern: "smooth",
    glow: {
      intensity: 0.3,
      blur: 12,
      radius: 40,
    },
  },
  thinking: {
    color: {
      primary: "rgba(150, 180, 255, 0.85)", // Contemplative blue
      secondary: "rgba(100, 200, 255, 0.65)",
      glow: "rgba(150, 180, 255, 0.35)",
      accent: "rgba(200, 220, 255, 0.5)",
    },
    animation: {
      speed: 0.7,
      wobbleIntensity: 0.2,
      pulseSize: 1.05,
      rotationDirection: "cw",
    },
    pattern: "ripple",
    glow: {
      intensity: 0.5,
      blur: 16,
      radius: 50,
    },
  },
  excited: {
    color: {
      primary: "rgba(255, 150, 100, 0.9)", // Warm orange
      secondary: "rgba(255, 200, 100, 0.7)",
      glow: "rgba(255, 150, 100, 0.4)",
      accent: "rgba(255, 220, 150, 0.6)",
    },
    animation: {
      speed: 1.5,
      wobbleIntensity: 0.5,
      pulseSize: 1.15,
      rotationDirection: "cw",
    },
    pattern: "energetic",
    glow: {
      intensity: 0.8,
      blur: 20,
      radius: 70,
    },
  },
  stressed: {
    color: {
      primary: "rgba(255, 100, 100, 0.9)", // Alert red
      secondary: "rgba(255, 150, 100, 0.7)",
      glow: "rgba(255, 100, 100, 0.4)",
      accent: "rgba(255, 180, 150, 0.6)",
    },
    animation: {
      speed: 1.8,
      wobbleIntensity: 0.7,
      pulseSize: 1.2,
      rotationDirection: "ccw",
    },
    pattern: "wave",
    glow: {
      intensity: 0.9,
      blur: 24,
      radius: 80,
    },
  },
  creative: {
    color: {
      primary: "rgba(200, 100, 255, 0.9)", // Purple creativity
      secondary: "rgba(150, 150, 255, 0.7)",
      glow: "rgba(200, 100, 255, 0.4)",
      accent: "rgba(220, 150, 255, 0.6)",
    },
    animation: {
      speed: 1.2,
      wobbleIntensity: 0.4,
      pulseSize: 1.1,
      rotationDirection: "cw",
    },
    pattern: "spiral",
    glow: {
      intensity: 0.7,
      blur: 18,
      radius: 65,
    },
  },
  focused: {
    color: {
      primary: "rgba(100, 200, 100, 0.85)", // Focus green
      secondary: "rgba(150, 220, 150, 0.65)",
      glow: "rgba(100, 200, 100, 0.35)",
      accent: "rgba(180, 230, 180, 0.5)",
    },
    animation: {
      speed: 0.8,
      wobbleIntensity: 0.15,
      pulseSize: 1.02,
      rotationDirection: "cw",
    },
    pattern: "smooth",
    glow: {
      intensity: 0.6,
      blur: 14,
      radius: 55,
    },
  },
  calm: {
    color: {
      primary: "rgba(100, 180, 150, 0.85)", // Peaceful teal
      secondary: "rgba(150, 200, 180, 0.65)",
      glow: "rgba(100, 180, 150, 0.35)",
      accent: "rgba(180, 220, 200, 0.5)",
    },
    animation: {
      speed: 0.6,
      wobbleIntensity: 0.08,
      pulseSize: 0.98,
      rotationDirection: "cw",
    },
    pattern: "smooth",
    glow: {
      intensity: 0.4,
      blur: 13,
      radius: 45,
    },
  },
};

/**
 * Workload metrics tracked
 */
export interface WorkloadMetrics {
  requestCount: number;
  errorRate: number;
  avgResponseTime: number;
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
  timestamp: number;
}

/**
 * Mood state with continuity
 */
export interface MoodState {
  current: OrbMood;
  previous: OrbMood;
  transitionProgress: number; // 0 - 1 (for easing)
  confidenceLevel: number; // 0 - 1 (how confident AI is in mood)
  timestamp: number;
  workloadLevel: number; // 0 - 1
}

/**
 * EchoAI Orb Service - Controls mood, visuals, and behavior
 * Maintains state locally and respects system resources
 */
class EchoAIOrbService {
  private moodState: MoodState;
  private metricsHistory: WorkloadMetrics[] = [];
  private metricsPollingInterval: NodeJS.Timer | null = null;
  private moodUpdateInterval: NodeJS.Timer | null = null;
  private transitionStartTime: number = 0;
  private transitionDuration: number = 2000; // 2 second smooth transitions
  private workloadThresholds = {
    idle: 0.05,
    thinking: 0.2,
    focused: 0.4,
    creative: 0.5,
    excited: 0.65,
    stressed: 0.85,
  };
  private moodChangeCallbacks: Set<(state: MoodState) => void> = new Set();

  constructor() {
    // Initialize with idle mood
    this.moodState = {
      current: "idle",
      previous: "idle",
      transitionProgress: 1, // Fully transitioned
      confidenceLevel: 1,
      timestamp: Date.now(),
      workloadLevel: 0,
    };

    // Load persisted state from localStorage
    this.loadPersistedState();
  }

  /**
   * Start the AI orb system (metrics polling + mood updates)
   */
  public start(): void {
    if (this.metricsPollingInterval) return; // Already running

    // Poll metrics every 1 second (lightweight)
    this.metricsPollingInterval = setInterval(() => {
      this.pollMetrics();
    }, 1000);

    // Update mood every 2 seconds (not taxing)
    this.moodUpdateInterval = setInterval(() => {
      this.updateMood();
    }, 2000);

    Sentry.captureMessage("EchoAI Orb service started", "info");
  }

  /**
   * Stop the AI orb system
   */
  public stop(): void {
    if (this.metricsPollingInterval) {
      clearInterval(this.metricsPollingInterval);
      this.metricsPollingInterval = null;
    }
    if (this.moodUpdateInterval) {
      clearInterval(this.moodUpdateInterval);
      this.moodUpdateInterval = null;
    }
  }

  /**
   * Poll system metrics from /api/metrics endpoint
   */
  private async pollMetrics(): Promise<void> {
    try {
      const response = await fetch("/api/metrics");
      if (!response.ok) return;

      const data = await response.json();

      const metrics: WorkloadMetrics = {
        requestCount: data.requestCount || 0,
        errorRate:
          (data.requestErrors || 0) / Math.max(data.requestCount || 1, 1),
        avgResponseTime: data.avgResponseTime || 0,
        activeConnections: data.activeConnections || 0,
        cpuUsage: data.cpuUsage?.percentage || 0,
        memoryUsage: data.memory?.heapUsed / data.memory?.heapTotal || 0,
        timestamp: Date.now(),
      };

      // Keep last 60 metrics (60 seconds of history)
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > 60) {
        this.metricsHistory = this.metricsHistory.slice(-60);
      }

      // Update workload level based on metrics
      this.updateWorkloadLevel(metrics);
    } catch (error) {
      // Silently fail - don't let metrics polling break the orb
      console.debug("Metrics polling failed:", error);
    }
  }

  /**
   * Calculate workload level from metrics (0-1)
   */
  private updateWorkloadLevel(metrics: WorkloadMetrics): void {
    const workloadLevel = Math.min(
      1,
      Math.max(
        0,
        (metrics.requestCount / 100) * 0.3 + // Request count contribution
          metrics.errorRate * 0.3 + // Error rate contribution
          (metrics.avgResponseTime / 1000) * 0.2 + // Response time contribution
          (metrics.cpuUsage / 100) * 0.1 + // CPU contribution
          metrics.memoryUsage * 0.1, // Memory contribution
      ),
    );

    this.moodState.workloadLevel = workloadLevel;
  }

  /**
   * Determine mood based on workload and context
   */
  private determineMood(): OrbMood {
    const workload = this.moodState.workloadLevel;

    // Mood determination logic based on workload levels
    if (workload < this.workloadThresholds.idle) {
      return "idle";
    } else if (workload < this.workloadThresholds.thinking) {
      return "thinking";
    } else if (workload < this.workloadThresholds.focused) {
      return "focused";
    } else if (workload < this.workloadThresholds.creative) {
      return "creative";
    } else if (workload < this.workloadThresholds.excited) {
      return "excited";
    } else {
      return "stressed";
    }
  }

  /**
   * Update mood with smooth transitions
   */
  private updateMood(): void {
    const newMood = this.determineMood();

    // Check if mood changed
    if (newMood !== this.moodState.current) {
      this.moodState.previous = this.moodState.current;
      this.moodState.current = newMood;
      this.transitionStartTime = Date.now();
      this.moodState.transitionProgress = 0;

      Sentry.captureMessage(
        `EchoAI mood changed: ${this.moodState.previous} → ${newMood} (workload: ${(this.moodState.workloadLevel * 100).toFixed(1)}%)`,
        "info",
      );
    }

    // Update transition progress
    const elapsed = Date.now() - this.transitionStartTime;
    this.moodState.transitionProgress = Math.min(
      1,
      elapsed / this.transitionDuration,
    );

    // Update timestamp and persist state
    this.moodState.timestamp = Date.now();
    this.persistState();

    // Notify all listeners
    this.notifyListeners();
  }

  /**
   * Get current mood state
   */
  public getMoodState(): MoodState {
    return { ...this.moodState };
  }

  /**
   * Get visual parameters for current mood (with smooth transitions)
   */
  public getVisualParameters(): OrbVisuals {
    const currentVisuals = MOOD_DEFINITIONS[this.moodState.current];
    const previousVisuals = MOOD_DEFINITIONS[this.moodState.previous];
    const progress = this.moodState.transitionProgress;

    // If fully transitioned, return current mood visuals
    if (progress >= 1) {
      return JSON.parse(JSON.stringify(currentVisuals));
    }

    // Interpolate between moods for smooth transition
    return this.interpolateVisuals(previousVisuals, currentVisuals, progress);
  }

  /**
   * Smooth interpolation between two mood visuals
   */
  private interpolateVisuals(
    from: OrbVisuals,
    to: OrbVisuals,
    progress: number,
  ): OrbVisuals {
    // Easing function for smooth transitions (ease-in-out cubic)
    const easeProgress =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    return {
      color: {
        primary: this.interpolateColor(
          from.color.primary,
          to.color.primary,
          easeProgress,
        ),
        secondary: this.interpolateColor(
          from.color.secondary,
          to.color.secondary,
          easeProgress,
        ),
        glow: this.interpolateColor(
          from.color.glow,
          to.color.glow,
          easeProgress,
        ),
        accent: this.interpolateColor(
          from.color.accent,
          to.color.accent,
          easeProgress,
        ),
      },
      animation: {
        speed:
          from.animation.speed +
          (to.animation.speed - from.animation.speed) * easeProgress,
        wobbleIntensity:
          from.animation.wobbleIntensity +
          (to.animation.wobbleIntensity - from.animation.wobbleIntensity) *
            easeProgress,
        pulseSize:
          from.animation.pulseSize +
          (to.animation.pulseSize - from.animation.pulseSize) * easeProgress,
        rotationDirection:
          progress < 0.5
            ? from.animation.rotationDirection
            : to.animation.rotationDirection,
      },
      pattern: progress < 0.5 ? from.pattern : to.pattern,
      glow: {
        intensity:
          from.glow.intensity +
          (to.glow.intensity - from.glow.intensity) * easeProgress,
        blur: from.glow.blur + (to.glow.blur - from.glow.blur) * easeProgress,
        radius:
          from.glow.radius + (to.glow.radius - from.glow.radius) * easeProgress,
      },
    };
  }

  /**
   * Interpolate between two RGBA colors
   */
  private interpolateColor(from: string, to: string, progress: number): string {
    const fromRgba = this.parseRgba(from);
    const toRgba = this.parseRgba(to);

    const r = Math.round(fromRgba.r + (toRgba.r - fromRgba.r) * progress);
    const g = Math.round(fromRgba.g + (toRgba.g - fromRgba.g) * progress);
    const b = Math.round(fromRgba.b + (toRgba.b - fromRgba.b) * progress);
    const a = fromRgba.a + (toRgba.a - fromRgba.a) * progress;

    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }

  /**
   * Parse RGBA color string
   */
  private parseRgba(color: string): {
    r: number;
    g: number;
    b: number;
    a: number;
  } {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([0-9.]*)\)/);
    if (!match) {
      return { r: 100, g: 150, b: 255, a: 0.8 }; // Default fallback
    }

    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
      a: match[4] ? parseFloat(match[4]) : 1,
    };
  }

  /**
   * Force a specific mood (for testing/demo)
   */
  public setMoodOverride(mood: OrbMood): void {
    if (mood !== this.moodState.current) {
      this.moodState.previous = this.moodState.current;
      this.moodState.current = mood;
      this.transitionStartTime = Date.now();
      this.moodState.transitionProgress = 0;
      this.persistState();
      this.notifyListeners();
    }
  }

  /**
   * Subscribe to mood changes
   */
  public onMoodChange(callback: (state: MoodState) => void): () => void {
    this.moodChangeCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.moodChangeCallbacks.delete(callback);
    };
  }

  /**
   * Notify all listeners of mood changes
   */
  private notifyListeners(): void {
    this.moodChangeCallbacks.forEach((callback) => {
      try {
        callback(this.getMoodState());
      } catch (error) {
        console.error("Error in mood change callback:", error);
      }
    });
  }

  /**
   * Persist mood state to localStorage
   */
  private persistState(): void {
    try {
      localStorage.setItem(
        "echoAiOrbState",
        JSON.stringify({
          mood: this.moodState.current,
          workloadLevel: this.moodState.workloadLevel,
          timestamp: this.moodState.timestamp,
        }),
      );
    } catch (error) {
      // Silently fail - don't break the orb if localStorage is unavailable
      console.debug("Failed to persist orb state:", error);
    }
  }

  /**
   * Load persisted mood state from localStorage
   */
  private loadPersistedState(): void {
    try {
      const stored = localStorage.getItem("echoAiOrbState");
      if (stored) {
        const data = JSON.parse(stored);
        // Only restore if recent (within 5 minutes)
        if (Date.now() - data.timestamp < 5 * 60 * 1000) {
          this.moodState.current = data.mood;
          this.moodState.workloadLevel = data.workloadLevel;
        }
      }
    } catch (error) {
      // Silently fail - start fresh if localStorage is unavailable
      console.debug("Failed to load persisted orb state:", error);
    }
  }

  /**
   * Get workload level (0-1)
   */
  public getWorkloadLevel(): number {
    return this.moodState.workloadLevel;
  }

  /**
   * Get all mood definitions (for UI reference)
   */
  public getMoodDefinitions(): Record<OrbMood, OrbVisuals> {
    return MOOD_DEFINITIONS;
  }
}

// Singleton instance
let instance: EchoAIOrbService | null = null;

/**
 * Get or create EchoAIOrbService singleton
 */
export function getEchoAIOrbService(): EchoAIOrbService {
  if (!instance) {
    instance = new EchoAIOrbService();
  }
  return instance;
}

/**
 * Reset service (for testing)
 */
export function resetEchoAIOrbService(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}

export default EchoAIOrbService;
