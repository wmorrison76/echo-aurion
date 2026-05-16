import { lazy } from "react";

/** Wrap dynamic imports so React.lazy always receives a default component */
export function lazyDefault(loader: () => Promise<any>) {
  return lazy(async () => {
    const m = await loader();
    const component =
      m.default ??
      m.EchoCanvas ??        // your bridge named export (if imported that way)
      m.CustomCakeStudio ??  // your page default (if re-exported as named)
      Object.values(m).find((v) => typeof v === "function");
    return { default: component as any };
  });
}
