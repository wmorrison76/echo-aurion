export interface FileEntry {
  path: string;
  type: FileType;
  size: number;
  content?: string;
  dependencies: string[];
  isConnected: boolean;
}

export type FileType =
  | "source"
  | "config"
  | "style"
  | "doc"
  | "asset"
  | "other";

// Patterns to identify connected files
const SOURCE_PATTERN = /\.(ts|tsx|js|jsx)$/;
const CONFIG_PATTERN = /\.(json|yaml|yml|env|xml|toml|conf|config)$/;
const STYLE_PATTERN = /\.(css|scss|sass|less)$/;
const DOC_PATTERN = /\.(md|txt|rst)$/;
const ASSET_PATTERN = /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf)$/;

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /dist/,
  /build/,
  /\.turbo/,
  /coverage/,
  /\.env\.local/,
  // EchoCoder protected files
  /client\/components\/echo\//,
  /client\/components\/studio\//,
  /client\/core\/ai3\//,
  /client\/lib\/automation\.ts/,
  /client\/lib\/guard-client\.ts/,
];

const IMPORT_PATTERNS = [
  /import\s+.*?from\s+['"]([^'"]+)['"]/g,
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /@import\s+['"]([^'"]+)['"]/g,
];

export function getFileType(path: string): FileType {
  if (SOURCE_PATTERN.test(path)) return "source";
  if (CONFIG_PATTERN.test(path)) return "config";
  if (STYLE_PATTERN.test(path)) return "style";
  if (DOC_PATTERN.test(path)) return "doc";
  if (ASSET_PATTERN.test(path)) return "asset";
  return "other";
}

export function shouldExcludeFile(path: string): boolean {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(path));
}

export function extractDependencies(content: string): string[] {
  const dependencies = new Set<string>();

  IMPORT_PATTERNS.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const depPath = match[1];
      // Filter out relative paths and node_modules
      if (!depPath.startsWith(".") && !depPath.startsWith("node_modules")) {
        dependencies.add(depPath);
      }
    }
  });

  return Array.from(dependencies);
}

export function analyzeFileConnection(
  file: FileEntry,
  allFiles: FileEntry[],
  fileContentMap: Map<string, string>
): { connections: string[]; score: number } {
  const connections = new Set<string>();
  let score = 0;

  // Config files are always connected
  if (file.type === "config") {
    return { connections: Array.from(connections), score: 100 };
  }

  // Get file content to check for imports
  const content = fileContentMap.get(file.path) || "";
  const dependencies = extractDependencies(content);

  // Check if file is in a meaningful directory
  const pathParts = file.path.split("/").filter((p) => p && p !== ".");
  const isTestFile =
    pathParts.some((p) => p === "test" || p === "tests" || p === "__tests__") ||
    file.path.includes(".test.") ||
    file.path.includes(".spec.");

  // Find matching files
  dependencies.forEach((dep) => {
    const matchingFiles = allFiles.filter((f) => {
      const fPath = f.path.toLowerCase();
      const depLower = dep.toLowerCase();
      return (
        fPath.includes(depLower) ||
        fPath.endsWith(`.ts`) ||
        fPath.endsWith(`.tsx`) ||
        fPath.endsWith(`.js`) ||
        fPath.endsWith(`.jsx`)
      );
    });

    matchingFiles.forEach((f) => {
      connections.add(f.path);
      score += 10;
    });
  });

  // Check if other files import this file
  allFiles.forEach((otherFile) => {
    if (otherFile.path === file.path) return;

    const otherContent = fileContentMap.get(otherFile.path) || "";
    const otherDeps = extractDependencies(otherContent);

    otherDeps.forEach((dep) => {
      if (file.path.includes(dep) || dep.includes(file.path.split("/").pop()!)) {
        connections.add(otherFile.path);
        score += 5;
      }
    });
  });

  // Boost score for source files in active directories
  if (file.type === "source" && !isTestFile && connections.size > 0) {
    score += 20;
  }

  // Penalize test files unless referenced
  if (isTestFile && connections.size === 0) {
    score = 0;
  }

  return {
    connections: Array.from(connections).slice(0, 10),
    score: Math.min(score, 100),
  };
}

export function detectConnectedFiles(
  files: FileEntry[],
  fileContentMap: Map<string, string>,
  threshold: number = 30
): FileEntry[] {
  return files
    .map((file) => {
      const { connections, score } = analyzeFileConnection(
        file,
        files,
        fileContentMap
      );
      return {
        ...file,
        dependencies: connections,
        isConnected: score >= threshold,
      };
    })
    .sort((a, b) => {
      // Sort by: connected first, then by type (source > config > style > doc > other), then by path
      if (a.isConnected !== b.isConnected) {
        return a.isConnected ? -1 : 1;
      }
      const typeOrder = { source: 0, config: 1, style: 2, doc: 3, other: 4 };
      const aOrder = typeOrder[a.type as keyof typeof typeOrder];
      const bOrder = typeOrder[b.type as keyof typeof typeOrder];
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.path.localeCompare(b.path);
    });
}
