import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Copy,
  Download,
  Edit2,
  Save,
  X,
  ChevronDown,
  Search,
  FileCode,
  Folder,
  Lightbulb,
} from "lucide-react";

interface EditorFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
  isSaved: boolean;
}

interface IntegratedCodeEditorProps {
  files?: EditorFile[];
  selectedFile?: string;
  onFileSelect?: (path: string) => void;
  onFileChange?: (path: string, content: string) => void;
  onFileSave?: (path: string, content: string) => void;
  onFileDelete?: (path: string) => void;
}

export const IntegratedCodeEditor: React.FC<IntegratedCodeEditorProps> = ({
  files = [],
  selectedFile,
  onFileSelect,
  onFileChange,
  onFileSave,
  onFileDelete,
}) => {
  const [openTabs, setOpenTabs] = useState<string[]>(selectedFile ? [selectedFile] : []);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Initialize file contents
  useEffect(() => {
    const contents: Record<string, string> = {};
    files.forEach((file) => {
      contents[file.path] = file.content;
    });
    setFileContents(contents);
  }, [files]);

  const currentFile = files.find((f) => f.path === selectedFile);
  const currentContent = fileContents[selectedFile || ""] || "";

  const handleContentChange = (newContent: string) => {
    setFileContents((prev) => ({
      ...prev,
      [selectedFile || ""]: newContent,
    }));
    onFileChange?.(selectedFile || "", newContent);
  };

  const handleSaveFile = () => {
    if (selectedFile) {
      onFileSave?.(selectedFile, fileContents[selectedFile]);
    }
  };

  const handleOpenFile = (path: string) => {
    if (!openTabs.includes(path)) {
      setOpenTabs([...openTabs, path]);
    }
    onFileSelect?.(path);
  };

  const handleCloseTab = (path: string) => {
    setOpenTabs(openTabs.filter((t) => t !== path));
    if (selectedFile === path && openTabs.length > 0) {
      onFileSelect?.(openTabs[0]);
    }
  };

  const toggleFolderExpanded = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const groupedFiles = files.reduce(
    (acc, file) => {
      const folder = file.path.substring(0, file.path.lastIndexOf("/")) || "root";
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push(file);
      return acc;
    },
    {} as Record<string, EditorFile[]>
  );

  const filteredGroups = Object.entries(groupedFiles)
    .map(([folder, folderFiles]) => [
      folder,
      folderFiles.filter((f) =>
        f.path.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    ])
    .filter(([, folderFiles]) => (folderFiles as EditorFile[]).length > 0);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 space-y-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">Code Editor</h3>
          <Badge variant="outline" className="ml-auto">
            {files.length} files
          </Badge>
        </div>
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
        />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* File Browser */}
        <div className="w-64 border-r border-border/50 bg-background/50 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {filteredGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">No files found</p>
              ) : (
                filteredGroups.map(([folder, folderFiles]) => (
                  <div key={folder} className="space-y-1">
                    <button
                      onClick={() => toggleFolderExpanded(folder)}
                      className="flex items-center gap-2 w-full p-1 rounded hover:bg-secondary/50 text-sm text-muted-foreground"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          expandedFolders.has(folder) ? "" : "-rotate-90"
                        }`}
                      />
                      <Folder className="w-4 h-4" />
                      <span className="font-mono text-xs truncate">{folder}</span>
                    </button>

                    {expandedFolders.has(folder) && (
                      <div className="space-y-0.5 ml-4">
                        {(folderFiles as EditorFile[]).map((file) => (
                          <button
                            key={file.path}
                            onClick={() => handleOpenFile(file.path)}
                            className={`flex items-center gap-2 w-full p-2 rounded text-sm transition-colors ${
                              selectedFile === file.path
                                ? "bg-primary/20 text-primary"
                                : "hover:bg-secondary/50 text-muted-foreground"
                            }`}
                          >
                            <FileText className="w-3 h-3 flex-shrink-0" />
                            <span className="font-mono text-xs truncate">
                              {file.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {currentFile ? (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50 bg-background/50 overflow-x-auto">
                {openTabs.map((tabPath) => {
                  const file = files.find((f) => f.path === tabPath);
                  const isDirty = fileContents[tabPath] !== file?.content;
                  return (
                    <div
                      key={tabPath}
                      className={`flex items-center gap-2 px-3 py-1 rounded-t border-b-2 text-sm cursor-pointer transition-colors ${
                        selectedFile === tabPath
                          ? "border-primary bg-background text-foreground"
                          : "border-transparent bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                      }`}
                      onClick={() => onFileSelect?.(tabPath)}
                    >
                      <FileText className="w-3 h-3" />
                      <span className="font-mono text-xs">{file?.name}</span>
                      {isDirty && <span className="text-amber-500">●</span>}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTab(tabPath);
                        }}
                        className="p-0.5 hover:bg-primary/20 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Code Editor */}
              <div className="flex-1 flex flex-col overflow-hidden bg-secondary/5">
                {/* Editor Toolbar */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-background/30">
                  <Badge variant="outline" className="text-xs">
                    {currentFile.language.toUpperCase()}
                  </Badge>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(currentContent);
                    }}
                    className="gap-2 text-xs h-7"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveFile}
                    className="gap-2 text-xs h-7"
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </Button>
                </div>

                {/* Editor Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Line Numbers and Code */}
                  <div className="flex-1 overflow-auto">
                    <pre className="font-mono text-xs p-4 leading-relaxed whitespace-pre-wrap break-words">
                      {currentContent.split("\n").map((line, idx) => (
                        <div key={idx} className="flex">
                          <span className="w-12 text-right pr-4 text-muted-foreground select-none">
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-foreground">{line}</span>
                        </div>
                      ))}
                    </pre>
                  </div>

                  {/* Editor Controls */}
                  <div className="border-t border-border/30 p-3 bg-background/50 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4">
                        <span>Lines: {currentContent.split("\n").length}</span>
                        <span>Size: {currentContent.length} bytes</span>
                      </div>
                      <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Lightbulb className="w-3 h-3" />
                        AI Suggestions
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <FileCode className="w-12 h-12 mx-auto opacity-50" />
                <p>No file selected</p>
                <p className="text-xs">Choose a file from the explorer</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - File Info */}
        {currentFile && (
          <div className="w-48 border-l border-border/50 bg-background/50 p-4 flex flex-col gap-4 text-xs">
            <div>
              <p className="text-muted-foreground mb-2">File Info</p>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Path:</span>
                  <p className="font-mono truncate">{currentFile.path}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-mono">{currentFile.language}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <p className="font-mono">{currentContent.length} bytes</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground mb-2">Interactions</p>
              <p className="text-xs text-muted-foreground italic">
                File interactions would appear here (what imports/exports this file)
              </p>
            </div>

            <div className="mt-auto">
              <Button
                variant="destructive"
                size="sm"
                className="w-full text-xs"
                onClick={() => onFileDelete?.(currentFile.path)}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegratedCodeEditor;
