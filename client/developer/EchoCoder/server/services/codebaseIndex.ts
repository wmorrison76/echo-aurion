import { promises as fs } from "fs";
import path from "path";

type IndexedFile = {
  path: string;
  size: number;
  extension: string;
};

const DEFAULT_ROOTS = ["client", "server", "shared"];
const IGNORED_DIRS = [
  "node_modules",
  ".git",
  ".zaro",
  ".echocoder",
  "dist",
  "build",
  ".next",
  "coverage",
  "uploads",
  "public",
];

const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".css",
  ".yaml",
  ".yml",
]);

const MAX_FILE_SIZE_BYTES = 250 * 1024;

function isIgnoredDir(dirName: string) {
  return IGNORED_DIRS.includes(dirName);
}

function isAllowedFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

async function walkDir(
  cwd: string,
  dirPath: string,
  results: IndexedFile[],
): Promise<void> {
  const absolute = path.join(cwd, dirPath);
  let entries: fs.Dirent[] = [];
  try {
    entries = await fs.readdir(absolute, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (isIgnoredDir(entry.name)) continue;
      await walkDir(cwd, path.join(dirPath, entry.name), results);
      continue;
    }

    if (!entry.isFile()) continue;
    const relPath = path.join(dirPath, entry.name);
    if (!isAllowedFile(relPath)) continue;

    try {
      const stat = await fs.stat(path.join(cwd, relPath));
      if (!stat.isFile()) continue;
      results.push({
        path: relPath.replace(/\\/g, "/"),
        size: stat.size,
        extension: path.extname(entry.name).slice(1).toLowerCase(),
      });
    } catch {
      continue;
    }
  }
}

export async function indexCodebase(
  cwd: string,
  roots: string[] = DEFAULT_ROOTS,
): Promise<IndexedFile[]> {
  const results: IndexedFile[] = [];
  for (const root of roots) {
    await walkDir(cwd, root, results);
  }
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

export async function readCodeFile(
  cwd: string,
  relativePath: string,
): Promise<{ content: string; truncated: boolean }> {
  const safePath = relativePath.replace(/^\/+/, "");
  const absolute = path.join(cwd, safePath);
  const stat = await fs.stat(absolute);
  if (!stat.isFile()) {
    throw new Error("Requested path is not a file.");
  }
  if (!isAllowedFile(safePath)) {
    throw new Error("File type not supported.");
  }

  const truncated = stat.size > MAX_FILE_SIZE_BYTES;
  const buffer = await fs.readFile(absolute);
  const content = truncated
    ? buffer.slice(0, MAX_FILE_SIZE_BYTES).toString("utf8")
    : buffer.toString("utf8");
  return { content, truncated };
}
