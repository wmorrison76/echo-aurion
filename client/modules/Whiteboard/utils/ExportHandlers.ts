import {
  Presentation,
  PresentationExportOptions,
} from "../types/PresentationTypes";

/**
 * Export presentation to PDF
 * Uses html2pdf library for client-side PDF generation
 */
export async function exportToPDF(
  presentation: Presentation,
  fileName: string,
): Promise<void> {
  try {
    // Import at usage time to avoid build issues
    const { default: html2pdf } = await import("html2pdf.js");

    // Create HTML from presentation slides
    const element = document.createElement("div");
    element.innerHTML = presentation.slides
      .map(
        (slide) => `
        <div style="page-break-after: always; padding: 40px; min-height: 100vh; background: white;">
          <h1>${slide.title}</h1>
          <p>${slide.content}</p>
          ${
            slide.narration?.duration
              ? `<p style="font-size: 12px; color: #666;">Narration: ${slide.narration.duration}s</p>`
              : ""
          }
        </div>
      `,
      )
      .join("");

    const options = {
      margin: 10,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    };

    html2pdf().set(options).from(element).save();
  } catch (error) {
    console.error("Failed to export PDF:", error);
    throw new Error("PDF export failed");
  }
}

/**
 * Export presentation to MP4 video with narration
 * Uses FFmpeg WASM for client-side video encoding
 */
export async function exportToMP4(
  presentation: Presentation,
  fileName: string,
): Promise<void> {
  try {
    console.log("MP4 export initiated:", fileName);
    // This requires FFmpeg WASM library - would be added as dependency
    // For now, provide implementation framework
    // await FFmpeg.createFFmpeg().load()
    throw new Error("MP4 export requires FFmpeg WASM installation");
  } catch (error) {
    console.error("Failed to export MP4:", error);
    throw error;
  }
}

/**
 * Export presentation to PPTX (PowerPoint format)
 * Uses pptxgen library for client-side PPTX generation
 */
export async function exportToPPTX(
  presentation: Presentation,
  fileName: string,
): Promise<void> {
  try {
    // Import at usage time to avoid build issues
    const { default: PptxGenJS } = await import("pptxgenjs");
    const prs = new PptxGenJS();

    // Configure presentation
    prs.defineLayout({ name: "LAYOUT1", width: 10, height: 7.5 });

    // Add slides
    presentation.slides.forEach((slide) => {
      const slide_layout = prs.addSlide("LAYOUT1");

      // Add title
      slide_layout.addText(slide.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: 44,
        bold: true,
      });

      // Add content
      slide_layout.addText(slide.content, {
        x: 0.5,
        y: 1.7,
        w: 9,
        h: 4,
        fontSize: 18,
      });

      // Add narration info
      if (slide.narration?.duration) {
        slide_layout.addText(`🎙️ Narration: ${slide.narration.duration}s`, {
          x: 0.5,
          y: 6,
          w: 9,
          h: 0.8,
          fontSize: 10,
          color: "666666",
        });
      }
    });

    // Save
    prs.writeFile({ fileName });
  } catch (error) {
    console.error("Failed to export PPTX:", error);
    throw error;
  }
}

/**
 * Export presentation as JSON for re-import
 */
export async function exportToJSON(
  presentation: Presentation,
  fileName: string,
): Promise<void> {
  try {
    const dataStr = JSON.stringify(presentation, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export JSON:", error);
    throw error;
  }
}

/**
 * Main export handler - routes to appropriate format
 */
export async function handleExport(
  presentation: Presentation,
  options: PresentationExportOptions,
): Promise<void> {
  // Emit trace before export
  try {
    const { emitTrace } = await import("@/lib/trace-emitter");
    await emitTrace(
      "whiteboard-export",
      `export-${presentation.id || Date.now()}`,
      "whiteboard-export",
      "export",
      {
        format: options.format,
        fileName: options.fileName,
        presentationId: presentation.id,
        slideCount: presentation.slides?.length || 0,
      },
      {
        success: false, // Will be updated after export
      },
    );
  } catch {
    // Ignore trace errors - graceful degradation
  }

  try {
    let fileSize = 0;
    switch (options.format) {
      case "pdf":
        await exportToPDF(presentation, options.fileName);
        break;
      case "mp4":
        await exportToMP4(presentation, options.fileName);
        break;
      case "pptx":
        await exportToPPTX(presentation, options.fileName);
        break;
      case "json":
        await exportToJSON(presentation, options.fileName);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    // Update trace with success
    try {
      const { emitTrace } = await import("@/lib/trace-emitter");
      await emitTrace(
        "whiteboard-export",
        `export-${presentation.id || Date.now()}`,
        "whiteboard-export",
        "export",
        {
          format: options.format,
          fileName: options.fileName,
        },
        {
          success: true,
          fileSize,
        },
      );
    } catch {
      // Ignore trace errors - graceful degradation
    }
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  }
}
