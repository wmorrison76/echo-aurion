import React, { useState, useEffect, useRef } from "react";
import { FigmaEmbed } from "./types";
import { RefreshCw, ExternalLink, X, AlertCircle, Loader } from "lucide-react";
interface FigmaEmbedComponentProps {
  embed: FigmaEmbed;
  isSelected?: boolean;
  onUpdate?: (embed: Partial<FigmaEmbed>) => void;
  onDelete?: (id: string) => void;
  onOpenInFigma?: (url: string) => void;
}
export const FigmaEmbedComponent: React.FC<FigmaEmbedComponentProps> = ({
  embed,
  isSelected = false,
  onUpdate,
  onDelete,
  onOpenInFigma,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [embed.iframeUrl]);
  const handleSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/figma/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embed }),
      });
      if (!response.ok) {
        throw new Error("Failed to sync Figma file");
      }
      const updates = await response.json();
      onUpdate?.(updates);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div
      className={`relative rounded-lg overflow-hidden border-2 transition-all ${isSelected ? "border-blue-500 shadow-lg" : "border-border"}`}
      style={{ width: `${embed.width}px`, height: `${embed.height}px` }}
    >
      {" "}
      {/* Loading State */}{" "}
      {isLoading && (
        <div className="absolute inset-0 bg-surface flex items-center justify-center z-10">
          {" "}
          <Loader className="w-6 h-6 animate-spin text-muted-foreground" />{" "}
        </div>
      )}{" "}
      {/* Error State */}{" "}
      {error && (
        <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center z-10 p-4">
          {" "}
          <AlertCircle className="w-6 h-6 text-red-500 mb-2" />{" "}
          <p className="text-sm text-red-700 text-center">{error}</p>{" "}
        </div>
      )}{" "}
      {/* Figma Iframe */}{" "}
      <iframe
        ref={iframeRef}
        src={embed.iframeUrl}
        className="w-full h-full border-none"
        allowFullScreen
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => setError("Failed to load Figma embed")}
      />{" "}
      {/* Toolbar */}{" "}
      {isSelected && (
        <div className="absolute top-2 right-2 flex gap-2 bg-background rounded-lg shadow-md p-2">
          {" "}
          <button
            onClick={handleSync}
            disabled={isLoading}
            className="p-1 hover:bg-surface rounded transition-colors disabled:opacity-50"
            title="Sync with Figma"
          >
            {" "}
            <RefreshCw className="w-4 h-4" />{" "}
          </button>{" "}
          <button
            onClick={() => onOpenInFigma?.(embed.iframeUrl)}
            className="p-1 hover:bg-surface rounded transition-colors"
            title="Open in Figma"
          >
            {" "}
            <ExternalLink className="w-4 h-4" />{" "}
          </button>{" "}
          <button
            onClick={() => onDelete?.(embed.id)}
            className="p-1 hover:bg-red-100 rounded transition-colors"
            title="Delete"
          >
            {" "}
            <X className="w-4 h-4 text-red-500" />{" "}
          </button>{" "}
        </div>
      )}{" "}
      {/* Metadata Footer */}{" "}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
        {" "}
        <span className="font-semibold">{embed.fileName}</span>{" "}
        {embed.lastSyncedAt && (
          <span className="ml-2 opacity-75">
            {" "}
            Synced {new Date(embed.lastSyncedAt).toLocaleDateString()}{" "}
          </span>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default FigmaEmbedComponent;
