/// <reference lib="webworker" />

// Prettier runs in worker to avoid blocking the UI
import prettier from "prettier/standalone";
import type { BuiltInParserName } from "prettier";
import babel from "prettier/plugins/babel";
import estree from "prettier/plugins/estree";
import typescript from "prettier/plugins/typescript";
import html from "prettier/plugins/html";
import postcss from "prettier/plugins/postcss";
import markdown from "prettier/plugins/markdown";

function parserFrom(language: string, path: string): BuiltInParserName | string {
  const lower = path.toLowerCase();
  if (language === "typescript" || /\.(ts|tsx)$/.test(lower)) return "typescript";
  if (language === "javascript" || /\.(js|jsx)$/.test(lower)) return "babel";
  if (language === "css" || /\.(css|scss|less)$/.test(lower)) return "css";
  if (language === "html" || /\.(html|htm)$/.test(lower)) return "html";
  if (language === "json" || /\.json$/.test(lower)) return "json";
  if (language === "markdown" || /\.(md|markdown)$/.test(lower)) return "markdown";
  return "babel";
}

self.addEventListener("message", async (e: MessageEvent) => {
  const data = e.data as any;
  if (!data || data.type !== "format") return;
  try {
    const code = await prettier.format(data.code as string, {
      parser: parserFrom(data.language as string, data.path as string) as any,
      plugins: [babel, estree, typescript, html, postcss, markdown],
      semi: true,
      singleQuote: false,
      trailingComma: "all",
      tabWidth: 2,
    } as any);
    (self as any).postMessage({ type: "formatted", code });
  } catch (err: any) {
    (self as any).postMessage({ type: "formatted", code: data.code });
  }
});
