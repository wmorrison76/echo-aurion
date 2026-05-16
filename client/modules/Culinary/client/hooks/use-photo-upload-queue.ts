import { useState, useCallback, useMemo } from "react";

export type QueuedPhoto = {
  id: string;
  file: File;
  preview: string;
  tags: string[];
  name: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
};

export const MAX_QUEUE_SIZE = 50;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
export const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB total per batch
export const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function usePhotoUploadQueue() {
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);

  const addPhotos = useCallback((files: File[]): { added: QueuedPhoto[]; errors: string[] } => {
    const errors: string[] = [];
    const newPhotos: QueuedPhoto[] = [];
    let totalSize = 0;

    // Check queue capacity
    if (queue.length >= MAX_QUEUE_SIZE) {
      return {
        added: [],
        errors: [`Queue is full. Maximum ${MAX_QUEUE_SIZE} files allowed. Please process current queue.`],
      };
    }

    for (const file of files) {
      // Don't add if queue is full
      if (queue.length + newPhotos.length >= MAX_QUEUE_SIZE) {
        errors.push(`Queue capacity reached. Added ${newPhotos.length} of ${files.length} files.`);
        break;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
        continue;
      }

      // Check file format
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        errors.push(`${file.name}: Unsupported format. Only JPEG, PNG, WebP, and GIF are supported.`);
        continue;
      }

      totalSize += file.size;
      if (totalSize > MAX_TOTAL_SIZE) {
        errors.push(`Total size would exceed 500MB limit. Added ${newPhotos.length} files.`);
        break;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      const queuedPhoto: QueuedPhoto = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview,
        tags: [],
        name: file.name.replace(/\.[^/.]+$/, ""),
        status: "pending",
      };

      newPhotos.push(queuedPhoto);
    }

    setQueue((prev) => [...prev, ...newPhotos]);
    return { added: newPhotos, errors };
  }, [queue.length]);

  const removePhoto = useCallback((id: string) => {
    setQueue((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const updatePhoto = useCallback((id: string, patch: Partial<QueuedPhoto>) => {
    setQueue((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              ...patch,
              id: p.id, // Preserve ID
              file: p.file, // Preserve file
              preview: p.preview, // Preserve preview
            }
          : p,
      ),
    );
  }, []);

  const clearQueue = useCallback(() => {
    setQueue((prev) => {
      prev.forEach((photo) => URL.revokeObjectURL(photo.preview));
      return [];
    });
  }, []);

  const stats = useMemo(() => {
    const total = queue.length;
    const pending = queue.filter((p) => p.status === "pending").length;
    const uploading = queue.filter((p) => p.status === "uploading").length;
    const success = queue.filter((p) => p.status === "success").length;
    const error = queue.filter((p) => p.status === "error").length;
    const totalSize = queue.reduce((sum, p) => sum + p.file.size, 0);

    return {
      total,
      pending,
      uploading,
      success,
      error,
      totalSize,
      hasErrors: error > 0,
      isFull: total >= MAX_QUEUE_SIZE,
    };
  }, [queue]);

  return {
    queue,
    addPhotos,
    removePhoto,
    updatePhoto,
    clearQueue,
    stats,
  };
}
