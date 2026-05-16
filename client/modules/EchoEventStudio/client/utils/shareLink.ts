export async function ensureLZ(): Promise<(data: string) => string> {
  if (typeof window !== "undefined" && (window as any).LZString) {
    return (window as any).LZString.compressToEncodedURIComponent;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src =
        "https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("LZString failed to load"));
      document.head.appendChild(s);
    });
    return (window as any).LZString.compressToEncodedURIComponent;
  } catch {
    return (str: string) => {
      const b64 = btoa(unescape(encodeURIComponent(str)));
      return encodeURIComponent(b64);
    };
  }
}
export async function encodeSharePayload(obj: any) {
  const compress = await ensureLZ();
  return compress(JSON.stringify(obj));
}
export function decodeSharePayloadFromHash(hash: string): any | null {
  const fragment = hash.startsWith("#") ? hash.substring(1) : hash;
  const params = new URLSearchParams(fragment);
  const s = params.get("s");
  if (!s) return null;
  const tryDecode = (fn: (s: string) => string) => {
    try {
      return JSON.parse(fn(s));
    } catch {
      return null;
    }
  };
  if ((window as any).LZString) {
    const LZ = (window as any).LZString;
    const out = tryDecode((x) => LZ.decompressFromEncodedURIComponent(x));
    if (out) return out;
  }
  try {
    const json = decodeURIComponent(s);
    const str = decodeURIComponent(escape(atob(json)));
    return JSON.parse(str);
  } catch {
    return null;
  }
}
