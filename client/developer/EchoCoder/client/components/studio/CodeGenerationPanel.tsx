import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Download,
  Copy,
  Eye,
  Code,
  Database,
  Zap,
  CheckCircle,
  AlertCircle,
  FileJson,
  FileCode,
} from "lucide-react";
import { codeGenerationEngine, GenerationResult, GeneratedFile } from "@/services/CodeGenerationEngine";
import { fileGenerationService } from "@/services/FileGenerationService";
import { DialogUnderstanding } from "@/services/RealAIConversationService";
import { CodeQualityDashboard } from "./CodeQualityDashboard";
import { CodeSuggestionsPanel } from "./CodeSuggestionsPanel";
import { codeFileAnalyzer } from "@/services/CodeFileAnalyzer";
import { codeSuggestionsService, CodeSuggestion } from "@/services/CodeSuggestionsService";

interface CodeGenerationPanelProps {
  understanding: DialogUnderstanding;
  onGenerationComplete: (files: GeneratedFile[]) => void;
}

export const CodeGenerationPanel: React.FC<CodeGenerationPanelProps> = ({
  understanding,
  onGenerationComplete,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [qualityAnalyzed, setQualityAnalyzed] = useState(false);

  useEffect(() => {
    // Auto-start generation when component mounts
    if (!isGenerating && !generationResult) {
      startGeneration();
    }
  }, []);

  const startGeneration = async () => {
    setIsGenerating(true);
    setGenerationProgress("Analyzing requirements...");

    try {
      setGenerationProgress("Generating database schema...");
      const result = await codeGenerationEngine.generateCompleteSystem(understanding);

      setGenerationProgress("Processing generated files...");
      fileGenerationService.storeFiles(result.files);

      setGenerationResult(result);
      setSelectedFile(result.files[0]);
      onGenerationComplete(result.files);

      // Auto-start quality analysis
      setIsGenerating(false);
      setIsAnalyzing(true);
      setGenerationProgress("Analyzing code quality...");

      setTimeout(async () => {
        try {
          const generatedSuggestions = await codeSuggestionsService.generateSuggestions(result.files);
          setSuggestions(generatedSuggestions);
          setQualityAnalyzed(true);
          setGenerationProgress("Analysis complete!");
          setIsAnalyzing(false);
        } catch (error) {
          console.error("Analysis failed:", error);
          setIsAnalyzing(false);
        }
      }, 500);
    } catch (error) {
      console.error("Generation failed:", error);
      setGenerationProgress(
        `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (content: string, path: string) => {
    navigator.clipboard.writeText(content);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const downloadFile = (file: GeneratedFile) => {
    fileGenerationService.downloadFile(file.path);
  };

  const downloadAllAsZip = async () => {
    await fileGenerationService.downloadAllAsZip();
  };

  const getFileIcon = (file: GeneratedFile) => {
    if (file.path.includes("routes")) return <Zap className="w-4 h-4" />;
    if (file.path.includes("schema")) return <Database className="w-4 h-4" />;
    if (file.path.includes("components")) return <Code className="w-4 h-4" />;
    if (file.type === "json") return <FileJson className="w-4 h-4" />;
    return <FileCode className="w-4 h-4" />;
  };

  if (isGenerating && !generationResult) {
    return (
      <Card className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Generating Code</h3>
        <p className="text-slate-400 text-center max-w-md">{generationProgress}</p>
        <div className="mt-6 w-full max-w-md">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }

  if (!generationResult) {
    return (
      <Card className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Generation Failed</h3>
        <p className="text-slate-400 text-center mb-6">{generationProgress}</p>
        <Button onClick={startGeneration} className="gap-2">
          <Zap className="w-4 h-4" />
          Retry Generation
        </Button>
      </Card>
    );
  }

  const stats = fileGenerationService.getStatistics();
  const groupedFiles = fileGenerationService.getFilesGroupedByDirectory();

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-400" />
            Code Generated Successfully
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={downloadAllAsZip}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download All
            </Button>
          </div>
        </div>
        <p className="text-sm text-slate-400">
          {stats.totalFiles} files • {(stats.totalSize / 1024).toFixed(1)} KB
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* File List */}
        <div className="w-80 border-r border-slate-700 bg-slate-850 overflow-auto">
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-3">
            <h3 className="font-semibold text-white text-sm">Generated Files</h3>
          </div>

          <ScrollArea className="h-full">
            <div className="p-2">
              {generationResult.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                    selectedFile?.path === file.path
                      ? "bg-cyan-600/20 border border-cyan-500"
                      : "hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {file.path.split("/").pop()}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{file.path}</p>
                      <p className="text-xs text-slate-500 mt-1">{file.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Code Viewer */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start border-b border-slate-700 bg-slate-900 rounded-none">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="quality">Quality</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
              <TabsTrigger value="architecture">Architecture</TabsTrigger>
              <TabsTrigger value="dataflow">Data Flow</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 overflow-auto">
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Summary</h3>
                  <p className="text-slate-300 whitespace-pre-wrap">
                    {generationResult.summary}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 bg-slate-800 border-slate-700">
                      <p className="text-slate-400 text-sm">Total Files</p>
                      <p className="text-2xl font-bold text-cyan-400">{stats.totalFiles}</p>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                      <p className="text-slate-400 text-sm">Code Size</p>
                      <p className="text-2xl font-bold text-cyan-400">
                        {(stats.totalSize / 1024).toFixed(1)} KB
                      </p>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                      <p className="text-slate-400 text-sm">TypeScript Files</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {stats.byType["typescript"] || 0}
                      </p>
                    </Card>
                    <Card className="p-4 bg-slate-800 border-slate-700">
                      <p className="text-slate-400 text-sm">SQL Schemas</p>
                      <p className="text-2xl font-bold text-amber-400">
                        {stats.byType["sql"] || 0}
                      </p>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="code" className="flex-1 overflow-auto">
              {selectedFile ? (
                <div className="h-full flex flex-col">
                  <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{selectedFile.path}</h3>
                      <p className="text-sm text-slate-400">{selectedFile.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(selectedFile.content, selectedFile.path)}
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        {copiedPath === selectedFile.path ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadFile(selectedFile)}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <pre className="p-4 text-sm text-slate-300 font-mono bg-slate-900 whitespace-pre-wrap break-words">
                      {selectedFile.content}
                    </pre>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  Select a file to view its content
                </div>
              )}
            </TabsContent>

            <TabsContent value="quality" className="flex-1 overflow-auto">
              {qualityAnalyzed ? (
                <CodeQualityDashboard files={generationResult.files} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-2 animate-spin text-blue-400" />
                    <p>Analyzing code quality...</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="flex-1 overflow-auto">
              {qualityAnalyzed ? (
                <CodeSuggestionsPanel
                  suggestions={suggestions}
                  isLoading={isAnalyzing}
                  onApplySuggestion={async (suggestion) => {
                    // Suggestion application logic would go here
                    console.log("Applying suggestion:", suggestion.title);
                  }}
                  onDownloadRoadmap={() => {
                    const roadmap = codeSuggestionsService.generateRoadmap(suggestions);
                    const element = document.createElement("a");
                    element.href = URL.createObjectURL(new Blob([roadmap], { type: "text/markdown" }));
                    element.download = "refactoring-roadmap.md";
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-2 animate-spin text-blue-400" />
                    <p>Generating suggestions...</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="architecture" className="flex-1 overflow-auto">
              <div className="p-6">
                <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words bg-slate-800 p-4 rounded-lg">
                  {generationResult.architecture}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="dataflow" className="flex-1 overflow-auto">
              <div className="p-6">
                <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words bg-slate-800 p-4 rounded-lg">
                  {generationResult.dataFlow}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 bg-slate-900 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Generated files are ready to use. Download and integrate them into your project.
          </p>
          <Button onClick={startGeneration} variant="outline" className="gap-2">
            <Zap className="w-4 h-4" />
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
};
