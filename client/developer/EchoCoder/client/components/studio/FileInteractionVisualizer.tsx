import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileNode, FileInteractionGraph } from "@/services/FileInteractionAnalyzer";
import { Network, AlertTriangle, Eye, ChevronRight, FileCode } from "lucide-react";

interface FileInteractionVisualizerProps {
  graph: FileInteractionGraph;
  selectedFile?: string;
  onSelectFile?: (path: string) => void;
  onOpenFile?: (path: string) => void;
}

export const FileInteractionVisualizer: React.FC<FileInteractionVisualizerProps> = ({
  graph,
  selectedFile,
  onSelectFile,
  onOpenFile,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"tree" | "graph">("tree");

  const filteredNodes = graph.nodes.filter(
    (node) =>
      node.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const getNodeColor = (type: FileNode["type"]): string => {
    switch (type) {
      case "route":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30";
      case "component":
        return "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30";
      case "service":
        return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
      case "schema":
        return "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "hook":
        return "bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500/30";
      case "util":
        return "bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-500/30";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border/30 space-y-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">File Dependencies</h3>
          <Badge variant="outline" className="ml-auto">
            {graph.nodes.length} files
          </Badge>
        </div>

        {/* Search */}
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
        />

        {/* View Mode */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === "tree" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("tree")}
          >
            Tree
          </Button>
          <Button
            variant={viewMode === "graph" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("graph")}
          >
            Graph
          </Button>
        </div>
      </div>

      {/* Circular Dependencies Alert */}
      {graph.summary.circularDependencies.length > 0 && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Circular dependencies detected</p>
            <p className="text-xs opacity-75">
              {graph.summary.circularDependencies.length} cycle(s) found
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {viewMode === "tree" ? (
            <TreeView
              nodes={filteredNodes}
              selectedFile={selectedFile}
              expandedNodes={expandedNodes}
              onSelectFile={onSelectFile}
              onOpenFile={onOpenFile}
              onToggleExpanded={toggleNodeExpanded}
              getNodeColor={getNodeColor}
            />
          ) : (
            <GraphView
              nodes={filteredNodes}
              graph={graph}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          )}
        </div>
      </ScrollArea>

      {/* Summary Stats */}
      <div className="p-4 border-t border-border/30 text-xs space-y-2 bg-background/50">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-muted-foreground">Most imported</p>
            {graph.summary.mostImported.slice(0, 2).map((path) => (
              <p
                key={path}
                className="text-xs truncate hover:text-blue-500 cursor-pointer"
                onClick={() => onOpenFile?.(path)}
              >
                📦 {path.split("/").pop()}
              </p>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Most importing</p>
            {graph.summary.mostImporting.slice(0, 2).map((path) => (
              <p
                key={path}
                className="text-xs truncate hover:text-blue-500 cursor-pointer"
                onClick={() => onOpenFile?.(path)}
              >
                📤 {path.split("/").pop()}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TreeView: React.FC<{
  nodes: FileNode[];
  selectedFile?: string;
  expandedNodes: Set<string>;
  onSelectFile?: (path: string) => void;
  onOpenFile?: (path: string) => void;
  onToggleExpanded: (id: string) => void;
  getNodeColor: (type: FileNode["type"]) => string;
}> = ({
  nodes,
  selectedFile,
  expandedNodes,
  onSelectFile,
  onOpenFile,
  onToggleExpanded,
  getNodeColor,
}) => {
  // Group nodes by type
  const grouped = nodes.reduce(
    (acc, node) => {
      if (!acc[node.type]) acc[node.type] = [];
      acc[node.type].push(node);
      return acc;
    },
    {} as Record<string, FileNode[]>
  );

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([type, typeNodes]) => (
        <div key={type}>
          <div className="text-xs font-semibold text-muted-foreground capitalize mb-2">
            {type} ({typeNodes.length})
          </div>
          <div className="space-y-1">
            {typeNodes.map((node) => (
              <FileNodeItem
                key={node.id}
                node={node}
                isSelected={selectedFile === node.path}
                isExpanded={expandedNodes.has(node.id)}
                onSelect={onSelectFile}
                onOpen={onOpenFile}
                onToggleExpanded={onToggleExpanded}
                getNodeColor={getNodeColor}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const FileNodeItem: React.FC<{
  node: FileNode;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect?: (path: string) => void;
  onOpen?: (path: string) => void;
  onToggleExpanded: (id: string) => void;
  getNodeColor: (type: FileNode["type"]) => string;
}> = ({ node, isSelected, isExpanded, onSelect, onOpen, onToggleExpanded, getNodeColor }) => {
  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer transition-colors ${
          isSelected
            ? "bg-primary/20 border border-primary/50"
            : "hover:bg-secondary/50"
        }`}
        onClick={() => onSelect?.(node.path)}
      >
        {node.imports.length > 0 || node.importedBy.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(node.id);
            }}
            className="p-0"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </button>
        ) : (
          <div className="w-4" />
        )}

        <FileCode className="w-4 h-4 text-muted-foreground flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs truncate">{node.name}</p>
          <p className="text-xs text-muted-foreground">{node.lines} lines</p>
        </div>

        <Badge className={`text-xs ${getNodeColor(node.type)}`} variant="outline">
          {node.type}
        </Badge>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen?.(node.path);
          }}
          className="p-1 hover:bg-primary/20 rounded transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="ml-6 space-y-1 text-xs">
          {node.imports.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1">Imports:</p>
              {node.imports.map((importPath) => (
                <p key={importPath} className="text-blue-600 dark:text-blue-400 truncate">
                  📥 {importPath.split("/").pop()}
                </p>
              ))}
            </div>
          )}
          {node.importedBy.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1">Imported by:</p>
              {node.importedBy.map((id) => (
                <p key={id} className="text-green-600 dark:text-green-400 truncate">
                  📤 {id.split("/").pop()}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const GraphView: React.FC<{
  nodes: FileNode[];
  graph: FileInteractionGraph;
  selectedFile?: string;
  onSelectFile?: (path: string) => void;
}> = ({ nodes, graph, selectedFile, onSelectFile }) => {
  return (
    <div className="p-4 bg-secondary/20 rounded-lg text-sm text-muted-foreground">
      <div className="space-y-2">
        <p>📊 Interactive Dependency Graph</p>
        <p className="text-xs">
          {graph.nodes.length} files • {graph.edges.length} connections
        </p>
        <p className="text-xs mt-3 text-amber-600 dark:text-amber-400">
          Graph visualization would be rendered here using D3.js or Cytoscape.js
        </p>
        <div className="mt-4 p-3 bg-background/50 rounded border border-border/50 text-xs space-y-1 max-h-48 overflow-auto">
          {graph.edges.slice(0, 10).map((edge, idx) => (
            <p key={idx} className="font-mono">
              {edge.from.split("/").pop()} → {edge.to.split("/").pop()}
            </p>
          ))}
          {graph.edges.length > 10 && (
            <p className="text-muted-foreground">+{graph.edges.length - 10} more...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileInteractionVisualizer;
