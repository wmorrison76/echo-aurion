import React, { useState } from "react";
import { Download, Upload, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { cn } from "@/lib/glass";
import { toast } from "sonner";

interface ParsedData {
  [sheetName: string]: any[];
}

export default function ExcelTemplatesPanel() {
  const [templateType, setTemplateType] = useState<"ecosystem" | "roles" | "users" | "modules">("ecosystem");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState<ParsedData | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const templateDescriptions: Record<string, string> = {
    ecosystem: "Complete ecosystem setup with roles, users, outlets, modules, and permissions",
    roles: "Role definitions with levels and permissions",
    users: "User accounts with role and outlet assignments",
    modules: "Module definitions and configuration",
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/excel-templates/download/${templateType}`);
      
      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template-${templateType}-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Downloaded ${templateType} template`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to download template";
      toast.error(errorMsg);
      setUploadMessage({
        type: "error",
        text: errorMsg,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadedData(null);
    setUploadMessage(null);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target?.result as string;

          // Upload to server
          const response = await fetch("/api/excel-templates/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file: base64Data,
              type: templateType,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to upload template");
          }

          const result = await response.json();
          
          if (result.success) {
            setUploadedData(result.data);
            setUploadMessage({
              type: "success",
              text: `✓ Template uploaded successfully! ${Object.keys(result.data).length} sheets parsed.`,
            });
            toast.success("Template uploaded and parsed successfully");
          } else {
            throw new Error(result.message || "Upload failed");
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Processing failed";
          setUploadMessage({
            type: "error",
            text: errorMsg,
          });
          toast.error(errorMsg);
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setUploadMessage({
          type: "error",
          text: "Failed to read file",
        });
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Upload failed";
      setUploadMessage({
        type: "error",
        text: errorMsg,
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Excel Templates</h1>
        <p className="text-sm text-slate-600 mt-1">
          Download templates to populate ecosystem data, then upload completed files to import.
        </p>
      </div>

      {/* Template Selection & Download */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Download Template</h2>
        
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Select Template Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["ecosystem", "roles", "users", "modules"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTemplateType(type)}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all text-left",
                  templateType === type
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <div className="font-medium text-sm text-slate-900 capitalize">
                  {type} Template
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {templateDescriptions[type]}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={cn(
            "w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors",
            isDownloading
              ? "bg-slate-100 text-slate-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {isDownloading ? (
            <>
              <Loader size={16} className="animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download size={16} />
              Download {templateType} Template
            </>
          )}
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Upload Completed Template</h2>
        
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={cn(
              "flex flex-col items-center gap-2 cursor-pointer",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <Upload size={24} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              {isUploading ? "Uploading..." : "Click to upload or drag file here"}
            </span>
            <span className="text-xs text-slate-500">
              Excel files (.xlsx, .xls)
            </span>
          </label>
        </div>

        {uploadMessage && (
          <div
            className={cn(
              "p-3 rounded-lg flex items-center gap-2",
              uploadMessage.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            )}
          >
            {uploadMessage.type === "success" ? (
              <CheckCircle size={16} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={16} className="flex-shrink-0" />
            )}
            <span className="text-sm">{uploadMessage.text}</span>
          </div>
        )}
      </div>

      {/* Preview of Uploaded Data */}
      {uploadedData && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Parsed Data Preview</h2>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Object.entries(uploadedData).map(([sheetName, rows]) => (
              <div key={sheetName} className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">{sheetName}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        {rows.length > 0 &&
                          Object.keys(rows[0]).map((key) => (
                            <th
                              key={key}
                              className="px-2 py-1 text-left font-semibold text-slate-700 border border-slate-200"
                            >
                              {key}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-200">
                          {Object.values(row).map((value, colIdx) => (
                            <td
                              key={colIdx}
                              className="px-2 py-1 text-slate-700 border border-slate-200 text-xs"
                            >
                              {String(value ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 5 && (
                  <p className="text-xs text-slate-500 mt-2">
                    Showing 5 of {rows.length} rows
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-blue-900">How to Use</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Select the template type you want to download</li>
          <li>Click "Download Template" to get the Excel file</li>
          <li>Fill in your data in the downloaded Excel sheets</li>
          <li>Upload the completed file back using the upload section</li>
          <li>Review the parsed data in the preview section</li>
          <li>Apply changes to your ecosystem configuration</li>
        </ol>
      </div>
    </div>
  );
}
