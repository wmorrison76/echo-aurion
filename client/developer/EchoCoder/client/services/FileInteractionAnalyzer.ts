export interface FileNode {
  id: string;
  path: string;
  name: string;
  type: "route" | "component" | "service" | "schema" | "hook" | "util" | "other";
  content: string;
  imports: string[]; // paths this file imports from
  importedBy: string[]; // paths that import this file
  lines: number;
  complexity: "low" | "medium" | "high";
}

export interface FileInteractionGraph {
  nodes: FileNode[];
  edges: Array<{ from: string; to: string; type: "import" | "export" }>;
  summary: {
    totalFiles: number;
    byType: Record<string, number>;
    mostImported: string[];
    mostImporting: string[];
    circularDependencies: string[][];
  };
}

class FileInteractionAnalyzerService {
  private graph: FileInteractionGraph = {
    nodes: [],
    edges: [],
    summary: {
      totalFiles: 0,
      byType: {},
      mostImported: [],
      mostImporting: [],
      circularDependencies: [],
    },
  };

  analyzeFiles(files: Array<{ path: string; content: string; type?: string }>) {
    this.graph.nodes = [];
    this.graph.edges = [];

    // Create nodes for each file
    files.forEach((file) => {
      const node = this.createNode(file);
      this.graph.nodes.push(node);
    });

    // Analyze imports and create edges
    this.graph.nodes.forEach((node) => {
      this.analyzeImportsInFile(node);
    });

    // Calculate summary
    this.calculateSummary();

    return this.graph;
  }

  private createNode(file: { path: string; content: string; type?: string }): FileNode {
    const fileType = this.detectFileType(file.path);
    const lines = file.content.split("\n").length;
    const complexity = this.calculateComplexity(file.content);

    return {
      id: file.path,
      path: file.path,
      name: this.getFileName(file.path),
      type: fileType,
      content: file.content,
      imports: [],
      importedBy: [],
      lines,
      complexity,
    };
  }

  private analyzeImportsInFile(node: FileNode) {
    // Match import statements
    const importPatterns = [
      /import\s+(?:{[^}]*}|[^from]+)\s+from\s+["']([^"']+)["']/g,
      /require\s+\(["']([^"']+)["']\)/g,
      /from\s+["']([^"']+)["']/g,
    ];

    const imports: Set<string> = new Set();

    importPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(node.content)) !== null) {
        let importPath = match[1];

        // Resolve relative imports to absolute paths
        if (importPath.startsWith(".")) {
          importPath = this.resolveRelativePath(node.path, importPath);
        }

        imports.add(importPath);
      }
    });

    node.imports = Array.from(imports);

    // Create edges and update importedBy
    node.imports.forEach((importPath) => {
      const targetNode = this.graph.nodes.find((n) => n.path === importPath);

      if (targetNode) {
        this.graph.edges.push({
          from: node.id,
          to: targetNode.id,
          type: "import",
        });

        if (!targetNode.importedBy.includes(node.id)) {
          targetNode.importedBy.push(node.id);
        }
      }
    });
  }

  private calculateSummary() {
    // Count by type
    this.graph.summary.byType = {};
    this.graph.nodes.forEach((node) => {
      this.graph.summary.byType[node.type] =
        (this.graph.summary.byType[node.type] || 0) + 1;
    });

    // Most imported files
    this.graph.summary.mostImported = this.graph.nodes
      .sort((a, b) => b.importedBy.length - a.importedBy.length)
      .slice(0, 5)
      .map((n) => n.path);

    // Most importing files
    this.graph.summary.mostImporting = this.graph.nodes
      .sort((a, b) => b.imports.length - a.imports.length)
      .slice(0, 5)
      .map((n) => n.path);

    // Detect circular dependencies
    this.graph.summary.circularDependencies = this.findCircularDependencies();

    this.graph.summary.totalFiles = this.graph.nodes.length;
  }

  private findCircularDependencies(): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = this.graph.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      node.imports.forEach((importPath) => {
        const targetNode = this.graph.nodes.find((n) => n.path === importPath);
        if (!targetNode) return;

        if (!visited.has(targetNode.id)) {
          dfs(targetNode.id, [...path, targetNode.id]);
        } else if (recursionStack.has(targetNode.id)) {
          const cycleStart = path.indexOf(targetNode.id);
          const cycle = [...path.slice(cycleStart), targetNode.id];
          cycles.push(cycle);
        }
      });

      recursionStack.delete(nodeId);
    };

    this.graph.nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        dfs(node.id, [node.id]);
      }
    });

    return cycles;
  }

  private detectFileType(
    path: string
  ): FileNode["type"] {
    if (path.includes("/routes/")) return "route";
    if (path.includes("/components/")) return "component";
    if (path.includes("/services/")) return "service";
    if (path.includes("/hooks/")) return "hook";
    if (path.includes(".sql")) return "schema";
    if (path.includes("/lib/") || path.includes("/utils/")) return "util";
    return "other";
  }

  private calculateComplexity(content: string): FileNode["complexity"] {
    const lines = content.split("\n").length;
    const functions = (content.match(/function|const.*=.*\(/g) || []).length;
    const imports = (content.match(/import|require/g) || []).length;

    const score = lines / 100 + functions / 10 + imports / 5;

    if (score > 10) return "high";
    if (score > 5) return "medium";
    return "low";
  }

  private getFileName(path: string): string {
    return path.split("/").pop() || path;
  }

  private resolveRelativePath(fromPath: string, importPath: string): string {
    const fromDir = fromPath.substring(0, fromPath.lastIndexOf("/"));
    const parts = importPath.split("/");
    let resolved = fromDir;

    for (const part of parts) {
      if (part === "..") {
        resolved = resolved.substring(0, resolved.lastIndexOf("/"));
      } else if (part !== ".") {
        resolved += "/" + part;
      }
    }

    // Add common extensions if not present
    if (!resolved.includes(".")) {
      for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
        if (resolved.endsWith(ext)) return resolved;
      }
      return resolved + ".ts";
    }

    return resolved;
  }

  getNodeById(id: string): FileNode | undefined {
    return this.graph.nodes.find((n) => n.id === id);
  }

  getImportChain(fromPath: string, toPath: string): string[] | null {
    // BFS to find shortest path from fromPath to toPath
    const queue: Array<{ nodeId: string; path: string[] }> = [
      { nodeId: fromPath, path: [fromPath] },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (nodeId === toPath) {
        return path;
      }

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = this.graph.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      node.imports.forEach((importPath) => {
        const targetNode = this.graph.nodes.find((n) => n.path === importPath);
        if (targetNode && !visited.has(targetNode.id)) {
          queue.push({
            nodeId: targetNode.id,
            path: [...path, targetNode.id],
          });
        }
      });
    }

    return null; // No import chain found
  }

  getImpactAnalysis(filePath: string): {
    directDependents: string[];
    transitiveDependents: string[];
    directDependencies: string[];
    transitiveDependencies: string[];
  } {
    const node = this.graph.nodes.find((n) => n.id === filePath);
    if (!node) {
      return {
        directDependents: [],
        transitiveDependents: [],
        directDependencies: [],
        transitiveDependencies: [],
      };
    }

    const transitiveDependents = new Set<string>();
    const transitiveDependencies = new Set<string>();

    // DFS for transitive dependents
    const dfsDependent = (nodeId: string) => {
      const current = this.graph.nodes.find((n) => n.id === nodeId);
      if (!current) return;

      current.importedBy.forEach((id) => {
        if (!transitiveDependents.has(id)) {
          transitiveDependents.add(id);
          dfsDependent(id);
        }
      });
    };

    // DFS for transitive dependencies
    const dfsDependency = (nodeId: string) => {
      const current = this.graph.nodes.find((n) => n.id === nodeId);
      if (!current) return;

      current.imports.forEach((path) => {
        const id = this.graph.nodes.find((n) => n.path === path)?.id;
        if (id && !transitiveDependencies.has(id)) {
          transitiveDependencies.add(id);
          dfsDependency(id);
        }
      });
    };

    dfsDependent(filePath);
    dfsDependency(filePath);

    return {
      directDependents: node.importedBy,
      transitiveDependents: Array.from(transitiveDependents),
      directDependencies: node.imports.map(
        (path) => this.graph.nodes.find((n) => n.path === path)?.id || path
      ),
      transitiveDependencies: Array.from(transitiveDependencies),
    };
  }

  getGraph(): FileInteractionGraph {
    return this.graph;
  }
}

export const fileInteractionAnalyzer = new FileInteractionAnalyzerService();
