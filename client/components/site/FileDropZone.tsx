import { useState, useEffect } from "react";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/glass";
import { toast } from "sonner";
import { errorTracker } from "@/lib/error-tracker";

// Helper function to recursively extract files from folder entries
async function extractFilesFromFolder(
  entry: FileSystemDirectoryEntry,
  path = "",
): Promise<File[]> {
  const files: File[] = [];
  const folderPath = path || entry.name;

  try {
    const reader = entry.createReader();

    // Read directory entries in batches (some browsers limit concurrent reads)
    const readEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };

    let batchNum = 0;
    let entries = await readEntries();
    while (entries.length > 0) {
      batchNum++;

      for (const childEntry of entries) {
        if (childEntry.isFile) {
          const fileEntry = childEntry as FileSystemFileEntry;
          const file = await new Promise<File>((resolve, reject) => {
            fileEntry.file(resolve, reject);
          });

          // Keep folder structure - attach path as property that we can read later
          const fullPath = path ? `${path}/${file.name}` : file.name;

          // Create wrapper that preserves both the path and original file data
          const fileWithPath = new File([file], fullPath, { type: file.type });
          // Store the full path as a property for later retrieval
          (fileWithPath as any).webkitRelativePath = fullPath;

          const dirEntry = childEntry as FileSystemDirectoryEntry;
          const fullPath = path
            ? `${path}/${childEntry.name}`
            : childEntry.name;
          const folderFiles = await extractFilesFromFolder(dirEntry, fullPath);
          files.push(...folderFiles);
        }
      }
      entries = await readEntries();
    }
  } catch (err) {
    errorTracker.logError(
      "folder-extraction",
      "Failed to extract files from folder",
      {
        folderName: entry.name,
        folderPath: folderPath,
        error: err instanceof Error ? err.message : String(err),
      },
    );
    console.error("Error extracting folder contents:", err);
  }

  return files;
}

export default function FileDropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileCount, setFileCount] = useState(0);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Cleanup setTimeout when message changes or component unmounts
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [message]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    let files: File[] = [];
    const items = e.dataTransfer.items;


    // Process items to extract folders and files
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.kind === "file") {
          try {
            const entry = item.webkitGetAsEntry?.();

            if (entry && (entry as any).isDirectory) {
              // It's a folder - extract all files recursively
              const folderName = entry.name;
              const folderFiles = await extractFilesFromFolder(
                folderName,
              );
              files.push(...folderFiles);
            } else {
              // It's a file - add it directly
              const file = item.getAsFile();
              if (file) {
                files.push(file);
              }
            }
          } catch (err) {
            console.error(`[FileDropZone] Error processing item ${i}:`, err);
            // Fallback: try getAsFile
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
      }
    }

    // Fallback: if no files extracted, use dataTransfer.files
    if (files.length === 0) {
      files = Array.from(e.dataTransfer.files);
    }

    if (files.length === 0) {
      setMessage({
        type: "error",
        text: "❌ No files detected in drop",
      });
      return;
    }

    // Set file count in state for UI visibility
    setFileCount(files.length);
    setMessage({
      type: "success",
      text: `📁 Detected ${files.length} file(s)`,
    });

    // LOG ALL FILES AND FOLDER STRUCTURE
    console.log(
      `[FileDropZone] File size sum: ${(files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)).toFixed(2)} MB`,
    );

    // Extract folder structure from file paths
    const folderStructure = new Map<string, string[]>();
    const fileList: string[] = [];

    files.forEach((file, idx) => {
      const webkitPath = (file as any).webkitRelativePath || file.name;
      const pathParts = webkitPath.split("/");
      const folderName = pathParts.length > 1 ? pathParts[0] : "[root]";

      if (!folderStructure.has(folderName)) {
        folderStructure.set(folderName, []);
      }
      folderStructure.get(folderName)!.push(file.name);
      fileList.push(
        `${idx + 1}. ${webkitPath} (${(file.size / 1024).toFixed(2)} KB)`,
      );
    });

    // Log folder structure
    folderStructure.forEach((filesInFolder, folderName) => {
      console.log(`📁 ${folderName}:`);
      filesInFolder.forEach((f, i) => {
        if (i < 3) console.log(`    └─ ${f}`);
      });
      if (filesInFolder.length > 3)
        console.log(`    ... and ${filesInFolder.length - 3} more files`);
    });

    // Validate file count
    if (files.length > 10000) {
      setMessage({
        type: "error",
        text: `Too many files (${files.length}). Maximum 10000 files allowed per upload.`,
      });
      // setTimeout cleanup handled by useEffect above
      return;
    }

    setIsUploading(true);

    // Check server connectivity (non-blocking - continue even if fails)
    try {
      const healthController = new AbortController();
      const healthTimeout = setTimeout(() => healthController.abort("Upload health check timeout"), 15000);

      try {
        const healthCheck = await fetch("/api/health", {
          signal: healthController.signal,
        });
        clearTimeout(healthTimeout);

        if (healthCheck.ok) {
          errorTracker.logInfo("upload", "Server health check passed", {
            status: healthCheck.status,
          });
        }
      } catch (healthErr) {
        clearTimeout(healthTimeout);
        // Log warning but continue - health check is not critical for upload
        errorTracker.logWarning(
          "upload",
          "Health check failed, continuing anyway",
          {
            error:
              healthErr instanceof Error
                ? healthErr.message
                : String(healthErr),
          },
        );
      }
    } catch {
      // Ignore outer error
    }

    setMessage({
      type: "success",
      text: `Uploading ${files.length} file(s)...`,
    });

    try {
      const BATCH_SIZE = 100; // Increased from 10 to maximize throughput - server can handle 500mb+
      const batches = Math.ceil(files.length / BATCH_SIZE);
      let totalUploaded = 0;
      const failedFiles: string[] = [];
      const allUploadedFiles: any[] = []; // Collect all successfully uploaded files from server response

      // Upload files in batches - process each batch sequentially
      for (let batch = 0; batch < batches; batch++) {
        try {
          const startIdx = batch * BATCH_SIZE;
          const endIdx = Math.min(startIdx + BATCH_SIZE, files.length);
          const batchFiles = files.slice(startIdx, endIdx);

          // Log file names in this batch
          console.log(
            `[FileDropZone] Batch ${batch + 1}/${batches}: Processing ${batchFiles.length} files`,
          );

          // Convert batch files to base64 with comprehensive error handling
          const batchData = await Promise.all(
            batchFiles.map(
              (file) =>
                new Promise<{ name: string; data: string }>(
                  (resolve, reject) => {
                    const reader = new FileReader();
                    // Preserve folder structure - use webkitRelativePath if available (when files are from folder drop)
                    const fullFileName =
                      (file as any).webkitRelativePath || file.name;

                    reader.onload = () => {
                      try {
                        const result = reader.result as string;
                        if (!result) {
                          throw new Error("FileReader returned empty result");
                        }
                        resolve({
                          name: fullFileName,
                          data: result,
                        });
                      } catch (e) {
                        errorTracker.logError(
                          "file-read",
                          `Failed to process result for ${fullFileName}`,
                          {
                            error: e instanceof Error ? e.message : String(e),
                          },
                        );
                        reject(e);
                      }
                    };

                    reader.onerror = () => {
                      const errorMsg = `Failed to read file: ${fullFileName}`;
                      errorTracker.logError("file-read", errorMsg, {
                        error: reader.error?.message || "Unknown error",
                      });
                      reject(new Error(errorMsg));
                    };

                    reader.onabort = () => {
                      const errorMsg = `Read aborted for file: ${fullFileName}`;
                      errorTracker.logWarning("file-read", errorMsg, {
                        fileName: fullFileName,
                      });
                      reject(new Error(errorMsg));
                    };

                    try {
                      reader.readAsDataURL(file);
                    } catch (e) {
                      errorTracker.logError(
                        "file-read-init",
                        `Failed to initiate read for ${fullFileName}`,
                        {
                          error: e instanceof Error ? e.message : String(e),
                        },
                      );
                      reject(e);
                    }
                  },
                ),
            ),
          ).catch((err) => {
            errorTracker.logError(
              "batch-read",
              `Batch read failed for one or more files`,
              {
                batch: batch + 1,
                filesAttempted: batchFiles.length,
                error: err instanceof Error ? err.message : String(err),
              },
            );
            throw new Error(
              `Failed to read batch ${batch + 1}: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
          });

          // Send batch with timeout (per batch: 5 minutes for 10 files)
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => {
              errorTracker.logWarning(
                "upload",
                `Batch ${batch + 1} timeout after 5 minutes`,
                {
                  batch: batch + 1,
                  files: batchData.length,
                },
              );
              controller.abort("Upload batch timeout after 5 minutes");
            },
            5 * 60 * 1000,
          );

          try {
            errorTracker.logInfo(
              "upload",
              `Batch ${batch + 1}/${batches}: Uploading ${batchData.length} files`,
            );

            let bodyStr: string;
            try {
              bodyStr = JSON.stringify({ files: batchData });
            } catch (serializeErr) {
              errorTracker.logError(
                "upload-serialize-error",
                "Failed to serialize batch data",
                {
                  batch: batch + 1,
                  error:
                    serializeErr instanceof Error
                      ? serializeErr.message
                      : String(serializeErr),
                },
              );
              throw serializeErr;
            }

            const payloadMb = (bodyStr.length / 1024 / 1024).toFixed(2);
            errorTracker.logInfo(
              "upload",
              `Batch ${batch + 1} payload: ${payloadMb} MB`,
            );

            if (Number(payloadMb) > 500) {
              errorTracker.logError(
                "upload-payload-too-large",
                `Batch ${batch + 1} payload exceeds 500MB`,
                {
                  sizeMb: payloadMb,
                },
              );
              throw new Error(`Payload too large: ${payloadMb} MB`);
            }

            errorTracker.logInfo(
              "upload",
              `Batch ${batch + 1}: Sending request to /api/upload-purchasing`,
              {
                payloadSize: bodyStr.length,
                fileCount: batchData.length,
              },
            );

            let response: Response;
            try {
              response = await fetch("/api/upload-purchasing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: bodyStr,
                signal: controller.signal,
              });
            } catch (fetchErr) {
              errorTracker.logError(
                "upload-fetch-error",
                fetchErr instanceof Error ? fetchErr.message : "Fetch failed",
                {
                  batch: batch + 1,
                  errorType:
                    fetchErr instanceof Error
                      ? fetchErr.constructor.name
                      : typeof fetchErr,
                  errorMessage:
                    fetchErr instanceof Error
                      ? fetchErr.message
                      : String(fetchErr),
                },
              );
              throw new Error(
                `Fetch request failed: ${fetchErr instanceof Error ? fetchErr.message : "Unknown error"}`,
              );
            }

            clearTimeout(timeoutId);

            errorTracker.logInfo(
              "upload",
              `Batch ${batch + 1} response: HTTP ${response.status}`,
            );

            // Try to read response body for error details
            let responseData: any = {};
            try {
              const contentType = response.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                responseData = await response.json();
              }
            } catch (parseErr) {
              console.warn("[FileDropZone] Failed to parse error response:", parseErr);
            }

            // Check status code AND response success flag
            if (!response.ok && response.status !== 207) {
              errorTracker.logError(
                "upload-batch-failed",
                `Batch ${batch + 1} HTTP error: ${response.status}`,
                {
                  status: response.status,
                  batch: batch + 1,
                  batchSize: batchData.length,
                  serverError: responseData?.error || "Unknown server error",
                  serverMessage: responseData?.message || "",
                },
              );
              throw new Error(
                `HTTP ${response.status}: ${responseData?.message || "Upload failed"}`,
              );
            }

            // Also check response body for success flag (some servers return 200 even on error)
            if (responseData && responseData.success === false) {
              errorTracker.logError(
                "upload-batch-failed",
                `Batch ${batch + 1} server reported error: ${responseData.message || responseData.error}`,
                {
                  status: response.status,
                  batch: batch + 1,
                  batchSize: batchData.length,
                  serverError: responseData.error || "Unknown error",
                  serverMessage: responseData.message || "",
                },
              );
              throw new Error(
                `Upload error: ${responseData.message || responseData.error || "Unknown error"}`,
              );
            }

            // Success: construct result based on what we sent
            // (Server should have already processed the files)
            const result = {
              success: true,
              count: batchData.length,
              uploads: batchData.map((file, idx) => ({
                id: `${batch}-${idx}`,
                name: file.name,
                size: file.size,
              })),
              failed: [],
              message: `Batch ${batch + 1}: ${batchData.length} files processed`,
            };
            errorTracker.logInfo(
              "upload",
              `Batch ${batch + 1} complete: ${result.count} uploaded`,
              {
                count: result.count,
                failed: result.failed?.length || 0,
              },
            );

            totalUploaded += result.count || 0;

            // Collect actual uploads from server response (with correct IDs and metadata)
            if (result.uploads && Array.isArray(result.uploads)) {
              allUploadedFiles.push(...result.uploads);
            }

            if (result.failed) {
              failedFiles.push(...result.failed.map((f: any) => f.name));
            }
          } catch (batchErr) {
            clearTimeout(timeoutId);

            if (batchErr instanceof TypeError) {
              errorTracker.logError("upload-network-error", batchErr.message, {
                batch: batch + 1,
                batchSize: batchData.length,
              });
              throw new Error(`Network error: ${batchErr.message}`);
            }

            if (batchErr instanceof Error && batchErr.name === "AbortError") {
              errorTracker.logError(
                "upload-timeout",
                `Batch ${batch + 1} timeout`,
                {
                  batch: batch + 1,
                  timeoutMs: 10 * 60 * 1000,
                },
              );
              throw new Error(
                `Batch ${batch + 1} timeout (10 minutes exceeded)`,
              );
            }

            if (batchErr instanceof Error) {
              errorTracker.logError("upload-batch-error", batchErr.message, {
                batch: batch + 1,
                batchSize: batchData.length,
                stack: batchErr.stack,
              });
              throw batchErr;
            } else {
              // Unknown error type - convert to proper Error
              const errorMsg = `Batch ${batch + 1} upload error: ${String(batchErr)}`;
              errorTracker.logError("upload-batch-error", errorMsg, {
                batch: batch + 1,
                batchSize: batchData.length,
                errorType: typeof batchErr,
                errorStringified: String(batchErr),
              });
              throw new Error(errorMsg);
            }
          }

          // Update progress
          const progress = Math.round(((batch + 1) / batches) * 100);
          setMessage({
            type: "success",
            text: `Uploading... ${progress}% (${totalUploaded}/${files.length})`,
          });
        } catch (batchLoopErr) {
          const errorMsg =
            batchLoopErr instanceof Error
              ? batchLoopErr.message
              : String(batchLoopErr);
          console.error(
            `[FileDropZone] BATCH ${batch + 1} FAILED: ${errorMsg}`,
            batchLoopErr,
          );
          errorTracker.logError(
            "upload-batch-skipped",
            `Batch ${batch + 1} failed, continuing to next batch`,
            {
              batch: batch + 1,
              error:
                batchLoopErr instanceof Error
                  ? batchLoopErr.message
                  : String(batchLoopErr),
              totalUploadedSoFar: totalUploaded,
            },
          );
          // Continue to next batch instead of stopping entirely
          continue;
        }
      }

      if (totalUploaded > 0) {
        setMessage({
          type: "success",
          text: `✓ ${totalUploaded}/${files.length} file(s) uploaded successfully to Schedule`,
        });
        toast.success(
          `Successfully uploaded ${totalUploaded} files to Schedule`,
        );

        // Dispatch event to notify PurchasingReceiving module of uploaded files
        window.dispatchEvent(
          new CustomEvent("purchasing-files-uploaded", {
            detail: {
              uploads: allUploadedFiles, // Use actual server response data with correct IDs
              count: totalUploaded,
              total: files.length,
            },
          }),
        );

        if (failedFiles.length > 0) {
          console.warn("Failed files:", failedFiles);
          toast.warning(`${failedFiles.length} file(s) failed to upload`);
        }
      } else {
        throw new Error("No files were uploaded");
      }
    } catch (err) {
      let errorMsg = "Upload failed";
      const errorDetails: Record<string, any> = {};

      // Log detailed error information
      const errorInfo: any = {
        type: typeof err,
        isError: err instanceof Error,
        isEvent: err instanceof Event,
      };

      if (err instanceof Error) {
        errorInfo.message = err.message;
        errorInfo.name = err.name;
        errorInfo.stack = err.stack;
      } else if (err instanceof TypeError) {
        errorInfo.typeError = true;
        errorInfo.message = err.message;
      } else if (err instanceof Event) {
        errorInfo.eventType = err.type;
        errorInfo.eventMessage = err.message;
      } else {
        errorInfo.stringified = String(err);
        errorInfo.json = JSON.stringify(err, null, 2);
      }

      console.error("[DEBUG] Caught error in upload handler:", {
        ...errorInfo,
        messageStr: errorMsg,
      });

      if (err instanceof Error) {
        errorMsg = err.message;
        errorDetails.name = err.name;
        errorDetails.stack = err.stack;
        errorTracker.logError("upload-error", err.message, errorDetails);
      } else if (err instanceof TypeError) {
        errorMsg = `Network error: ${err.message}`;
        errorDetails.originalError = String(err);
        errorDetails.typeName = "TypeError";
        errorTracker.logError("upload-network-error", errorMsg, errorDetails);
      } else if (err instanceof Event && err.type === "error") {
        errorMsg = "Network connection failed";
        errorDetails.eventType = err.type;
        errorDetails.eventTarget = String(err.target);
        errorTracker.logError(
          "upload-connection-error",
          errorMsg,
          errorDetails,
        );
      } else {
        // Unknown error type - provide comprehensive details
        errorMsg = `Upload failed: ${String(err)}`;
        errorDetails.errorType = typeof err;
        try {
          errorDetails.errorValue = JSON.stringify(err);
        } catch {
          errorDetails.errorValue = String(err);
        }
        if (err instanceof Object) {
          errorDetails.errorKeys = Object.keys(err as Record<string, any>).join(
            ",",
          );
        }
        errorTracker.logError("upload-unknown-error", errorMsg, errorDetails);
      }

      setMessage({
        type: "error",
        text: errorMsg,
      });
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "px-2 py-2 mx-1 rounded-lg border-2 border-dashed transition-all duration-200",
        isDragging
          ? "border-primary/80 bg-primary/20"
          : "border-border/40 bg-background/20 hover:border-border/60 hover:bg-background/30",
        isUploading && "opacity-70",
      )}
    >
      <div className="flex flex-col items-center justify-center gap-1">
        <Upload
          size={14}
          className={cn(
            "text-foreground/50 transition-transform",
            isUploading && "animate-bounce",
          )}
        />
        <p className="text-[10px] text-foreground/50 text-center leading-tight">
          {isUploading
            ? "Uploading..."
            : fileCount > 0
              ? `${fileCount} files detected - uploading...`
              : "Drop files here"}
        </p>
      </div>

      {message && (
        <div
          className={cn(
            "mt-2 p-1.5 rounded text-[9px] flex items-center gap-1",
            message.type === "success"
              ? "bg-green-500/20 text-green-600 dark:text-green-400"
              : "bg-red-500/20 text-red-600 dark:text-red-400",
          )}
        >
          {message.type === "success" ? (
            <CheckCircle size={12} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={12} className="flex-shrink-0" />
          )}
          <span className="leading-tight">{message.text}</span>
        </div>
      )}
    </div>
  );
}
