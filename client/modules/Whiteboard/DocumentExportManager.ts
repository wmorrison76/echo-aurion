import {
  CanvasState,
  PDFElement,
  ImageElement,
  DocumentElement,
} from "./types";
import html2pdf from "html2pdf.js";
import jsPDF from "jspdf";
interface ExportOptions {
  format: "pdf" | "svg" | "png" | "json";
  quality: "low" | "medium" | "high";
  includeDocuments: boolean;
  backgroundColor?: string;
} /** * Export canvas state as JSON for backup and sharing */
export const exportCanvasAsJSON = (
  canvasState: CanvasState,
  sessionTitle: string,
): string => {
  const exportData = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    sessionTitle,
    canvasState,
  };
  return JSON.stringify(exportData, null, 2);
}; /** * Export canvas as PNG image */
export const exportCanvasAsPNG = async (
  canvasElement: HTMLCanvasElement,
  fileName: string = "whiteboard.png",
): Promise<void> => {
  const link = document.createElement("a");
  link.href = canvasElement.toDataURL("image/png");
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; /** * Export canvas as SVG preserving layers */
export const exportCanvasAsSVG = (
  canvasState: CanvasState,
  width: number,
  height: number,
  fileName: string = "whiteboard.svg",
): void => {
  const svg = createSVGElement(canvasState, width, height);
  const svgString = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}; /** * Create SVG element from canvas state with layers */
const createSVGElement = (
  canvasState: CanvasState,
  width: number,
  height: number,
): SVGSVGElement => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width.toString());
  svg.setAttribute("height", height.toString());
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`); // Background const bg = document.createElementNS("http://www.w3.org/2000/svg","rect"); bg.setAttribute("width", width.toString()); bg.setAttribute("height", height.toString()); bg.setAttribute("fill", canvasState.backgroundColor); svg.appendChild(bg); // Grid (if visible) if (canvasState.showGrid) { const gridSize = canvasState.gridSize; for (let x = 0; x < width; x += gridSize) { const line = document.createElementNS("http://www.w3.org/2000/svg","line", ); line.setAttribute("x1", x.toString()); line.setAttribute("y1","0"); line.setAttribute("x2", x.toString()); line.setAttribute("y2", height.toString()); line.setAttribute("stroke","#e5e7eb"); line.setAttribute("stroke-width","0.5"); svg.appendChild(line); } for (let y = 0; y < height; y += gridSize) { const line = document.createElementNS("http://www.w3.org/2000/svg","line", ); line.setAttribute("x1","0"); line.setAttribute("y1", y.toString()); line.setAttribute("x2", width.toString()); line.setAttribute("y2", y.toString()); line.setAttribute("stroke","#e5e7eb"); line.setAttribute("stroke-width","0.5"); svg.appendChild(line); } } // Create layer groups const shapesGroup = document.createElementNS("http://www.w3.org/2000/svg","g", ); shapesGroup.setAttribute("id","shapes"); // Add shapes canvasState.shapes.forEach((shape) => { const rect = document.createElementNS("http://www.w3.org/2000/svg","rect"); rect.setAttribute("x", shape.x.toString()); rect.setAttribute("y", shape.y.toString()); rect.setAttribute("width", shape.width.toString()); rect.setAttribute("height", shape.height.toString()); rect.setAttribute("fill", shape.fillColor ||"none"); rect.setAttribute("stroke", shape.color); rect.setAttribute("stroke-width", shape.lineWidth.toString()); rect.setAttribute("opacity", shape.opacity.toString()); if (shape.rotation) { rect.setAttribute("transform", `rotate(${shape.rotation} ${shape.x + shape.width / 2} ${ shape.y + shape.height / 2 })`, ); } shapesGroup.appendChild(rect); }); svg.appendChild(shapesGroup); // Add texts const textsGroup = document.createElementNS("http://www.w3.org/2000/svg","g", ); textsGroup.setAttribute("id","texts"); canvasState.texts.forEach((text) => { const textEl = document.createElementNS("http://www.w3.org/2000/svg","text", ); textEl.setAttribute("x", text.x.toString()); textEl.setAttribute("y", text.y.toString()); textEl.setAttribute("font-size", text.fontSize.toString()); textEl.setAttribute("fill", text.color); textEl.setAttribute("font-family", text.fontFamily); if (text.fontWeight ==="bold") { textEl.setAttribute("font-weight","bold"); } if (text.isItalic) { textEl.setAttribute("font-style","italic"); } if (text.isUnderline) { textEl.setAttribute("text-decoration","underline"); } textEl.textContent = text.text; textsGroup.appendChild(textEl); }); svg.appendChild(textsGroup); return svg;
}; /** * Export canvas as PDF with documents embedded */
export const exportCanvasAsPDF = async (
  canvasState: CanvasState,
  width: number,
  height: number,
  fileName: string = "whiteboard.pdf",
  options: ExportOptions = {
    format: "pdf",
    quality: "high",
    includeDocuments: true,
  },
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: width > height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
  }); // Add background color if (options.backgroundColor) { pdf.setDrawColor(options.backgroundColor); pdf.rect(0, 0, width, height); } // Add shapes canvasState.shapes.forEach((shape) => { pdf.setDrawColor(shape.color); pdf.setLineWidth(shape.lineWidth); pdf.setFillColor(shape.fillColor ||"white"); if (shape.type ==="rectangle") { pdf.rect(shape.x, shape.y, shape.width, shape.height,"S"); } }); // Add texts canvasState.texts.forEach((text) => { pdf.setTextColor(text.color); pdf.setFont( text.fontFamily, text.fontWeight ==="bold" ?"bold" :"normal", ); pdf.setFontSize(text.fontSize); pdf.text(text.text, text.x, text.y); }); // Add sticky notes canvasState.stickyNotes.forEach((sticky) => { const colorMap: Record<string, string> = { yellow:"#FFFF00", pink:"#FFC0CB", blue:"#ADD8E6", green:"#90EE90", purple:"#DDA0DD", orange:"#FFA500", }; pdf.setFillColor(colorMap[sticky.color] ||"#FFFF00"); pdf.rect(sticky.x, sticky.y, sticky.width, sticky.height,"F"); pdf.setTextColor(0, 0, 0); pdf.setFont("Arial"); pdf.setFontSize(10); pdf.text(sticky.text, sticky.x + 5, sticky.y + 15, { maxWidth: sticky.width - 10, }); }); // Note: Document embedding would require converting documents to PDF pages // This is a complex operation that would need additional logic pdf.save(fileName);
}; /** * Export canvas as HTML for web sharing */
export const exportCanvasAsHTML = (
  canvasState: CanvasState,
  sessionTitle: string,
): string => {
  const html = ` <!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>${sessionTitle}</title> <style> body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; } .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); } h1 { margin: 0 0 20px 0; color: #1f2937; } .canvas { width: 100%; height: 800px; border: 1px solid #e5e7eb; background: ${canvasState.backgroundColor}; position: relative; overflow: auto; } .shape { position: absolute; border: 2px solid #3b82f6; background: rgba(59, 130, 246, 0.1); } .text { position: absolute; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; } .sticky { position: absolute; padding: 10px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); font-size: 14px; } </style> </head> <body> <div class="container"> <h1>${sessionTitle}</h1> <div class="canvas"> ${canvasState.shapes.map((s) => `<div class="shape" style="left: ${s.x}px; top: ${s.y}px; width: ${s.width}px; height: ${s.height}px;"></div>`).join("")} ${canvasState.texts.map((t) => `<div class="text" style="left: ${t.x}px; top: ${t.y}px; color: ${t.color}; font-size: ${t.fontSize}px;">${t.text}</div>`).join("")} ${canvasState.stickyNotes.map((s) => `<div class="sticky" style="left: ${s.x}px; top: ${s.y}px; width: ${s.width}px; height: ${s.height}px; background: ${getColorHex(s.color)};">${s.text}</div>`).join("")} </div> <p style="margin-top: 20px; color: #6b7280; font-size: 12px;"> Exported from Whiteboard on ${new Date().toLocaleString()} </p> </div> </body> </html> `;
  return html;
}; /** * Helper: Get hex color for sticky note color */
const getColorHex = (color: string): string => {
  const colorMap: Record<string, string> = {
    yellow: "#FFF9E6",
    pink: "#FFE6F0",
    blue: "#E6F2FF",
    green: "#E6FFE6",
    purple: "#F5E6FF",
    orange: "#FFECCC",
  };
  return colorMap[color] || "#FFFF00";
}; /** * Trigger file download */
export const downloadFile = (
  content: string,
  fileName: string,
  type: string,
): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}; /** * Export entire session as backup */
export const exportSessionAsBackup = (
  canvasState: CanvasState,
  sessionTitle: string,
  fileName: string = "whiteboard-backup.json",
): void => {
  const json = exportCanvasAsJSON(canvasState, sessionTitle);
  downloadFile(json, fileName, "application/json");
};
