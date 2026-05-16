import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Camera, Ruler, Image, Upload, X, Loader2 } from "lucide-react";
declare global {
  interface Window {
    cv?: any;
  }
}
interface RoomCaptureProps {
  onDimensionsSet?: (width: number, depth: number, height?: number) => void;
  onImageCapture?: (imageData: string) => void;
}
async function loadOpenCV(): Promise<boolean> {
  if (window.cv && typeof window.cv === "object") return true;
  const src = "/vendor/opencv.js";
  return new Promise((resolve) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => {
      const cv = (window as any).cv;
      if (!cv) return resolve(false);
      if (cv && !cv["onRuntimeInitialized"]) return resolve(true);
      cv["onRuntimeInitialized"] = () => resolve(true);
    };
    el.onerror = () => resolve(false);
    document.body.appendChild(el);
  });
}
export function RoomCapture({
  onDimensionsSet,
  onImageCapture,
}: RoomCaptureProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: "",
    depth: "",
    height: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isStitching, setIsStitching] = useState(false);
  const filesRef = useRef<HTMLInputElement | null>(null);
  const handleDimensionChange = (field: string, value: string) => {
    setDimensions((d) => ({ ...d, [field]: value }));
  };
  const applyDimensions = () => {
    const width = Number(dimensions.width);
    const depth = Number(dimensions.depth);
    const height = dimensions.height ? Number(dimensions.height) : undefined;
    if (!width || !depth) {
      toast({ title: "Enter width and depth", variant: "destructive" });
      return;
    }
    onDimensionsSet?.(width, depth, height);
    toast({ title: "Room dimensions set" });
    setIsOpen(false);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target?.result as string;
        setPreviewUrl(data);
      };
      reader.readAsDataURL(file);
    }
  };
  const captureImage = async () => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      setCapturedImages((img) => [...img, data]);
      onImageCapture?.(data);
      toast({ title: "Image captured" });
      setPreviewUrl(null);
      setSelectedFile(null);
    };
    reader.readAsDataURL(selectedFile);
  };
  const stitchPanorama = async () => {
    if (capturedImages.length < 2) {
      toast({ title: "Need at least 2 images", variant: "destructive" });
      return;
    }
    setIsStitching(true);
    try {
      const hasCV = await loadOpenCV();
      const images = await Promise.all(
        capturedImages.map((dataUrl) => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
          });
        }),
      );
      let stitchedUrl: string;
      if (hasCV && window.cv) {
        try {
          const cv = window.cv;
          const mats = images.map((img) => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            return cv.imread(canvas);
          });
          const stitcher = cv.Stitcher_create
            ? cv.Stitcher_create(cv.Stitcher_PANORAMA)
            : new cv.Stitcher();
          const pano = new cv.Mat();
          const status = stitcher.stitch(mats, pano);
          mats.forEach((m: any) => m.delete());
          if (status !== 0) {
            throw new Error("OpenCV stitch failed");
          }
          const canvas = document.createElement("canvas");
          cv.imshow(canvas, pano);
          pano.delete();
          stitchedUrl = canvas.toDataURL("image/png");
        } catch (e) {
          console.warn("OpenCV stitching failed, using fallback");
          const totalW = images.reduce((w, img) => w + img.naturalWidth, 0);
          const maxH = Math.max(...images.map((i) => i.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = totalW;
          canvas.height = maxH;
          const ctx = canvas.getContext("2d")!;
          let x = 0;
          for (const img of images) {
            ctx.drawImage(img, x, 0);
            x += img.naturalWidth;
          }
          stitchedUrl = canvas.toDataURL("image/png");
        }
      } else {
        const totalW = images.reduce((w, img) => w + img.naturalWidth, 0);
        const maxH = Math.max(...images.map((i) => i.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = totalW;
        canvas.height = maxH;
        const ctx = canvas.getContext("2d")!;
        let x = 0;
        for (const img of images) {
          ctx.drawImage(img, x, 0);
          x += img.naturalWidth;
        }
        stitchedUrl = canvas.toDataURL("image/png");
      }
      onImageCapture?.(stitchedUrl);
      setCapturedImages([]);
      setPreviewUrl(null);
      setSelectedFile(null);
      toast({
        title: "Panorama stitched",
        description: `Created panorama from ${images.length} images`,
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Panorama stitching failed", variant: "destructive" });
    } finally {
      setIsStitching(false);
    }
  };
  const removeCapturedImage = (index: number) => {
    setCapturedImages((imgs) => imgs.filter((_, i) => i !== index));
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {" "}
      <DialogTrigger asChild>
        {" "}
        <Button size="sm" variant="outline">
          {" "}
          <Camera className="h-4 w-4 mr-1" /> Capture{" "}
        </Button>{" "}
      </DialogTrigger>{" "}
      <DialogContent className="max-w-2xl">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle>Capture Room</DialogTitle>{" "}
        </DialogHeader>{" "}
        <Tabs defaultValue="dimensions" className="w-full">
          {" "}
          <TabsList className="grid w-full grid-cols-3">
            {" "}
            <TabsTrigger value="dimensions">Dimensions</TabsTrigger>{" "}
            <TabsTrigger value="images">Photos</TabsTrigger>{" "}
            <TabsTrigger value="floorplan">Floor Plan</TabsTrigger>{" "}
          </TabsList>{" "}
          <TabsContent value="dimensions" className="space-y-4">
            {" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              Enter your room dimensions manually{" "}
            </p>{" "}
            <div className="space-y-3">
              {" "}
              <div>
                {" "}
                <label className="text-sm">Width (ft)</label>{" "}
                <Input
                  type="number"
                  placeholder="e.g., 30"
                  value={dimensions.width}
                  onChange={(e) =>
                    handleDimensionChange("width", e.target.value)
                  }
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm">Depth (ft)</label>{" "}
                <Input
                  type="number"
                  placeholder="e.g., 40"
                  value={dimensions.depth}
                  onChange={(e) =>
                    handleDimensionChange("depth", e.target.value)
                  }
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm">Height (ft)</label>{" "}
                <Input
                  type="number"
                  placeholder="Optional"
                  value={dimensions.height}
                  onChange={(e) =>
                    handleDimensionChange("height", e.target.value)
                  }
                />{" "}
              </div>{" "}
              <Button onClick={applyDimensions} className="w-full">
                {" "}
                <Ruler className="h-4 w-4 mr-2" /> Apply Dimensions{" "}
              </Button>{" "}
            </div>{" "}
          </TabsContent>{" "}
          <TabsContent value="images" className="space-y-4">
            {" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              Capture multiple photos from different angles{" "}
            </p>{" "}
            <div className="space-y-3">
              {" "}
              <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50">
                {" "}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="image-input"
                />{" "}
                <label
                  htmlFor="image-input"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {" "}
                  <Image className="h-8 w-8 text-muted-foreground" />{" "}
                  <span className="text-sm">Click to select image</span>{" "}
                </label>{" "}
              </div>{" "}
              {previewUrl && (
                <div className="space-y-2">
                  {" "}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded"
                  />{" "}
                  <Button onClick={captureImage} className="w-full">
                    {" "}
                    <Camera className="h-4 w-4 mr-2" /> Capture This Image{" "}
                  </Button>{" "}
                </div>
              )}{" "}
              {capturedImages.length > 0 && (
                <div className="space-y-3">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-xs font-semibold mb-2">
                      {" "}
                      Captured: {capturedImages.length} images{" "}
                    </p>{" "}
                    <div className="grid grid-cols-4 gap-1">
                      {" "}
                      {capturedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          {" "}
                          <img
                            src={img}
                            alt={`Capture ${idx + 1}`}
                            className="w-full h-16 object-cover rounded border"
                          />{" "}
                          <button
                            onClick={() => removeCapturedImage(idx)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
                          >
                            {" "}
                            <X className="h-4 w-4 text-white" />{" "}
                          </button>{" "}
                        </div>
                      ))}{" "}
                    </div>{" "}
                  </div>{" "}
                  <Button
                    onClick={stitchPanorama}
                    disabled={capturedImages.length < 2 || isStitching}
                    className="w-full"
                  >
                    {" "}
                    {isStitching && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}{" "}
                    <Upload className="h-4 w-4 mr-2" /> Stitch Panorama{" "}
                  </Button>{" "}
                </div>
              )}{" "}
            </div>{" "}
          </TabsContent>{" "}
          <TabsContent value="floorplan" className="space-y-4">
            {" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              Import existing floor plan (SVG/PNG){" "}
            </p>{" "}
            <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50">
              {" "}
              <input
                type="file"
                accept=".svg,.png,.jpg,.json"
                className="hidden"
                id="floorplan-input"
              />{" "}
              <label
                htmlFor="floorplan-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {" "}
                <Upload className="h-8 w-8 text-muted-foreground" />{" "}
                <span className="text-sm">Click to select floor plan</span>{" "}
              </label>{" "}
            </div>{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
