import { useMemo } from "react";
import EchoOrb, { orbHostClass } from "@/components/echo/EchoOrb";
import { useBreakpoint, ResponsiveContainer } from "@/components/layout";

export default function StudioEmbed() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  const config = useMemo(
    () => ({
      ringCount: Number(params.get("rings") ?? 8),
      ringParticles: Number(params.get("ringParticles") ?? 900),
      ringSpeed: Number(params.get("ringSpeed") ?? 0.6),
      ringRandomness: Number(params.get("ringRand") ?? 0.35),
      glowParticles: Number(params.get("glow") ?? 1200),
      glowSpeed: Number(params.get("glowSpeed") ?? 1.4),
      omniGlow: params.get("omni") !== "0",
      radius: Number(params.get("radius") ?? 2.2),
    }),
    [params.toString()]
  );

  return (
    <ResponsiveContainer className="min-h-screen flex items-center justify-center py-6 sm:py-8">
      <div
        className={`${orbHostClass} aspect-square w-[min(${isMobile ? "85vw" : "92vw"},520px)] max-w-[720px] ${
          isMobile ? "p-2" : "p-0"
        }`}
      >
        <EchoOrb bare className="h-full w-full" showRings {...config} />
      </div>
    </ResponsiveContainer>
  );
}
