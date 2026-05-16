/** * Export Manager for Whiteboard Sessions * Handles PNG, SVG, and PDF exports with Luccca branding */ import { CanvasState, DrawingStroke, TextElement, ShapeElement, StickyNote } from"./types";
import { v4 as uuidv4 } from"uuid"; export type ExportFormat ="png" |"svg" |"pdf"; export interface ExportOptions { format: ExportFormat; quality?: number; // 0-1 for PNG/JPEG includeWatermark?: boolean; includeBranding?: boolean; title?: string; metadata?: Record<string, string>;
} export interface ExportResult { id: string; format: ExportFormat; filename: string; size: number; createdAt: number; success: boolean; error?: string;
} const LUCCCA_BRANDING = { logo:"LUCCCA", color:"#00b4d8", watermark:"Made with LUCCCA",
}; class ExportManager { /** * Export canvas to PNG */ static async exportPNG( canvas: HTMLCanvasElement, options: ExportOptions ): Promise<Blob> { const tempCanvas = canvas.cloneNode(true) as HTMLCanvasElement; const ctx = tempCanvas.getContext("2d"); if (!ctx) throw new Error("Failed to get canvas context"); if (options.includeBranding) { this.addBranding(ctx, tempCanvas.width, tempCanvas.height); } return new Promise((resolve, reject) => { tempCanvas.toBlob( (blob) => { if (blob) { resolve(blob); } else { reject(new Error("Failed to export PNG")); } },"image/png", options.quality || 0.95 ); }); } /** * Export canvas to SVG */ static async exportSVG( canvasState: CanvasState, options: ExportOptions ): Promise<Blob> { const { strokes, texts, shapes, stickyNotes, viewportX, viewportY, zoomLevel, } = canvasState; // Calculate bounds let minX = 0, minY = 0, maxX = 1000, maxY = 800; // SVG header let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}"> <defs> <style> .luccca-text { font-family: Arial, sans-serif; } .luccca-shape { fill-opacity: 0.9; } </style> </defs> <rect width="${maxX}" height="${maxY}" fill="white"/>
`; // Add strokes strokes.forEach((stroke) => { const pathData = stroke.points .map((p, i) => `${i === 0 ?"M" :"L"} ${p.x} ${p.y}`) .join(""); svg += ` <path d="${pathData}" stroke="${stroke.color}" stroke-width="${stroke.lineWidth}" fill="none" opacity="${stroke.opacity}" stroke-linecap="round" stroke-linejoin="round"/>\n`; }); // Add shapes shapes.forEach((shape) => { switch (shape.type) { case"rectangle": svg += ` <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${shape.fillColor || shape.color}" stroke="${shape.color}" stroke-width="${shape.lineWidth}" opacity="${shape.opacity}" class="luccca-shape"/>\n`; break; case"circle": svg += ` <circle cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" r="${shape.width / 2}" fill="${shape.fillColor || shape.color}" stroke="${shape.color}" stroke-width="${shape.lineWidth}" opacity="${shape.opacity}" class="luccca-shape"/>\n`; break; case"triangle": const points = `${shape.x + shape.width / 2},${shape.y} ${shape.x + shape.width},${shape.y + shape.height} ${shape.x},${shape.y + shape.height}`; svg += ` <polygon points="${points}" fill="${shape.fillColor || shape.color}" stroke="${shape.color}" stroke-width="${shape.lineWidth}" opacity="${shape.opacity}" class="luccca-shape"/>\n`; break; } }); // Add texts texts.forEach((text) => { svg += ` <text x="${text.x}" y="${text.y}" font-family="${text.fontFamily}" font-size="${text.fontSize}" fill="${text.color}" class="luccca-text">${this.escapeXml(text.text)}</text>\n`; }); // Add sticky notes stickyNotes.forEach((note) => { const colors: Record<string, string> = { yellow:"#fef3c7", pink:"#fbcfe8", blue:"#bfdbfe", green:"#d1fae5", purple:"#ede9fe", orange:"#fed7aa", }; svg += ` <rect x="${note.x}" y="${note.y}" width="${note.width}" height="${note.height}" fill="${colors[note.color]}" stroke="#666" stroke-width="1" class="luccca-shape"/>\n`; svg += ` <text x="${note.x + 10}" y="${note.y + 20}" font-size="12" fill="#333" class="luccca-text">${this.escapeXml(note.text)}</text>\n`; }); // Add branding if (options.includeBranding) { svg += ` <g opacity="0.3">\n`; svg += ` <text x="${maxX - 150}" y="${maxY - 20}" font-size="14" fill="${LUCCCA_BRANDING.color}" font-weight="bold">${LUCCCA_BRANDING.watermark}</text>\n`; svg += ` </g>\n`; } // Add metadata if (options.title) { svg += ` <title>${this.escapeXml(options.title)}</title>\n`; } svg += `</svg>`; return new Blob([svg], { type:"image/svg+xml" }); } /** * Export canvas to PDF (requires external library, returns blob with instructions) */ static async exportPDF( canvas: HTMLCanvasElement, options: ExportOptions ): Promise<Blob> { // For production, integrate with pdfkit or jspdf // This is a placeholder that exports as PNG in PDF wrapper const pngBlob = await this.exportPNG(canvas, options); const pngDataUrl = await this.blobToDataUrl(pngBlob); // Simple PDF structure const pdfContent = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
50 750 Td
(${options.title ||"Whiteboard Export"}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000229 00000 n
0000000310 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
404
%%EOF
`; return new Blob([pdfContent], { type:"application/pdf" }); } /** * Export session with all metadata */ static async exportSession( canvasState: CanvasState, sessionId: string, options: ExportOptions ): Promise<ExportResult> { const exportId = uuidv4(); try { let blob: Blob; switch (options.format) { case"png": // For PNG, would need to render canvas first throw new Error("PNG export requires canvas reference. Use exportPNG method directly." ); case"svg": blob = await this.exportSVG(canvasState, options); break; case"pdf": throw new Error("PDF export requires canvas reference. Use exportPDF method directly." ); default: throw new Error(`Unsupported format: ${options.format}`); } const filename = `whiteboard-${sessionId}-${new Date().toISOString().split("T")[0]}.${options.format}`; // Save file const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); return { id: exportId, format: options.format, filename, size: blob.size, createdAt: Date.now(), success: true, }; } catch (error) { return { id: exportId, format: options.format, filename: `export-${exportId}`, size: 0, createdAt: Date.now(), success: false, error: error instanceof Error ? error.message :"Unknown error", }; } } /** * Get export history from localStorage */ static getExportHistory(): ExportResult[] { try { const history = localStorage.getItem("echo:whiteboard:export-history"); return history ? JSON.parse(history) : []; } catch { return []; } } /** * Save export to history */ static saveExportHistory(result: ExportResult): void { try { const history = this.getExportHistory(); history.unshift(result); // Keep only last 20 exports const trimmed = history.slice(0, 20); localStorage.setItem("echo:whiteboard:export-history", JSON.stringify(trimmed) ); } catch (error) { console.error("Failed to save export history:", error); } } /** * Add Luccca branding to canvas */ private static addBranding( ctx: CanvasRenderingContext2D, width: number, height: number ): void { ctx.globalAlpha = 0.3; ctx.font ="14px Arial"; ctx.fillStyle = LUCCCA_BRANDING.color; ctx.fillText(LUCCCA_BRANDING.watermark, width - 200, height - 20); ctx.globalAlpha = 1; } /** * Escape XML special characters */ private static escapeXml(text: string): string { return text .replace(/&/g,"&amp;") .replace(/</g,"&lt;") .replace(/>/g,"&gt;") .replace(/"/g,"&quot;") .replace(/'/g,"&apos;"); } /** * Convert blob to data URL */ private static blobToDataUrl(blob: Blob): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(blob); }); }
} export default ExportManager;
