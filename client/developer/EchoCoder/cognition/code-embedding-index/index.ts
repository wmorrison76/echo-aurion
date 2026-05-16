import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export interface EmbeddingDocument {
  id: string;
  path: string;
  language: string;
  checksum: string;
  content: string;
}

export interface IndexOptions {
  root: string;
  includeExtensions?: string[];
  excludeDirs?: string[];
  sizeLimitKb?: number;
}

const DEFAULT_EXTENSIONS = [".ts", ".tsx", ".py", ".json", ".yaml", ".md"];
const DEFAULT_EXCLUDES = ["node_modules", "dist", ".git", "coverage", "build"];

export async function buildEmbeddingIndex(options: IndexOptions): Promise<EmbeddingDocument[]> {
  const includeExtensions = options.includeExtensions ?? DEFAULT_EXTENSIONS;
  const excludeDirs = new Set((options.excludeDirs ?? DEFAULT_EXCLUDES).map((dir) => path.resolve(options.root, dir)));
  const sizeLimitBytes = (options.sizeLimitKb ?? 256) * 1024;
  const documents: EmbeddingDocument[] = [];

  async function walk(dir: string) {
    if (excludeDirs.has(path.resolve(dir))) {
      return;
    }
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }
      const ext = path.extname(entry.name);
      if (!includeExtensions.includes(ext)) {
        continue;
      }
      const fileStat = await stat(entryPath);
      if (!fileStat.isFile() || fileStat.size > sizeLimitBytes) {
        continue;
      }
      const content = await readFile(entryPath, "utf8");
      documents.push({
        id: createHash("sha1").update(entryPath).digest("hex"),
        path: path.relative(options.root, entryPath),
        language: ext.replace(/^\./, ""),
        checksum: createHash("sha256").update(content).digest("hex"),
        content,
      });
    }
  }

  await walk(options.root);
  return documents;
}
