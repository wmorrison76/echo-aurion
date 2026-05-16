import React from "react";
import { ImageElement } from "./types";
import { X } from "lucide-react";
interface ImageViewerComponentProps {
  image: ImageElement;
  onRemove: (id: string) => void;
  onUpdate: (image: ImageElement) => void;
  isSelected: boolean;
  zoomLevel: number;
}
export const ImageViewerComponent: React.FC<ImageViewerComponentProps> = ({
  image,
  onRemove,
  onUpdate,
  isSelected,
  zoomLevel,
}) => {
  const displayWidth = image.width * zoomLevel;
  const displayHeight = image.height * zoomLevel;
  const displayX = image.x * zoomLevel;
  const displayY = image.y * zoomLevel;
  return (
    <div
      style={{
        position: "absolute",
        left: `${displayX}px`,
        top: `${displayY}px`,
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        border: isSelected ? "2px solid #3B82F6" : "1px solid #e5e7eb",
        backgroundColor: "#f3f4f6",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: isSelected ? "0 0 0 4px rgba(59, 130, 246, 0.1)" : "none",
        display: "flex",
        flexDirection: "column",
        opacity: image.opacity,
        transform: image.rotation ? `rotate(${image.rotation}deg)` : undefined,
      }}
    >
      {" "}
      {/* Header */}{" "}
      <div
        style={{
          padding: "6px 8px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {" "}
        <div
          style={{
            fontSize: "11px",
            color: "#6b7280",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {" "}
          {image.fileName}{" "}
        </div>{" "}
        <button
          onClick={() => onRemove(image.id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef4444",
          }}
        >
          {" "}
          <X size={12} />{" "}
        </button>{" "}
      </div>{" "}
      {/* Image Content */}{" "}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
        }}
      >
        {" "}
        <img
          src={image.fileUrl}
          alt={image.fileName}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />{" "}
      </div>{" "}
    </div>
  );
};
