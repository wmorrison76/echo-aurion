import { useCallback, useState } from "react";
import * as ClientMod from "./ImageGenClient";
import { buildPrompt } from "./presets";

/** What we send to the image API */
export type GenPayload = {
  prompt: string;
  negative?: string;
  width?: number;
  height?: number;
  seed?: number;
  referenceDataURL?: string;
  maskDataURL?: string;
  styleId?: string;
  /** optional tuning knobs (your backend can read these) */
  mode?: "fast" | "balanced" | "quality";
  steps?: number;
  scheduler?: string;
};

/** What the client must support (any one method is fine) */
type ClientLike = {
  generate?: (p: GenPayload) => Promise<any>;
  txt2img?: (p: GenPayload) => Promise<any>;
  create?: (p: GenPayload) => Promise<any>;
};

/** Try to construct the exported class, otherwise use whatever it exported */
function coerceClient(): ClientLike {
  const anyMod: any = ClientMod;
  const C = anyMod.ImageGenClient || anyMod.default || anyMod;
  try {
    return new C(); // class export
  } catch {
    return C; // plain object export
  }
}

export function useImageGen() {
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [styleId, setStyleId] = useState<string | undefined>(undefined);
  const [refDataURL, setRefDataURL] = useState<string | undefined>(undefined);
  const [maskDataURL, setMaskDataURL] = useState<string | undefined>(undefined);
  const [width, setWidth] = useState<number | undefined>(512);
  const [height, setHeight] = useState<number | undefined>(512);
  const [seed, setSeed] = useState<number | undefined>(undefined);

  const [generating, setGenerating] = useState(false);
  const [imageURL, setImageURL] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const generate = useCallback(
    async (override?: Partial<GenPayload>) => {
      setGenerating(true);
      setError(undefined);
      try {
        const client = coerceClient();

        const base = override?.prompt ?? prompt;
        const sId = override?.styleId ?? styleId;
        const full = buildPrompt(base, sId);

        const payload: GenPayload = {
          prompt: full,
          negative: override?.negative ?? negative,
          width: override?.width ?? width,
          height: override?.height ?? height,
          seed: override?.seed ?? seed,
          referenceDataURL: override?.referenceDataURL ?? refDataURL,
          maskDataURL: override?.maskDataURL ?? maskDataURL,
          styleId: sId,
          mode: override?.mode,
          steps: override?.steps,
          scheduler: override?.scheduler,
        };

        let res: any;
        if (client.generate) res = await client.generate(payload);
        else if ((client as any).txt2img) res = await (client as any).txt2img(payload);
        else if ((client as any).create) res = await (client as any).create(payload);
        else throw new Error("ImageGenClient has no generate/txt2img/create method");

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
    },
    [prompt, negative, width, height, seed, refDataURL, maskDataURL, styleId]
  );

  const clear = useCallback(() => setImageURL(undefined), []);

  return {
    prompt,
    setPrompt,
    negative,
    setNegative,
    styleId,
    setStyleId,
    refDataURL,
    setRefDataURL,
    maskDataURL,
    setMaskDataURL,
    width,
    setWidth,
    height,
    setHeight,
    seed,
    setSeed,
    generating,
    imageURL,
    error,
    generate,
    clear,
    setResultUrl: setImageURL,
  };
}

export default useImageGen;
