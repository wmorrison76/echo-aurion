import React, { useState, useEffect } from "react";
import ResizableDraggablePanel from "./ResizableDraggablePanel";
import { Download, Trash2, Edit2, Copy, Image } from "lucide-react";
import {
  getCakeDesignerModule,
  type CakeDesignExport,
  type CakeGalleryItem,
} from "@/modules/cake-designer-module";

interface CakeDesignerGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onEditDesign?: (design: CakeDesignExport) => void;
  onCreateFromTemplate?: (design: CakeDesignExport) => void;
}

export default function CakeDesignerGallery({
  isOpen,
  onClose,
  onEditDesign,
  onCreateFromTemplate,
}: CakeDesignerGalleryProps) {
  const module = getCakeDesignerModule();
  const [designs, setDesigns] = useState<CakeDesignExport[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [gallery, setGallery] = useState<CakeGalleryItem[]>([]);
  const [filter, setFilter] = useState<"all" | "ai" | "actual">("all");

  useEffect(() => {
    loadDesigns();
  }, [isOpen]);

  const loadDesigns = () => {
    const allDesigns = module.getAllDesigns();
    setDesigns(allDesigns);
    if (allDesigns.length > 0 && !selectedDesignId) {
      setSelectedDesignId(allDesigns[0].id);
    }
  };

  const loadGallery = (designId: string) => {
    const designGallery = module.getGallery(designId);
    setGallery(designGallery);
  };

  const handleSelectDesign = (id: string) => {
    setSelectedDesignId(id);
    loadGallery(id);
  };

  const handleDeleteDesign = (id: string) => {
    if (confirm("Delete this design and all associated images?")) {
      module.deleteDesign(id);
      loadDesigns();
      setSelectedDesignId(null);
      setGallery([]);
    }
  };

  const handleDuplicateDesign = (design: CakeDesignExport) => {
    const newDesign: CakeDesignExport = {
      ...design,
      id: `design-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    module.saveDesign(newDesign);
    loadDesigns();
  };

  const getFilteredGallery = (): CakeGalleryItem[] => {
    if (filter === "all") return gallery;
    return gallery.filter((item) => item.imageType === (filter === "ai" ? "ai-generated" : "actual-photo"));
  };

  if (!isOpen) return null;

  const selectedDesign = designs.find((d) => d.id === selectedDesignId);
  const filteredGallery = getFilteredGallery();

  return (
    <ResizableDraggablePanel
      title="🎨 Cake Gallery"
      onClose={onClose}
      defaultPosition={{ x: 100, y: 200, width: 1000, height: 600 }}
      minWidth={600}
      minHeight={400}
    >
      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "20px", padding: "20px", height: "100%" }}>
        {/* Left: Design List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto" }}>
          <h3 style={{ color: "#c8a97e", fontSize: "13px", fontWeight: "bold", margin: 0 }}>
            Saved Designs ({designs.length})
          </h3>

          {designs.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#666", textAlign: "center", margin: "40px 0" }}>
              No saved designs yet. Create one to get started!
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {designs.map((design) => (
                <div
                  key={design.id}
                  onClick={() => handleSelectDesign(design.id)}
                  style={{
                    padding: "10px",
                    backgroundColor:
                      selectedDesignId === design.id
                        ? "rgba(200, 169, 126, 0.15)"
                        : "rgba(200, 169, 126, 0.05)",
                    border: `1px solid ${selectedDesignId === design.id ? "#c8a97e" : "#333"}`,
                    borderRadius: "4px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#c8a97e", margin: "0 0 4px 0" }}>
                    {design.beoNumber || design.occasion}
                  </p>
                  <p style={{ fontSize: "11px", color: "#888", margin: "0 0 4px 0" }}>
                    {design.guestCount} guests • {design.tiers.length}-tier
                  </p>
                  <p style={{ fontSize: "10px", color: "#666", margin: 0 }}>
                    {new Date(design.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details & Gallery */}
        {selectedDesign ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
            {/* Design Info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ backgroundColor: "rgba(200, 169, 126, 0.05)", padding: "12px", borderRadius: "4px" }}>
                <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>
                  <strong>Occasion:</strong> {selectedDesign.occasion}
                </p>
                <p style={{ fontSize: "11px", color: "#888", margin: "4px 0 0 0" }}>
                  <strong>Guests:</strong> {selectedDesign.guestCount}
                </p>
                <p style={{ fontSize: "11px", color: "#888", margin: "4px 0 0 0" }}>
                  <strong>Tiers:</strong> {selectedDesign.tiers.length}
                </p>
              </div>

              <div style={{ backgroundColor: "rgba(255, 215, 0, 0.1)", padding: "12px", borderRadius: "4px" }}>
                <p style={{ fontSize: "11px", color: "#FFD700", margin: 0 }}>
                  <strong>Total Price:</strong>{" "}
                  {selectedDesign.totalPrice
                    ? `$${selectedDesign.totalPrice.toFixed(2)}`
                    : "Not set"}
                </p>
                <p style={{ fontSize: "11px", color: "#888", margin: "4px 0 0 0" }}>
                  <strong>Pedestal:</strong> {selectedDesign.pedestal || "None"}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() => onEditDesign?.(selectedDesign)}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "rgba(200, 169, 126, 0.1)",
                  border: "1px solid #c8a97e",
                  borderRadius: "4px",
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Edit2 size={12} /> Edit
              </button>

              <button
                onClick={() => onCreateFromTemplate?.(selectedDesign)}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "rgba(100, 200, 100, 0.1)",
                  border: "1px solid #8f8",
                  borderRadius: "4px",
                  color: "#8f8",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Copy size={12} /> New from Template
              </button>

              <button
                onClick={() => handleDuplicateDesign(selectedDesign)}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "rgba(200, 169, 126, 0.05)",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  color: "#aaa",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Duplicate
              </button>

              <button
                onClick={() => handleDeleteDesign(selectedDesign.id)}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "rgba(255, 0, 0, 0.1)",
                  border: "1px solid #f44",
                  borderRadius: "4px",
                  color: "#f88",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>

            {/* Gallery Filter */}
            <div>
              <h4 style={{ color: "#c8a97e", fontSize: "12px", fontWeight: "bold", margin: "12px 0 8px 0" }}>
                Gallery ({filteredGallery.length} images)
              </h4>
              <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                {(["all", "ai", "actual"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    style={{
                      padding: "4px 10px",
                      backgroundColor: filter === type ? "rgba(200, 169, 126, 0.2)" : "transparent",
                      border: `1px solid ${filter === type ? "#c8a97e" : "#444"}`,
                      borderRadius: "3px",
                      color: filter === type ? "#c8a97e" : "#888",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {type === "ai" ? "AI Generated" : type === "actual" ? "Photos" : "All"}
                  </button>
                ))}
              </div>

              {filteredGallery.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    borderRadius: "4px",
                    textAlign: "center",
                  }}
                >
                  <Image size={24} style={{ color: "#666", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
                    No {filter !== "all" ? filter : ""} images yet
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
                  {filteredGallery.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        position: "relative",
                        paddingBottom: "100%",
                        backgroundColor: "#000",
                        borderRadius: "4px",
                        overflow: "hidden",
                        border: "1px solid #333",
                      }}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.imageType}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          cursor: "pointer",
                        }}
                        title={item.imageType}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          backgroundColor: item.imageType === "ai-generated" ? "#c8a97e" : "#f0f0f0",
                          color: item.imageType === "ai-generated" ? "#000" : "#000",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          fontSize: "9px",
                          fontWeight: "700",
                        }}
                      >
                        {item.imageType === "ai-generated" ? "AI" : "PHOTO"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
              fontSize: "14px",
            }}
          >
            Select a design to view details
          </div>
        )}
      </div>
    </ResizableDraggablePanel>
  );
}
