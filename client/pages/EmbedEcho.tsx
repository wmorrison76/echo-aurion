import { useMemo } from "react";
import EchoOrb, { orbHostClass } from "@/components/echo/EchoOrb";

export default function StudioEmbed(){
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
  const config = useMemo(()=>({
    ringCount: Number(params.get('rings') ?? 8),
    ringParticles: Number(params.get('ringParticles') ?? 900),
    ringSpeed: Number(params.get('ringSpeed') ?? 0.6),
    ringRandomness: Number(params.get('ringRand') ?? 0.35),
    glowParticles: Number(params.get('glow') ?? 1200),
    glowSpeed: Number(params.get('glowSpeed') ?? 1.4),
    omniGlow: params.get('omni') !== '0',
    radius: Number(params.get('radius') ?? 2.2),
  }), [params.toString()]);
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className={`${orbHostClass} aspect-square w-[min(92vw,520px)] max-w-[720px]`}>
        <EchoOrb bare className="h-full w-full" showRings {...config} />
      </div>
    </div>
  );
}
