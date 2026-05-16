// src/modules/pastry/cake/utils/CanvasExportEngine.js

import html2canvas from "html2canvas";

export const generateCakeExportReport = async ({
  canvasRef,
  cakeName,
  clientName,
  eventDate,
  layers,
  notes,
}) => {
  try {
    // Snapshot of the cake canvas
    const canvasElement = canvasRef.current;
    const snapshot = await html2canvas(canvasElement, {
      backgroundColor: "#ffffff",
      scale: 2,
    });

    const imageDataURL = snapshot.toDataURL("image/png");

    const structuredLayers = layers.map((layer, index) => ({
      position: index + 1,
      type: layer.type,
      flavor: layer.flavor || layer.filling || "",
      decoration: layer.decoration || "",
      notes: layer.notes || "",
    }));

    // Assemble final report data
    const report = {
      cakeName: cakeName || "Custom Cake",
      client: clientName || "Unspecified Client",
      eventDate: eventDate || new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      layerCount: layers.length,
      layers: structuredLayers,
      generalNotes: notes || "",
      canvasSnapshot: imageDataURL,
    };

    return report;
  } catch (error) {
    console.error("Error generating cake export report:", error);
    throw error;
  }
};

export default generateCakeExportReport;
