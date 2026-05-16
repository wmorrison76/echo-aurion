import React, { useRef, useEffect } from "react";

interface ImportImageDialogProps {
  isOpen: boolean;
  onImport: (file: File) => void;
  onCancel: () => void;
}

export default function ImportImageDialog({
  isOpen,
  onImport,
  onCancel,
}: ImportImageDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fileInputRef.current?.click();
    }
  }, [isOpen]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        onImport(file);
      }
    }
    onCancel();
  };

  return (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={handleFileInput}
      style={{ display: "none" }}
      key={isOpen ? "open" : "closed"}
    />
  );
}
