import React, { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

export type GalleryImage = {
  id: string;
  name: string;
  dataUrl?: string;
  blobUrl?: string;
  tags?: string[];
};

type GalleryImagePickerProps = {
  images: GalleryImage[];
  onSelectImage: (image: GalleryImage) => void;
  onClose: () => void;
};

export function GalleryImagePicker({
  images,
  onSelectImage,
  onClose,
}: GalleryImagePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredImages = useMemo(() => {
    if (!searchQuery.trim()) return images;
    const query = searchQuery.toLowerCase();
    return images.filter(
      (img) =>
        img.name.toLowerCase().includes(query) ||
        img.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [images, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] max-h-[800px] w-full max-w-2xl flex-col gap-4 rounded-3xl border border-slate-300/50 dark:border-slate-700/60 bg-white dark:bg-slate-950 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Select image from gallery
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {filteredImages.length} image{filteredImages.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Gallery Grid */}
        <ScrollArea className="flex-1 px-6">
          {images.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-center">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  No images in gallery
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Upload images to the Gallery module first
                </p>
              </div>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-center">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  No images found
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Try a different search term
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 pb-4 sm:grid-cols-3">
              {filteredImages.map((image) => (
                <button
                  key={image.id}
                  onClick={() => {
                    onSelectImage(image);
                    onClose();
                  }}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border-2 transition hover:border-sky-400",
                    "border-slate-300/50 dark:border-slate-700/60 hover:shadow-lg"
                  )}
                >
                  {/* Image Preview */}
                  <div className="relative aspect-square overflow-hidden bg-slate-200 dark:bg-slate-800">
                    {image.dataUrl || image.blobUrl ? (
                      <img
                        src={image.dataUrl || image.blobUrl}
                        alt={image.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-slate-300 dark:bg-slate-700">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          No preview
                        </span>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
                      <span className="text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                        Select
                      </span>
                    </div>
                  </div>

                  {/* Image info */}
                  <div className="flex flex-1 flex-col gap-1 bg-white dark:bg-slate-950 px-3 py-2">
                    <p className="line-clamp-2 text-left text-xs font-medium text-slate-900 dark:text-slate-100">
                      {image.name}
                    </p>
                    {image.tags && image.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {image.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="inline-block rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] text-sky-700 dark:text-sky-300"
                          >
                            {tag}
                          </span>
                        ))}
                        {image.tags.length > 2 && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            +{image.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
