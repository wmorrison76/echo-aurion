import { Button } from "@/components/ui/button";

export default function EmbedSnippet({ radius, ringCount, ringParticles, ringSpeed, ringRandomness, glowParticles, glowSpeed, omniGlow }:{ radius:number; ringCount:number; ringParticles:number; ringSpeed:number; ringRandomness:number; glowParticles:number; glowSpeed:number; omniGlow:boolean; }){
  const origin = typeof window !== 'undefined' ? window.location.origin : "";
  const src = `${origin}/embed/echo?radius=${radius}&rings=${ringCount}&ringParticles=${ringParticles}&ringSpeed=${ringSpeed}&ringRand=${ringRandomness}&glow=${glowParticles}&glowSpeed=${glowSpeed}&omni=${omniGlow?1:0}`;
  const code = `<iframe src=\"${src}\" width=\"640\" height=\"360\" style=\"border:0;\" allow=\"accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture\" loading=\"lazy\"></iframe>`;
  const copy = () => navigator.clipboard?.writeText(code);
  return (
    <div className="mt-4">
      <div className="mb-1 text-xs text-muted-foreground">Embed this orb</div>
      <div className="flex items-center gap-2">
        <input readOnly value={src} className="flex-1 rounded-md border bg-background px-2 py-1 text-xs" />
        <Button size="sm" variant="outline" onClick={copy}>Copy iframe</Button>
      </div>
    </div>
  );
}
