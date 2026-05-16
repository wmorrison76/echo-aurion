import React, { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ImagePlus, Eye } from "lucide-react";

export default function ProjectedPreviewPanel() {
  const fileInputRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(true);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <Card className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-lg">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-400" />
            Projected Dish Preview
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current.click()}
              className="text-xs"
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setOverlayVisible((prev) => !prev)}
              className="text-xs"
            >
              {overlayVisible ? "Hide Overlay" : "Show Overlay"}
            </Button>
          </div>
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          ref={fileInputRef}
          className="hidden"
        />

        <div className="relative w-full h-[300px] border border-slate-700 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center">
          {imageSrc ? (
            <>
              <img
                src={imageSrc}
                alt="Dish Preview"
                className="w-full h-full object-contain z-10"
              />
              {overlayVisible && (
                <img
                  src="/assets/plate_overlay_grid.png"
                  alt="Overlay"
                  className="absolute inset-0 w-full h-full object-contain opacity-25 pointer-events-none z-20"
                />
              )}
            </>
          ) : (
            <div className="text-slate-400 text-sm flex flex-col items-center">
              <ImagePlus className="w-8 h-8 mb-2" />
              Upload a plating photo or rendering
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center italic">
          Future AR tools will allow projection of the dish in 3D with real-time rotation and plating tools.
        </p>
      </CardContent>
    </Card>
  );
}
