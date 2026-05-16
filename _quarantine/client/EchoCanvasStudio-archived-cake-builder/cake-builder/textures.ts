export interface TextureOption {
  id: string;
  label: string;
  pattern: CanvasPattern | null;
}

export type TextureType = "smooth" | "rustic" | "ridged";

export function createTextureCanvas(type: TextureType, color: string, intensity: number = 0.5): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [200, 100, 50];
  };

  const [r, g, b] = hexToRgb(color);

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  if (type === "smooth") {
    // Minimal noise for smooth appearance
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10 * intensity;
      data[i] = Math.max(0, Math.min(255, r + noise));
      data[i + 1] = Math.max(0, Math.min(255, g + noise));
      data[i + 2] = Math.max(0, Math.min(255, b + noise));
    }
  } else if (type === "rustic") {
    // Natural, bumpy texture
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30 * intensity;
      data[i] = Math.max(0, Math.min(255, r + noise));
      data[i + 1] = Math.max(0, Math.min(255, g + noise));
      data[i + 2] = Math.max(0, Math.min(255, b + noise));
    }
  } else if (type === "ridged") {
    // Directional ridges
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        const ridge = Math.sin((y + x) * 0.05) * 20 * intensity;
        data[idx] = Math.max(0, Math.min(255, r + ridge));
        data[idx + 1] = Math.max(0, Math.min(255, g + ridge));
        data[idx + 2] = Math.max(0, Math.min(255, b + ridge));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export const TEXTURE_PRESETS = [
  { id: "smooth", label: "Smooth", type: "smooth" },
  { id: "rustic", label: "Rustic", type: "rustic" },
  { id: "ridged", label: "Ridged", type: "ridged" },
];
