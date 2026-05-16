import { useEffect, useState, useCallback } from "react";
import EchoOrb, { type EchoOrbProps } from "./EchoOrb";
import {
  getEchoAIOrbService,
  type MoodState,
  type OrbVisuals,
} from "@/services/EchoAIOrbService";

export interface MoodAwareEchoOrbProps {
  // Size configuration
  size?: number; // width/height in pixels
  className?: string;

  // Optional: override animation/rendering params
  baseBareMode?: boolean;
  autoStart?: boolean; // Auto-start mood polling
}

/**
 * Maps mood visuals to EchoOrb props
 */
function visualsToOrbProps(
  visuals: OrbVisuals,
  moodState: MoodState,
): Partial<EchoOrbProps> {
  // Extract RGB values from rgba strings
  const parseColor = (rgba: string): string => {
    // Convert "rgba(r, g, b, a)" to "#RRGGBB"
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return "#6496FF"; // Fallback
    const r = parseInt(match[1], 10).toString(16).padStart(2, "0");
    const g = parseInt(match[2], 10).toString(16).padStart(2, "0");
    const b = parseInt(match[3], 10).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  };

  return {
    // Core animation
    speed: visuals.animation.speed,
    wobble: visuals.animation.wobbleIntensity * 30, // Scale to 0-30 range

    // Colors
    colorA: parseColor(visuals.color.primary),
    colorB: parseColor(visuals.color.secondary),

    // Pattern
    pattern: mapMoodToPattern(visuals.pattern),

    // Rings
    showRings: true,
    ringCount: Math.ceil(6 + moodState.workloadLevel * 4), // 6-10 rings based on workload
    ringSpeed: visuals.animation.speed * 0.8,
    ringColor: parseColor(visuals.color.glow),
    ringRandomness: visuals.animation.wobbleIntensity * 0.5,

    // Glow
    glowParticles: Math.ceil(200 + moodState.workloadLevel * 300), // 200-500 particles
    glowColor: parseColor(visuals.color.accent),
    glowSpeed: visuals.animation.speed * 1.2,
    glowSize: 0.5 + visuals.glow.intensity * 0.5, // 0.5-1.0

    // Scaling
    radius: 2.2 * visuals.animation.pulseSize,
    compactness: 0.85 + visuals.animation.wobbleIntensity * 0.1,
  };
}

/**
 * Map mood pattern to EchoOrb pattern type
 */
function mapMoodToPattern(
  pattern: string,
): "classic" | "waves" | "galaxy" | "fractal" | "tessellation" {
  const mapping: Record<
    string,
    "classic" | "waves" | "galaxy" | "fractal" | "tessellation"
  > = {
    smooth: "classic",
    energetic: "galaxy",
    spiral: "fractal",
    ripple: "waves",
    wave: "waves",
  };
  return mapping[pattern] || "classic";
}

/**
 * Mood-aware Echo Orb - dynamically responds to system workload and AI mood
 */
export function MoodAwareEchoOrb({
  size = 400,
  className = "",
  baseBareMode = false,
  autoStart = true,
}: MoodAwareEchoOrbProps) {
  const orbService = getEchoAIOrbService();
  const [moodState, setMoodState] = useState(orbService.getMoodState());
  const [orbProps, setOrbProps] = useState<Partial<EchoOrbProps>>(
    visualsToOrbProps(orbService.getVisualParameters(), moodState),
  );

  // Subscribe to mood changes
  useEffect(() => {
    const unsubscribe = orbService.onMoodChange((newState) => {
      setMoodState(newState);
      const visuals = orbService.getVisualParameters();
      setOrbProps(visualsToOrbProps(visuals, newState));
    });

    return () => unsubscribe();
  }, [orbService]);

  // Auto-start the service
  useEffect(() => {
    if (autoStart) {
      orbService.start();
      return () => {
        // Keep service running even when component unmounts
        // Only stop on explicit cleanup
      };
    }
  }, [orbService, autoStart]);

  // Compute box-shadow glow based on mood
  const glowConfig = orbService.getVisualParameters().glow;
  const glowColor = orbService.getVisualParameters().color.glow;
  const boxShadow = `0 0 ${glowConfig.radius}px rgba(${glowColor.match(/\d+,\s*\d+,\s*\d+/)?.[0] || "100, 150, 255"}, ${glowConfig.intensity * 0.6})`;

  return (
    <div
      className={`mood-aware-echo-orb flex items-center justify-center ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: "relative",
      }}
    >
      <div
        className="relative w-full h-full rounded-full overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(12,18,32,0.88)_0%,_rgba(5,10,21,0.92)_55%,_rgba(2,6,14,0.72)_100%)] backdrop-blur-sm"
        style={{
          boxShadow,
          transition: "box-shadow 0.5s ease-in-out",
          filter: `blur(0px) brightness(${0.95 + moodState.workloadLevel * 0.15})`,
        }}
      >
        <EchoOrb
          {...{
            points: 6000,
            radius: 2.2,
            ...orbProps,
            bare: baseBareMode,
          }}
        />
      </div>

      {/* Mood indicator overlay (optional - for debugging/visibility) */}
      <div
        className="absolute top-2 left-2 px-2 py-1 text-xs font-mono bg-black/50 text-white rounded backdrop-blur"
        style={{ opacity: 0.6 }}
      >
        {moodState.current}
        <span className="text-gray-400 ml-1">
          ({(moodState.workloadLevel * 100).toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

export default MoodAwareEchoOrb;
