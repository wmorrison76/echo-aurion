/** * PDFViewer Component * Displays PDF documents with controls: * - Zoom in/out * - Page navigation * - Full page display * - Download button * * Note: This is a wrapper component that can use: * - react-pdf for advanced features * - iframe for simple embedding * - pdf.js for maximum control */ import React, {
  useState,
} from "react";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
interface PDFViewerProps {
  url: string;
  fileName?: string;
  height?: string | number;
  onDownload?: () => void;
  embedded?: boolean;
} /** * PDFViewer Component * Simple PDF viewer using iframe with controls */
export const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  fileName = "document.pdf",
  height = 500,
  onDownload,
  embedded = true,
}) => {
  const [scale, setScale] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  /** * Handle zoom in */ const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 10, 200));
  };
  /** * Handle zoom out */ const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 10, 50));
  };
  /** * Handle reset zoom */ const handleResetZoom = () => {
    setScale(100);
  };
  /** * Open in new window */ const handleOpenFullScreen = () => {
    window.open(url, "_blank");
  };
  /** * Download PDF */ const handleDownload = () => {
    onDownload?.();
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const heightPx = typeof height === "number" ? `${height}px` : height;
  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-surface rounded-lg border border-slate-200 dark:border-border overflow-hidden">
      {" "}
      {/* Toolbar */}{" "}
      <div className="flex items-center justify-between gap-2 p-2 bg-background dark:bg-slate-800 border-b border-slate-200 dark:border-border flex-shrink-0">
        {" "}
        {/* Zoom controls */}{" "}
        <div className="flex items-center gap-1">
          {" "}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 50}
            className="p-1 h-8 w-8"
            title="Zoom out"
          >
            {" "}
            <ZoomOut className="w-4 h-4" />{" "}
          </Button>{" "}
          <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded min-w-[45px] text-center">
            {" "}
            {scale}%{" "}
          </span>{" "}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 200}
            className="p-1 h-8 w-8"
            title="Zoom in"
          >
            {" "}
            <ZoomIn className="w-4 h-4" />{" "}
          </Button>{" "}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            className="p-1 h-8 w-8"
            title="Reset zoom"
          >
            {" "}
            <RotateCw className="w-4 h-4" />{" "}
          </Button>{" "}
        </div>{" "}
        {/* Center spacer */} <div className="flex-1" /> {/* Page controls */}{" "}
        <div className="flex items-center gap-1">
          {" "}
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-8 w-8"
            title="Previous page"
            disabled
          >
            {" "}
            <ChevronLeft className="w-4 h-4" />{" "}
          </Button>{" "}
          <span className="text-xs font-medium px-2">Page {currentPage}</span>{" "}
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-8 w-8"
            title="Next page"
            disabled
          >
            {" "}
            <ChevronRight className="w-4 h-4" />{" "}
          </Button>{" "}
        </div>{" "}
        {/* Right spacer */} <div className="flex-1" /> {/* Action buttons */}{" "}
        <div className="flex items-center gap-1">
          {" "}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenFullScreen}
            className="p-1 h-8 w-8"
            title="Open full screen"
          >
            {" "}
            <Maximize2 className="w-4 h-4" />{" "}
          </Button>{" "}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="p-1 h-8 w-8"
            title="Download PDF"
          >
            {" "}
            <Download className="w-4 h-4" />{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      {/* PDF Container */}{" "}
      <div
        className="flex-1 overflow-auto bg-slate-50 dark:bg-surface flex items-center justify-center relative"
        style={{ height: heightPx }}
      >
        {" "}
        {/* Loading state */}{" "}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
            {" "}
            <div className="text-center">
              {" "}
              <div className="w-10 h-10 border-4 border-slate-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />{" "}
              <p className="text-sm text-muted-foreground">
                {" "}
                Loading PDF...{" "}
              </p>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {/* Embedded PDF Viewer using iframe */}{" "}
        {embedded ? (
          <iframe
            src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
            className="w-full h-full border-none"
            onLoad={() => setIsLoading(false)}
            title={fileName}
          />
        ) : (
          /* Alternative: Direct link with PDF plugin */ <div className="w-full h-full flex items-center justify-center">
            {" "}
            <div className="text-center p-4">
              {" "}
              <p className="text-sm text-muted-foreground mb-4">
                {" "}
                PDF preview not available in this browser{" "}
              </p>{" "}
              <Button
                onClick={() => window.open(url, "_blank")}
                variant="default"
                size="sm"
              >
                {" "}
                Open PDF{" "}
              </Button>{" "}
            </div>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Footer Info */}{" "}
      <div className="px-3 py-2 bg-background dark:bg-slate-800 border-t border-slate-200 dark:border-border text-xs text-muted-foreground flex-shrink-0">
        {" "}
        {fileName}{" "}
      </div>{" "}
    </div>
  );
}; /** * Simple PDF Popup for quick viewing */
export const PDFPopup: React.FC<{
  url: string;
  fileName?: string;
  onClose: () => void;
}> = ({ url, fileName, onClose }) => {
  return (
    <>
      {" "}
      {/* Overlay */}{" "}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />{" "}
      {/* Modal */}{" "}
      <div className="fixed inset-4 bg-background dark:bg-surface rounded-lg shadow-2xl z-50 flex flex-col">
        {" "}
        {/* Close button */}{" "}
        <div className="flex justify-end p-2 border-b border-slate-200 dark:border-border">
          {" "}
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            {" "}
            ×{" "}
          </button>{" "}
        </div>{" "}
        {/* PDF Viewer */}{" "}
        <PDFViewer
          url={url}
          fileName={fileName}
          height="100%"
          embedded={true}
        />{" "}
      </div>{" "}
    </>
  );
}; /** * Inline PDF Display for Event Details Tab */
export const InlinePDFDisplay: React.FC<{
  attachments: Array<{ id: string; attachment_url: string; file_name: string }>;
}> = ({ attachments }) => {
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(
    attachments[0]?.id || null,
  );
  const [showPopup, setShowPopup] = useState(false);
  const selected = attachments.find((a) => a.id === selectedAttachment);
  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {" "}
        <p>No PDF attachments</p>{" "}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      {/* Attachment selector */}{" "}
      {attachments.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {" "}
          {attachments.map((attachment) => (
            <button
              key={attachment.id}
              onClick={() => setSelectedAttachment(attachment.id)}
              className={cn(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                selectedAttachment === attachment.id
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
              )}
            >
              {" "}
              {attachment.file_name}{" "}
            </button>
          ))}{" "}
        </div>
      )}{" "}
      {/* PDF Viewer */}{" "}
      {selected && (
        <div className="h-96 rounded-lg overflow-hidden border border-slate-200 dark:border-border">
          {" "}
          <PDFViewer
            url={selected.attachment_url}
            fileName={selected.file_name}
            height="100%"
            embedded={true}
          />{" "}
        </div>
      )}{" "}
      {/* Open in popup button */}{" "}
      {selected && (
        <button
          onClick={() => setShowPopup(true)}
          className="w-full py-2 px-4 bg-primary hover:bg-primary text-white rounded text-sm font-medium transition-colors"
        >
          {" "}
          Open Full Screen{" "}
        </button>
      )}{" "}
      {/* Popup */}{" "}
      {showPopup && selected && (
        <PDFPopup
          url={selected.attachment_url}
          fileName={selected.file_name}
          onClose={() => setShowPopup(false)}
        />
      )}{" "}
    </div>
  );
};
export default PDFViewer;
