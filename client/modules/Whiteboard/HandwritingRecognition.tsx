import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { PenTool, Loader, Copy, Check } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface HandwritingResult {
  id: string;
  text: string;
  confidence: number;
  timestamp: number;
  sourceRegion?: { x: number; y: number; width: number; height: number };
}

interface HandwritingRecognitionProps {
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  onTextRecognized?: (text: string, result: HandwritingResult) => void;
  onError?: (error: string) => void;
}

export const HandwritingRecognition: React.FC<HandwritingRecognitionProps> = ({
  canvasRef,
  onTextRecognized,
  onError,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [results, setResults] = useState<HandwritingResult[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const extractCanvasRegion = useCallback(
    (region: { x: number; y: number; width: number; height: number }): string => {
      if (!canvasRef?.current) return "";
      const canvas = canvasRef.current;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = region.width;
      tempCanvas.height = region.height;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return "";
      const sourceCtx = canvas.getContext("2d");
      if (!sourceCtx) return "";
      const imageData = sourceCtx.getImageData(region.x, region.y, region.width, region.height);
      ctx.putImageData(imageData, 0, 0);
      return tempCanvas.toDataURL("image/png");
    },
    [canvasRef],
  );

  const recognizeHandwriting = useCallback(
    async (imageData: string) => {
      try {
        const response = await fetch("/api/handwriting/recognize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData, region: selectedRegion }),
        });

        if (!response.ok) {
          throw new Error("Handwriting recognition failed");
        }

        const data = (await response.json()) as { text: string; confidence: number };
        const result: HandwritingResult = {
          id: uuidv4(),
          text: data.text,
          confidence: data.confidence,
          timestamp: Date.now(),
          sourceRegion: selectedRegion || undefined,
        };
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Recognition failed";
        onError?.(errorMsg);
        throw error;
      }
    },
    [selectedRegion, onError],
  );

  const handleRecognizeAll = useCallback(async () => {
    if (!canvasRef?.current) return;
    setIsRecognizing(true);
    try {
      const canvas = canvasRef.current;
      const region = { x: 0, y: 0, width: canvas.width, height: canvas.height };
      const imageData = extractCanvasRegion(region);
      const result = await recognizeHandwriting(imageData);
      setResults((prev) => [result, ...prev]);
      onTextRecognized?.(result.text, result);
    } catch (error) {
      console.error("Error recognizing handwriting:", error);
    } finally {
      setIsRecognizing(false);
    }
  }, [canvasRef, extractCanvasRegion, recognizeHandwriting, onTextRecognized]);

  const handleRecognizeRegion = useCallback(async () => {
    if (!selectedRegion) {
      onError?.("Please select a region first");
      return;
    }
    setIsRecognizing(true);
    try {
      const imageData = extractCanvasRegion(selectedRegion);
      const result = await recognizeHandwriting(imageData);
      setResults((prev) => [result, ...prev]);
      onTextRecognized?.(result.text, result);
    } catch (error) {
      console.error("Error recognizing handwriting:", error);
    } finally {
      setIsRecognizing(false);
    }
  }, [selectedRegion, extractCanvasRegion, recognizeHandwriting, onTextRecognized, onError]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className={cn(
          "gap-2 rounded-lg",
          "border-blue-400/30 hover:border-blue-400",
          "text-primary dark:text-blue-400",
        )}
      >
        <PenTool size={16} /> Handwriting
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 bg-background dark:bg-slate-800",
        "border border-slate-200 dark:border-border rounded-lg",
        "shadow-2xl p-6 z-50 max-w-md w-96 max-h-96 overflow-y-auto",
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground dark:text-white flex items-center gap-2">
          <PenTool size={20} className="text-primary dark:text-blue-400" />
          Handwriting Recognition
        </h3>
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          ✕
        </Button>
      </div>

      <div className="space-y-3 mb-4">
        <p className="text-sm text-muted-foreground">
          Extract text from whiteboard sketches and handwriting
        </p>
        <div className="space-y-2">
          <Button
            onClick={handleRecognizeAll}
            disabled={isRecognizing}
            className="w-full bg-primary hover:opacity-90 gap-2"
          >
            {isRecognizing ? (
              <>
                <Loader size={16} className="animate-spin" /> Recognizing...
              </>
            ) : (
              "Recognize All"
            )}
          </Button>
          <Button
            onClick={handleRecognizeRegion}
            disabled={!selectedRegion || isRecognizing}
            variant="outline"
            className="w-full gap-2"
          >
            <PenTool size={14} /> Recognize Region
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          💡 Tip: Click on canvas area to select a region for focused recognition
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-2 border-t border-slate-200 dark:border-border pt-4">
          <h4 className="text-xs font-semibold text-foreground uppercase">
            Recognized Text
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((result) => (
              <div
                key={result.id}
                className={cn(
                  "p-3 rounded border bg-slate-50 dark:bg-surface",
                  "border-blue-200 dark:border-blue-800",
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground dark:text-white flex-1">
                    {result.text}
                  </p>
                  <Button
                    onClick={() => handleCopyText(result.text, result.id)}
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground dark:hover:text-white flex-shrink-0"
                  >
                    {copiedId === result.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Confidence: {result.confidence.toFixed(0)}%</span>
                  <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !isRecognizing && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <p>No recognized text yet</p>
          <p className="text-xs mt-2">
            Draw or write on the canvas, then use "Recognize All" button above
          </p>
        </div>
      )}
    </div>
  );
};

export default HandwritingRecognition;
