import { useRef, useState } from "react";
import { Upload, X, File, Image, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";

interface UploadedFile {
  file: File;
  preview?: string;
  type: "image" | "document" | "other";
}

interface ChatFileUploadProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export default function ChatFileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxSizeMB = 25,
  acceptedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ],
}: ChatFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (file: File): "image" | "document" | "other" => {
    if (file.type.startsWith("image/")) {
      return "image";
    }
    if (
      file.type === "application/pdf" ||
      file.type.includes("officedocument") ||
      file.type.includes("word") ||
      file.type.includes("excel") ||
      file.type === "text/plain"
    ) {
      return "document";
    }
    return "other";
  };

  const processFiles = (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles: UploadedFile[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      if (selectedFiles.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        break;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        errors.push(`${file.name} exceeds ${maxSizeMB}MB limit`);
        continue;
      }

      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name} file type not supported`);
        continue;
      }

      const fileType = getFileType(file);
      const uploadedFile: UploadedFile = { file, type: fileType };

      // Generate preview for images
      if (fileType === "image") {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFile.preview = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }

      validFiles.push(uploadedFile);
    }

    if (errors.length > 0) {
      console.warn("File upload errors:", errors);
    }

    const updatedFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      const dataTransfer = new DataTransfer();
      files.forEach((f) => dataTransfer.items.add(f));
      processFiles(dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    onFilesSelected(updated);
  };

  const FileIcon = ({ file }: { file: UploadedFile }) => {
    if (file.type === "image" && file.preview) {
      return (
        <div className="relative w-20 h-20 rounded overflow-hidden border border-slate-700">
          <img
            src={file.preview}
            alt={file.file.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    if (file.type === "document") {
      return (
        <div className="w-20 h-20 rounded border border-slate-700 flex items-center justify-center bg-slate-800/50">
          <FileText size={32} className="text-slate-400" />
        </div>
      );
    }

    return (
      <div className="w-20 h-20 rounded border border-slate-700 flex items-center justify-center bg-slate-800/50">
        <File size={32} className="text-slate-400" />
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* File Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer",
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-slate-600/50 bg-slate-800/20 hover:border-slate-500"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          accept={acceptedTypes.join(",")}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 text-center"
        >
          <Upload size={24} className="text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-200">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Images, PDFs, and documents up to {maxSizeMB}MB
            </p>
            <p className="text-xs text-slate-500 mt-2">
              💡 Or paste images directly (Ctrl+V)
            </p>
          </div>
        </button>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-300">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2 flex-wrap">
            {selectedFiles.map((uploadedFile, idx) => (
              <div
                key={idx}
                className="relative group"
              >
                <FileIcon file={uploadedFile} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFile(idx)}
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-600/80 hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} className="text-white" />
                </Button>
                <p className="text-xs text-slate-400 mt-1 max-w-20 truncate text-center">
                  {uploadedFile.file.name}
                </p>
                <p className="text-[10px] text-slate-500 text-center">
                  {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
