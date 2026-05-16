import React, { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface PDFUploadProgress {
  fileName: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  message: string;
  error?: string;
}

export function PDFBatchUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<PDFUploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);

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

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf",
    );

    if (droppedFiles.length === 0) {
      toast.error("Please drop PDF files only");
      return;
    }

    setFiles((prev) => [...prev, ...droppedFiles]);
    setUploadProgress((prev) => [
      ...prev,
      ...droppedFiles.map((f) => ({
        fileName: f.name,
        status: "pending" as const,
        progress: 0,
        message: "Queued for upload",
      })),
    ]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
      setUploadProgress((prev) => [
        ...prev,
        ...selectedFiles.map((f) => ({
          fileName: f.name,
          status: "pending" as const,
          progress: 0,
          message: "Queued for upload",
        })),
      ]);
    }
  };

  const uploadFile = async (file: File, index: number) => {
    const currentProgress = [...uploadProgress];
    currentProgress[index].status = "uploading";
    currentProgress[index].message = "Preparing upload...";
    currentProgress[index].progress = 10;
    setUploadProgress(currentProgress);

    try {
      currentProgress[index].message = "Uploading to server...";
      currentProgress[index].progress = 30;
      setUploadProgress([...currentProgress]);

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append("pdf", file); // The multer middleware expects 'pdf' field
      formData.append("title", file.name.replace(/\.pdf$/i, "")); // Use filename as title
      formData.append("language", "English");

      // Upload to server using multipart
      const response = await fetch("/api/pdf-library/upload-multipart", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Server error: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();

      if (result.status !== "success") {
        throw new Error(result.error || result.message || "Upload failed");
      }

      currentProgress[index].status = "success";
      currentProgress[index].message =
        `${result.import?.termsAdded || result.import?.termsExtracted || 0} terms extracted`;
      currentProgress[index].progress = 100;
      setUploadProgress([...currentProgress]);

      toast.success(`✓ ${file.name} uploaded successfully`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      currentProgress[index].status = "error";
      currentProgress[index].message = errorMsg;
      currentProgress[index].error = errorMsg;
      currentProgress[index].progress = 0;
      setUploadProgress([...currentProgress]);

      toast.error(`✗ Failed to upload ${file.name}: ${errorMsg}`);
    }
  };

  const handleStartUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select PDF files to upload");
      return;
    }

    setIsUploading(true);

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i], i);

        // Update overall progress
        const successCount = uploadProgress.filter(
          (p) => p.status === "success",
        ).length;
        const newProgress = Math.round((successCount / files.length) * 100);
        setTotalProgress(newProgress);
      }

      toast.success(
        `Completed! ${uploadProgress.filter((p) => p.status === "success").length}/${files.length} PDFs uploaded`,
      );
    } catch (error) {
      console.error("Batch upload error:", error);
      toast.error("Batch upload encountered errors");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearCompleted = () => {
    setUploadProgress(
      uploadProgress.filter(
        (p) => p.status !== "success" && p.status !== "error",
      ),
    );
    setFiles(files.filter((_, i) => uploadProgress[i].status === "pending"));
  };

  const handleRemoveFile = (index: number) => {
    setUploadProgress((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const successCount = uploadProgress.filter(
    (p) => p.status === "success",
  ).length;
  const errorCount = uploadProgress.filter((p) => p.status === "error").length;
  const pendingCount = uploadProgress.filter(
    (p) => p.status === "pending",
  ).length;

  return (
    <Card className="w-full p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Batch PDF Upload
          </h3>
          <p className="text-sm text-gray-600">
            Upload multiple PDFs to extract culinary terms and knowledge
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="space-y-2">
            <Upload className="w-12 h-12 mx-auto text-gray-400" />
            <div>
              <p className="font-semibold">
                {isDragActive
                  ? "Drop PDFs here"
                  : "Drag PDFs here or click to select"}
              </p>
              <p className="text-xs text-gray-500">
                Supports PDF files up to 50MB each
              </p>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        {uploadProgress.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Upload Progress: {successCount + errorCount}/
                {uploadProgress.length}
              </span>
              <div className="flex gap-2">
                {successCount > 0 && (
                  <Badge variant="outline" className="text-green-700">
                    ✓ {successCount} Success
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="outline" className="text-red-700">
                    ✗ {errorCount} Failed
                  </Badge>
                )}
                {pendingCount > 0 && (
                  <Badge variant="outline" className="text-amber-700">
                    ⏳ {pendingCount} Pending
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>
        )}

        {/* File List */}
        {uploadProgress.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {uploadProgress.map((file, index) => (
              <div
                key={`${file.fileName}-${index}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {file.status === "pending" && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                  {file.status === "uploading" && (
                    <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                  {file.status === "success" && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {file.status === "error" && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file.fileName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={file.progress} className="flex-1 h-1.5" />
                    <span className="text-xs text-gray-600 min-w-fit">
                      {file.progress}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{file.message}</p>
                  {file.error && (
                    <p className="text-xs text-red-600 mt-1">{file.error}</p>
                  )}
                </div>

                <button
                  onClick={() => handleRemoveFile(index)}
                  disabled={file.status === "uploading"}
                  className="flex-shrink-0 p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleStartUpload}
            disabled={isUploading || files.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isUploading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Start Upload ({files.length})
              </>
            )}
          </Button>

          {(successCount > 0 || errorCount > 0) && (
            <Button
              onClick={handleClearCompleted}
              variant="outline"
              className="flex-1"
            >
              Clear Completed
            </Button>
          )}
        </div>

        {/* Statistics */}
        {uploadProgress.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-1">
            <p>
              <span className="font-semibold">Total Files:</span>{" "}
              {uploadProgress.length}
            </p>
            <p>
              <span className="font-semibold">Completed:</span>{" "}
              {successCount + errorCount} (
              {Math.round(
                ((successCount + errorCount) / uploadProgress.length) * 100,
              )}
              %)
            </p>
            {successCount > 0 && (
              <p className="text-green-700">
                <span className="font-semibold">Successfully Uploaded:</span>{" "}
                {successCount}
              </p>
            )}
            {errorCount > 0 && (
              <p className="text-red-700">
                <span className="font-semibold">Failed:</span> {errorCount}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
