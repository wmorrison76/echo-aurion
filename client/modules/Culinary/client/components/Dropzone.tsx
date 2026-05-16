import React, { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function Dropzone({
  accept,
  multiple = true,
  onFiles,
  children,
  className,
  busy = false,
  progress,
}: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  children?: React.ReactNode;
  className?: string;
  busy?: boolean;
  progress?: number;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handle = useCallback(
    (items: FileList | null) => {
      if (!items) return;
      const files = Array.from(items);
      onFiles(files);
    },
    [onFiles],
  );

  return (
    <div
      className={cn(
        "relative rounded-xl border border-dashed p-1 text-center transition-all bg-background hover:shadow-md min-h-8 overflow-hidden",
        dragOver || busy
          ? "border-ring ring-2 ring-ring/40 marching-ants"
          : "border-muted-foreground/30",
        className,
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handle(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handle(e.target.files)}
      />
      {children ?? (
        <div className="text-[10px] text-muted-foreground py-0.5">
          <p className="font-medium text-foreground">Click to select files</p>
          <p>or drag and drop here</p>
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 matrix-overlay" />
          <div className="relative z-10 text-xs bg-background/80 px-2 py-1 rounded border">
            Importing…{" "}
            {typeof progress === "number"
              ? `${Math.round(progress * 100)}%`
              : ""}
          </div>
        </div>
      )}
    </div>
  );
}
