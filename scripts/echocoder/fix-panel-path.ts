import fs from "fs";

const registryPath = "client/lib/panel-registry.ts";

let src = fs.readFileSync(registryPath, "utf8");

src = src.replace(
  /lazy:\s*\(\)\s*=>\s*import\([^)]+\)/,
  `lazy: () => import("@/client/developer/EchoCoder/client/components/studio/EchoCoderPanel")`
);

fs.writeFileSync(registryPath, src);

console.log("✅ EchoCoderPanel import path fixed");

