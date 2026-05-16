import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function drawCatTopHat(tint: string): string {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);

  // Simple illustrative cat + hat, vector-like
  ctx.translate(256, 300);
  ctx.fillStyle = tint || "#333";

  // Ears
  ctx.beginPath();
  ctx.moveTo(-120, -80);
  ctx.lineTo(-70, -150);
  ctx.lineTo(-40, -80);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(120, -80);
  ctx.lineTo(70, -150);
  ctx.lineTo(40, -80);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(0, -50, 120, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-40, -70, 18, 0, Math.PI * 2);
  ctx.arc(40, -70, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(-40, -70, 8, 0, Math.PI * 2);
  ctx.arc(40, -70, 8, 0, Math.PI * 2);
  ctx.fill();

  // Nose + mouth
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(0, -40, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = tint || "#333";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-20, -20);
  ctx.quadraticCurveTo(0, -10, 20, -20);
  ctx.stroke();

  // Top hat
  ctx.fillStyle = "#111";
  ctx.fillRect(-60, -200, 120, 90);
  ctx.fillRect(-100, -110, 200, 20);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(-60, -140, 120, 15);

  return c.toDataURL("image/png");
}

export default function GraphicGeneratorPanel({
  onApply,
}: {
  onApply: (url: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [tint, setTint] = useState("#333333");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [isPasting, setIsPasting] = useState(false);

  const generateLocal = () => {
    const dataUrl = drawCatTopHat(tint);
    onApply(dataUrl);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onApply(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = async () => {
    if (!navigator.clipboard?.read) {
      alert("Clipboard image paste is not supported in this browser.");
      return;
    }

    setIsPasting(true);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const reader = new FileReader();
        reader.onload = () => {
          onApply(reader.result as string);
        };
        reader.readAsDataURL(blob);
        return;
      }
      alert("No image found on clipboard.");
    } catch (error) {
      console.error("Clipboard paste failed:", error);
      alert("Clipboard paste failed. Try copying an image first.");
    } finally {
      setIsPasting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Graphic</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="text-xs text-muted-foreground">
          Type a description, or upload your own, then apply as a wrap.
        </div>
        <Input
          placeholder="e.g. Cat wearing a top hat"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <div className="text-xs">Tint</div>
            <Input
              type="color"
              value={tint}
              onChange={(e) => setTint(e.target.value)}
              className="w-14 p-1"
            />
          </div>
          <Button onClick={generateLocal}>Generate & Apply</Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Upload & Apply
          </Button>
          <Button
            variant="secondary"
            onClick={handlePaste}
            disabled={isPasting}
          >
            {isPasting ? "Pasting..." : "Paste from Clipboard"}
          </Button>
        </div>
        <div className="text-[12px] text-muted-foreground">
          For AI image generation (DALL·E, SDXL) connect via automation: Click
          [Connect to Zapier](#open-mcp-popover) and wire your provider, then
          paste the image URL here.
        </div>
      </CardContent>
    </Card>
  );
}
