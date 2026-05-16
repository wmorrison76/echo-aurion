import React from "react";

declare global {
  interface Window {
    cv?: any;
  }
}

async function loadOpenCV(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.cv && typeof window.cv === "object") return true;

  const src = "/vendor/opencv.js";
  await new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => {
      const cv = (window as any).cv;
      if (!cv)
        return reject(new Error(`OpenCV not available after loading ${src}`));
      if (cv && !cv.onRuntimeInitialized) return resolve();
      cv.onRuntimeInitialized = () => resolve();
    };
    el.onerror = () =>
      reject(new Error(`Failed to load opencv.js from ${src}`));
    document.body.appendChild(el);
  });

  return true;
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export default function PanoramaStitcher({
  onStitched,
}: {
  onStitched: (dataUrl: string) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const filesRef = React.useRef<HTMLInputElement | null>(null);

  const stitch = React.useCallback(async () => {
    setError(null);
    const input = filesRef.current;
    if (!input?.files || input.files.length < 2) {
      setError("Select 2+ photos");
      return;
    }

    setBusy(true);
    try {
      let hasCV = false;
      try {
        hasCV = await loadOpenCV();
      } catch {
        hasCV = false;
      }

      const files = Array.from(input.files);
      const images = await Promise.all(files.map(fileToImage));

      const cv = window.cv;
      const canStitch = Boolean(
        hasCV && cv && (cv.Stitcher_create || cv.Stitcher),
      );

      if (canStitch) {
        /* OpenCV stitch path (best quality) */
        const mats = images.map((img) => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas 2D context not available");
          ctx.drawImage(img, 0, 0);
          return cv.imread(canvas);
        });

        const stitcher = cv.Stitcher_create
          ? cv.Stitcher_create(cv.Stitcher_PANORAMA)
          : new cv.Stitcher();
        const pano = new cv.Mat();
        const status = stitcher.stitch(mats, pano);
        mats.forEach((m: any) => m.delete?.());

        if (status !== 0)
          throw new Error(`OpenCV stitch failed: status ${status}`);

        const outCanvas = document.createElement("canvas");
        cv.imshow(outCanvas, pano);
        pano.delete?.();
        onStitched(outCanvas.toDataURL("image/png"));
        return;
      }

      /* Fallback: simple horizontal mosaic (deterministic, no OpenCV dependency) */
      const totalW = images.reduce(
        (w, img) => w + (img.naturalWidth || img.width),
        0,
      );
      const maxH = Math.max(
        ...images.map((img) => img.naturalHeight || img.height),
      );

      const canvas = document.createElement("canvas");
      canvas.width = totalW;
      canvas.height = maxH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context not available");

      let x = 0;
      for (const img of images) {
        const w = img.naturalWidth || img.width;
        ctx.drawImage(img, x, 0);
        x += w;
      }

      onStitched(canvas.toDataURL("image/png"));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setError(e instanceof Error ? e.message : "Stitch failed");
    } finally {
      setBusy(false);
    }
  }, [onStitched]);

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium">Photo Stitch (OpenCV.js)</div>
      <input
        ref={filesRef}
        type="file"
        accept="image/*"
        multiple
        className="text-xs"
      />
      <button
        disabled={busy}
        onClick={stitch}
        className="inline-flex items-center px-3 py-1.5 text-xs rounded-md border disabled:opacity-50"
      >
        {busy ? "Stitching…" : "Stitch & Set Background"}
      </button>
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
      <div className="text-[10px] text-muted-foreground">
        Place `opencv.js` at `public/vendor/opencv.js` for best results.
      </div>
    </div>
  );
}
