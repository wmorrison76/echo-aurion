import React, { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface TermData {
  term: string;
  pronunciation?: string;
  etymology?: string;
  definition: string;
}

interface UploadProgress {
  fileName: string;
  status: "pending" | "uploading" | "success" | "error";
  message: string;
  termCount?: number;
}

const REGIONS = [
  { id: "chinese", label: "Chinese", emoji: "🇨🇳" },
  { id: "japanese", label: "Japanese", emoji: "🇯🇵" },
  { id: "thai", label: "Thai", emoji: "🇹🇭" },
  { id: "korean", label: "Korean", emoji: "🇰🇷" },
  { id: "indian", label: "Indian", emoji: "🇮🇳" },
  { id: "vietnamese", label: "Vietnamese", emoji: "🇻🇳" },
  { id: "french", label: "French", emoji: "🇫🇷" },
  { id: "italian", label: "Italian", emoji: "🇮🇹" },
  { id: "spanish", label: "Spanish", emoji: "🇪🇸" },
  { id: "german", label: "German", emoji: "🇩🇪" },
  { id: "mexican", label: "Mexican", emoji: "🇲🇽" },
  { id: "brazilian", label: "Brazilian", emoji: "🇧🇷" },
  { id: "american", label: "American", emoji: "🇺🇸" },
  { id: "middle-eastern", label: "Middle Eastern", emoji: "🌍" },
  { id: "african", label: "African", emoji: "🌍" },
  { id: "oceanic", label: "Oceanic", emoji: "🌊" },
];

export function TermJsonUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [totalTermsUploaded, setTotalTermsUploaded] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;
    await processFiles(files);
  };

  const processFiles = async (files: FileList) => {
    const fileArray = Array.from(files).filter(
      (f) => f.type === "application/json",
    );

    if (fileArray.length === 0) {
      toast.error("Please select valid JSON files");
      return;
    }

    setUploadProgress(
      fileArray.map((f) => ({
        fileName: f.name,
        status: "pending" as const,
        message: "Queued for upload",
      })),
    );

    setIsUploading(true);

    for (const file of fileArray) {
      await uploadFile(file);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const isManifestFile = (fileName: string, content: any): boolean => {
    const lowerName = fileName.toLowerCase();

    // Echo knowledge capsule manifest
    if (
      lowerName === "echo_knowledge_capsule.json" ||
      lowerName === "echo-knowledge-capsule.json"
    ) {
      return (
        content.capsule_name &&
        content.content_files &&
        Array.isArray(content.content_files)
      );
    }

    // Index manifest (maps categories to files)
    if (lowerName === "index.json") {
      // Check if it looks like a manifest (has file references) vs a term array
      if (Array.isArray(content)) {
        return false; // It's an array, treat as terms
      }
      const keys = Object.keys(content);
      if (keys.length === 0) return false;
      const firstValue = Object.values(content)[0];
      // If it has "lookup" or category entries with "file" references, it's a manifest
      return (
        content.lookup !== undefined ||
        (typeof firstValue === "object" &&
          ("file" in firstValue || "count" in firstValue))
      );
    }

    // Graph links - could be manifest with graph structure
    if (lowerName === "graph_links.json") {
      if (Array.isArray(content)) {
        return false; // If it's an array, it's data to upload
      }
      // If it has nodes/links/graph structure, it's a manifest
      return content.nodes !== undefined || content.links !== undefined;
    }

    return false;
  };

  const uploadFile = async (file: File) => {
    const fileName = file.name;

    try {
      setUploadProgress((prev) =>
        prev.map((p) =>
          p.fileName === fileName
            ? { ...p, status: "uploading", message: "Reading file..." }
            : p,
        ),
      );

      const text = await file.text();
      console.log(
        `[TermUploader] ${fileName}: Raw file size: ${text.length} bytes`,
      );

      const content: any = JSON.parse(text);
      console.log(`[TermUploader] ${fileName}: Parsed JSON content`);

      if (isManifestFile(fileName, content)) {
        console.log(
          `[TermUploader] ${fileName}: Detected as manifest file, skipping upload`,
        );

        setUploadProgress((prev) =>
          prev.map((p) =>
            p.fileName === fileName
              ? {
                  ...p,
                  status: "success",
                  message:
                    "Manifest file - content files will be processed separately",
                  termCount: 0,
                }
              : p,
          ),
        );

        toast.info(
          `${fileName}: Manifest file detected. Upload the referenced content files.`,
        );
        return;
      }

      if (!Array.isArray(content)) {
        throw new Error("JSON must be an array of terms");
      }

      const terms: TermData[] = content;
      console.log(
        `[TermUploader] ${fileName}: Parsed ${terms.length} terms from JSON`,
      );
      console.log(
        `[TermUploader] ${fileName}: First 3 terms:`,
        terms.slice(0, 3),
      );
      console.log(`[TermUploader] ${fileName}: Last 3 terms:`, terms.slice(-3));

      if (terms.length === 0) {
        throw new Error("JSON file is empty");
      }

      const payload = JSON.stringify({
        terms,
        region: selectedRegion,
      });
      console.log(
        `[TermUploader] ${fileName}: Payload size: ${payload.length} bytes, contains ${terms.length} items`,
      );

      setUploadProgress((prev) =>
        prev.map((p) =>
          p.fileName === fileName
            ? {
                ...p,
                status: "uploading",
                message: `Uploading ${terms.length} terms...`,
              }
            : p,
        ),
      );

      const body: Record<string, any> = { terms };

      if (selectedRegion) {
        body.region = selectedRegion;
      }

      if (terms.length > 0 && (terms[0] as any).category) {
        body.category = (terms[0] as any).category;
      }

      const response = await fetch("/api/knowledge/upload-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let result: any = null;
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        try {
          result = await response.json();
        } catch {
          throw new Error("Server returned invalid JSON response");
        }
      } else {
        const text = await response.text();
        result = {
          error: text || response.statusText || "Unknown server error",
        };
      }

      if (!response.ok) {
        const errorMsg =
          result?.error ||
          result?.message ||
          response.statusText ||
          "Unknown error occurred";
        throw new Error(errorMsg);
      }

      if (!result?.uploadedCount) {
        throw new Error("Invalid server response: missing uploadedCount");
      }

      setUploadProgress((prev) =>
        prev.map((p) =>
          p.fileName === fileName
            ? {
                ...p,
                status: "success",
                message: `Successfully uploaded ${result.uploadedCount} terms`,
                termCount: result.uploadedCount,
              }
            : p,
        ),
      );

      setTotalTermsUploaded((prev) => prev + result.uploadedCount);
      const destination =
        selectedRegion || (terms[0] as any)?.category || "knowledge base";
      toast.success(
        `${fileName}: ${result.uploadedCount} terms added to ${destination}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";

      setUploadProgress((prev) =>
        prev.map((p) =>
          p.fileName === fileName
            ? {
                ...p,
                status: "error",
                message: `Error: ${message}`,
              }
            : p,
        ),
      );

      toast.error(`${fileName}: ${message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "uploading":
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Upload className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <Card className="p-6 space-y-4 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-amber-50/50 dark:from-blue-950/30 dark:to-neutral-950/30">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Upload Culinary Terms
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Import JSON files with culinary terms to expand Echo's knowledge base
        </p>
      </div>

      {/* Region Selection (Optional - for legacy format) */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Regional Cuisine (Optional - Auto-detected from file category)
        </label>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {REGIONS.map((region) => (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region.id)}
              className={`p-2 rounded-lg transition-all text-center ${
                selectedRegion === region.id
                  ? "bg-blue-500 text-white ring-2 ring-blue-300"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              }`}
              title={region.label}
            >
              <div className="text-lg">{region.emoji}</div>
              <div className="text-xs font-medium truncate">{region.label}</div>
            </button>
          ))}
        </div>
        {selectedRegion ? (
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Terms will be added to:{" "}
            <strong>
              {REGIONS.find((r) => r.id === selectedRegion)?.label}
            </strong>
          </p>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Category will be auto-detected from file (or use selection above)
          </p>
        )}
      </div>

      {/* File Upload Input */}
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed transition-all ${
            isDragActive
              ? "border-blue-500 bg-blue-100 dark:bg-blue-900/40"
              : "border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          } ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div className="text-center">
              <p className="font-medium text-gray-900 dark:text-white">
                {isDragActive
                  ? "Drop files here"
                  : "Click to upload or drag JSON files"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Format: {`{"term": "", "definition": ""}`}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Upload Status
          </p>
          <div className="space-y-2">
            {uploadProgress.map((progress) => (
              <div
                key={progress.fileName}
                className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                {getStatusIcon(progress.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                    {progress.fileName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {progress.message}
                  </p>
                </div>
                {progress.termCount && (
                  <Badge variant="secondary" className="flex-shrink-0">
                    {progress.termCount} terms
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total Uploaded Counter */}
      {totalTermsUploaded > 0 && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            ✓ Total terms uploaded: <strong>{totalTermsUploaded}</strong>
          </p>
        </div>
      )}

      {/* Format Help */}
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
          <p className="font-medium mb-2 text-blue-900 dark:text-blue-100">
            Term File Format:
          </p>
          <code className="block bg-blue-100 dark:bg-blue-900/50 p-2 rounded text-xs overflow-auto text-blue-900 dark:text-blue-100">
            {`[{"term": "Term Name", "pronunciation": "optional", "etymology": "optional", "definition": "Definition here", "category": "optional"}, ...]`}
          </code>
        </div>

        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm">
          <p className="font-medium mb-2 text-amber-900 dark:text-amber-100">
            📋 Manifest Files (auto-detected - will be skipped):
          </p>
          <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
            <li>
              <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                echo_knowledge_capsule.json
              </code>{" "}
              - Lists content_files to load
            </li>
            <li>
              <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                index.json
              </code>{" "}
              - Maps categories to their files
            </li>
            <li>
              <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                graph_links.json
              </code>{" "}
              - Graph structure data
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
