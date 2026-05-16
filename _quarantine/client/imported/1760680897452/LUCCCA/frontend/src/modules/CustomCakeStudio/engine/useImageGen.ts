import { useCallback, useState } from "react";
import ImageGenClient from "./ImageGenClient";   // <- direct, no wildcard import
import { buildPrompt } from "./presets";

export type GenPayload = {
  prompt: string;
  negative?: string;
  width?: number;
  height?: number;
  seed?: number;
  referenceDataURL?: string;
  maskDataURL?: string;
  styleId?: string;
  mode?: "fast" | "balanced" | "quality";
  steps?: number;
  scheduler?: string;
};

const client = new ImageGenClient(); // singleton

export function useImageGen() {
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [styleId, setStyleId] = useState<string | undefined>(undefined);
  const [refDataURL, setRefDataURL] = useState<string | undefined>(undefined);
  const [maskDataURL, setMaskDataURL] = useState<string | undefined>(undefined);
  const [width, setWidth] = useState<number | undefined>(512);
  const [height, setHeight] = useState<number | undefined>(512);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [mode, setMode] = useState<"fast" | "balanced" | "quality">("balanced");
  const [steps, setSteps] = useState<number | undefined>(undefined);

  const [generating, setGenerating] = useState(false);
  const [imageURL, setImageURL] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const generate = useCallback(async (override?: Partial<GenPayload>) => {
    setGenerating(true);
    setError(undefined);
    try {
      const full = buildPrompt(override?.prompt ?? prompt, override?.styleId ?? styleId);

      const payload: GenPayload = {
        prompt: full,
        negative: override?.negative ?? negative,
        width: override?.width ?? width,
        height: override?.height ?? height,
        seed: override?.seed ?? seed,
        referenceDataURL: override?.referenceDataURL ?? refDataURL,
        maskDataURL: override?.maskDataURL ?? maskDataURL,
        styleId: override?.styleId ?? styleId,
        mode: override?.mode ?? mode,
        steps: override?.steps ?? steps,
        scheduler: override?.scheduler,
      };

      // always available now
      const res: any = await client.generate(payload);

      let url: string | undefined =
        res?.url || res?.imageUrl || res?.image || (typeof res === "string" ? res : undefined);
      if (!url && res?.base64) url = `data:image/png;base64,${res.base64}`;
      if (!url && res?.blob) url = URL.createObjectURL(res.blob);
      if (!url) throw new Error("Image generation returned no image URL");

      setImageURL(url);
      return { url };
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setGenerating(false);
    }
  }, [prompt, negative, width, height, seed, refDataURL, maskDataURL, styleId, mode, steps]);

  const clear = useCallback(() => setImageURL(undefined), []);

  return {
    prompt, setPrompt,
    negative, setNegative,
    styleId, setStyleId,
    refDataURL, setRefDataURL,
    maskDataURL, setMaskDataURL,
    width, setWidth,
    height, setHeight,
    seed, setSeed,
    mode, setMode,
    steps, setSteps,
    generating, imageURL, error,
    generate, clear, setResultUrl: setImageURL,
  };
}
export type { GenPayload };

export default useImageGen;
