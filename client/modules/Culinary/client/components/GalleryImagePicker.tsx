import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/context/AppDataContext";
import { Images as GalleryIcon } from "lucide-react";

interface GalleryImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (imageUrl: string) => void;
  isDarkMode?: boolean;
}

export function GalleryImagePicker({
  open,
  onOpenChange,
  onSelectImage,
  isDarkMode,
}: GalleryImagePickerProps) {
  const { images } = useAppData();
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedImageId) {
      const image = images.find((img) => img.id === selectedImageId);
      if (image?.dataUrl || image?.blobUrl) {
        onSelectImage(image.dataUrl || image.blobUrl!);
        onOpenChange(false);
        setSelectedImageId(null);
      }
    }
  };

  const displayableImages = images.filter((img) => img.dataUrl || img.blobUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`w-full max-w-3xl border ${
          isDarkMode
            ? "border-[#c8a97e]/40 bg-slate-950/92"
            : "border-slate-200/80 bg-white/97"
        }`}
      >
        <DialogHeader>
          <DialogTitle>Select Image from Gallery</DialogTitle>
        </DialogHeader>

        {displayableImages.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center py-12 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            <GalleryIcon className="h-12 w-12 mb-4 opacity-40" />
            <p>No images in gallery yet. Upload images to the gallery first.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto p-4">
              {displayableImages.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageId(image.id)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageId === image.id
                      ? isDarkMode
                        ? "border-[#c8a97e] ring-2 ring-[#c8a97e]/50"
                        : "border-blue-500 ring-2 ring-blue-400/50"
                      : isDarkMode
                        ? "border-gray-700 hover:border-gray-600"
                        : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <img
                    src={image.dataUrl || image.blobUrl!}
                    alt={image.name || "Gallery image"}
                    className="w-full h-24 object-cover"
                  />
                  {image.name && (
                    <div
                      className={`absolute bottom-0 left-0 right-0 px-1 py-0.5 text-xs truncate ${
                        isDarkMode
                          ? "bg-black/60 text-white"
                          : "bg-white/80 text-gray-900"
                      }`}
                    >
                      {image.name}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200/50">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedImageId}
              >
                Select Image
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
