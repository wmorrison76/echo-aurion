import React, { useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { toast } from "sonner";

interface BackgroundUploadSectionProps {
  mode: "light" | "dark";
  backgroundPreview?: string;
  opacity: number;
  onBackgroundUpload: (file: File) => void;
  onRemoveBackground: () => void;
  onOpacityChange: (opacity: number) => void;
  isUploading?: boolean;
  icon: React.ReactNode;
  title: string;
}

export default function BackgroundUploadSection({
  mode,
  backgroundPreview,
  opacity,
  onBackgroundUpload,
  onRemoveBackground,
  onOpacityChange,
  isUploading = false,
  icon,
  title,
}: BackgroundUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) {
      toast.error("No files detected");
      return;
    }

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please drop an image file");
      return;
    }

    onBackgroundUpload(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onBackgroundUpload(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-foreground">{icon}</span>
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
      </div>

      {backgroundPreview ? (
        <div className="relative rounded-lg overflow-hidden border border-border h-48 bg-muted">
          <img
            src={backgroundPreview}
            alt={`${mode} background preview`}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onRemoveBackground}
            className="absolute top-2 right-2 p-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            aria-label="Remove background image"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border/60 hover:border-primary/50 hover:bg-accent/30",
          )}
        >
          <Upload
            className={cn(
              "mx-auto mb-2 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground",
            )}
            size={32}
          />
          <p className="text-sm font-medium text-foreground mb-1">
            {isDragging
              ? "Drop image here"
              : "Drag and drop or click to upload"}
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG, GIF or WebP</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        disabled={isUploading}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          onClick={handleClick}
          disabled={isUploading}
          className="flex-1"
          variant={backgroundPreview ? "outline" : "default"}
        >
          {isUploading
            ? "Uploading..."
            : backgroundPreview
              ? "Change Image"
              : "Upload Image"}
        </Button>
      </div>

      {backgroundPreview && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Opacity: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            className="w-full cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Adjust how transparent the background image appears
          </p>
        </div>
      )}
    </div>
  );
}
