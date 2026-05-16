import type { DesignerElement } from "@/pages/sections/EchoMenuStudio";

const INCH_TO_PX = 96;
const CM_TO_INCH = 1 / 2.54;

export async function exportDesignAsPDF(
  canvas: HTMLDivElement,
  designName: string,
  printPreset: any
) {
  try {
    // Dynamically import to avoid build issues if libraries aren't installed
    let jsPDFLib: any;
    let html2canvasLib: any;

    try {
      const jsPDFModule = await import("jspdf");
      jsPDFLib = jsPDFModule.jsPDF;
    } catch {
      throw new Error("jsPDF is not installed. Please install it with: npm install jspdf");
    }

    try {
      const html2canvasModule = await import("html2canvas");
      html2canvasLib = html2canvasModule.default;
    } catch {
      throw new Error("html2canvas is not installed. Please install it with: npm install html2canvas");
    }

    // Take screenshot of canvas
    const screenshot = await html2canvasLib(canvas, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = screenshot.toDataURL("image/png");
    const widthInches = printPreset.widthIn || 8.5;
    const heightInches = printPreset.heightIn || 11;

    // Create PDF with correct dimensions
    const pdf = new jsPDFLib({
      orientation: widthInches > heightInches ? "landscape" : "portrait",
      unit: "in",
      format: [widthInches, heightInches],
    });

    // Add image to PDF, accounting for bleed
    const bleedInches = printPreset.bleedIn || 0.125;
    pdf.addImage(imgData, "PNG", -bleedInches, -bleedInches, widthInches + bleedInches * 2, heightInches + bleedInches * 2);

    // Save PDF
    pdf.save(`${designName}.pdf`);
    return { success: true };
  } catch (error) {
    console.error("PDF export failed:", error);
    throw error;
  }
}

export async function exportDesignAsSVG(
  elements: DesignerElement[],
  pageSize: { width: number; height: number },
  designName: string
) {
  try {
    const svgContent = generateSVG(elements, pageSize);
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${designName}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error("SVG export failed:", error);
    throw new Error("Failed to export SVG.");
  }
}

function generateSVG(
  elements: DesignerElement[],
  pageSize: { width: number; height: number }
): string {
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageSize.width} ${pageSize.height}" width="${pageSize.width}" height="${pageSize.height}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
    </style>
  </defs>`;

  // Sort elements by z-index
  const sorted = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  for (const element of sorted) {
    svg += generateSVGElement(element);
  }

  svg += "\n</svg>";
  return svg;
}

function generateSVGElement(element: DesignerElement): string {
  const { x, y, width, height, rotation, opacity } = element;
  const transform = rotation ? `transform="rotate(${rotation} ${x + width / 2} ${y + height / 2})"` : "";
  const opacityAttr = opacity !== undefined ? `opacity="${opacity}"` : "";

  let elementSVG = "";

  switch (element.type) {
    case "shape":
      if (element.shape === "ellipse") {
        elementSVG = `
  <ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" 
    fill="${element.fill || "transparent"}" stroke="${element.borderColor || "none"}" 
    stroke-width="${element.borderWidth || 0}" ${opacityAttr} ${transform} />`;
      } else {
        elementSVG = `
  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${element.borderRadius || 0}"
    fill="${element.fill || "transparent"}" stroke="${element.borderColor || "none"}" 
    stroke-width="${element.borderWidth || 0}" ${opacityAttr} ${transform} />`;
      }
      break;

    case "divider":
      elementSVG = `
  <line x1="${x}" y1="${y + height / 2}" x2="${x + width}" y2="${y + height / 2}"
    stroke="${element.color || "#000000"}" stroke-width="${element.thickness || 1}" ${opacityAttr} ${transform} />`;
      break;

    case "image":
      if (element.imageUrl) {
        elementSVG = `
  <image x="${x}" y="${y}" width="${width}" height="${height}" href="${element.imageUrl}"
    preserveAspectRatio="${element.objectFit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}" 
    ${opacityAttr} ${transform} />`;
      }
      break;

    case "heading":
    case "subheading":
    case "body":
    case "menu-item":
      const fontFamily = element.fontFamily || "Arial, sans-serif";
      const fontSize = element.fontSize || 16;
      const color = element.color || "#000000";
      const textAnchor = element.align === "center" ? "middle" : element.align === "right" ? "end" : "start";
      const startX = element.align === "center" ? x + width / 2 : element.align === "right" ? x + width : x;

      elementSVG = `
  <text x="${startX}" y="${y + fontSize}" font-family="${fontFamily}" font-size="${fontSize}"
    fill="${color}" text-anchor="${textAnchor}" 
    letter-spacing="${element.letterSpacing || 0}"
    line-height="${element.lineHeight || 1.4}" ${opacityAttr} ${transform}
    style="white-space: pre-wrap; word-wrap: break-word; max-width: ${width}px;">
    ${escapeXML(element.text || "")}
  </text>`;

      // Add description for menu items
      if ((element.type === "menu-item" || element.type === "body") && element.description) {
        const descY = y + fontSize + 4;
        const descSize = (fontSize * 0.8) | 0;
        elementSVG += `
  <text x="${startX}" y="${descY + descSize}" font-family="${fontFamily}" font-size="${descSize}"
    fill="${element.accentColor || color}" text-anchor="${textAnchor}" opacity="0.8"
    style="white-space: pre-wrap; word-wrap: break-word; max-width: ${width}px;">
    ${escapeXML(element.description)}
  </text>`;
      }

      // Add price for menu items
      if (element.type === "menu-item" && element.price) {
        const priceX = x + width - 20;
        elementSVG += `
  <text x="${priceX}" y="${y + fontSize}" font-family="${fontFamily}" font-size="${fontSize}"
    fill="${element.accentColor || color}" text-anchor="end" ${opacityAttr}>
    ${element.currency === "USD" ? "$" : ""}${element.price}
  </text>`;
      }
      break;
  }

  return elementSVG;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


// ── Allergen Matrix Report PDF ──

import { ALLERGEN_TAG_MAP } from "@/lib/taxonomy";

const ALL_ALLERGEN_SLUGS = Object.keys(ALLERGEN_TAG_MAP);

/**
 * Generates a compliance-style Allergen Matrix PDF.
 * Rows = menu items, Columns = allergens/diets, Bold X marks present allergens.
 */
export async function exportAllergenMatrixPDF(
  menuItems: Array<{ text: string; allergenTags?: string[] }>,
  documentName: string,
) {
  let jsPDFLib: any;
  try {
    const mod = await import("jspdf");
    jsPDFLib = mod.jsPDF;
  } catch {
    throw new Error("jsPDF is not installed.");
  }

  // Filter to only allergens that appear on at least one item
  const usedSlugs = ALL_ALLERGEN_SLUGS.filter((slug) =>
    menuItems.some((item) => item.allergenTags?.includes(slug)),
  );
  // If no allergens used at all, show all common ones (first 11 = allergens only)
  const columns =
    usedSlugs.length > 0
      ? usedSlugs
      : ALL_ALLERGEN_SLUGS.slice(0, 11);

  const colDefs = columns.map((slug) => ALLERGEN_TAG_MAP[slug]);

  // Layout constants
  const pageW = 11;
  const pageH = 8.5;
  const marginL = 0.6;
  const marginT = 1.1;
  const rowNameW = 2.8;
  const cellW = Math.min(
    0.72,
    (pageW - marginL - 0.4 - rowNameW) / columns.length,
  );
  const rowH = 0.32;
  const headerH = 0.95;

  const pdf = new jsPDFLib({
    orientation: "landscape",
    unit: "in",
    format: "letter",
  });

  // ── Title block ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("ALLERGEN MATRIX REPORT", marginL, 0.55);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text(
    `Menu: ${documentName || "Untitled"}  |  Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}  |  Items: ${menuItems.length}`,
    marginL,
    0.78,
  );
  pdf.setTextColor(0);

  // Separator line under title
  pdf.setDrawColor(180);
  pdf.setLineWidth(0.008);
  pdf.line(marginL, 0.88, pageW - 0.4, 0.88);

  // ── Column headers (allergen codes rotated) ──
  const tableL = marginL + rowNameW;

  // Header background
  pdf.setFillColor(245, 245, 250);
  pdf.rect(tableL, marginT - headerH + 0.05, cellW * columns.length, headerH - 0.05, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);

  colDefs.forEach((col, ci) => {
    const cx = tableL + ci * cellW + cellW / 2;
    const cy = marginT - 0.08;

    // Save state, translate+rotate for vertical header text
    pdf.saveGraphicsState();

    // Draw rotated text
    const label = `(${col.code}) ${col.label}`;
    pdf.text(label, cx, cy, {
      angle: 55,
      align: "left",
    });

    pdf.restoreGraphicsState();
  });

  // ── Rows ──
  const maxRows = Math.floor((pageH - marginT - 0.5) / rowH);
  const itemsToRender = menuItems.slice(0, maxRows);

  pdf.setFontSize(8);

  itemsToRender.forEach((item, ri) => {
    const y = marginT + ri * rowH;
    const isAlt = ri % 2 === 1;

    // Alternating row background
    if (isAlt) {
      pdf.setFillColor(250, 250, 252);
      pdf.rect(marginL, y - 0.01, rowNameW + cellW * columns.length, rowH, "F");
    }

    // Row border
    pdf.setDrawColor(220);
    pdf.setLineWidth(0.004);
    pdf.line(marginL, y + rowH - 0.01, marginL + rowNameW + cellW * columns.length, y + rowH - 0.01);

    // Item name (truncated)
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const name = (item.text || "Unnamed Item").substring(0, 40);
    pdf.text(name, marginL + 0.08, y + rowH * 0.65);

    // Allergen marks
    const tags = item.allergenTags ?? [];
    columns.forEach((slug, ci) => {
      if (tags.includes(slug)) {
        const cx = tableL + ci * cellW + cellW / 2;
        const cy = y + rowH * 0.7;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text("X", cx, cy, { align: "center" });
      }
    });
  });

  // Column grid lines
  pdf.setDrawColor(210);
  pdf.setLineWidth(0.003);
  for (let ci = 0; ci <= columns.length; ci++) {
    const x = tableL + ci * cellW;
    pdf.line(x, marginT - 0.01, x, marginT + itemsToRender.length * rowH - 0.01);
  }
  // Left edge of name column
  pdf.line(marginL, marginT - 0.01, marginL, marginT + itemsToRender.length * rowH - 0.01);

  // ── Footer ──
  const footerY = pageH - 0.35;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(7);
  pdf.setTextColor(140);
  pdf.text(
    "This report is auto-generated from LUCCCA Menu Design Studio. Verify allergen data with kitchen management before distribution.",
    marginL,
    footerY,
  );

  // Legend
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(100);
  const legendParts = colDefs.map((c) => `(${c.code}) ${c.label}`);
  pdf.text(`Legend: ${legendParts.join("  |  ")}`, marginL, footerY + 0.18);

  pdf.setTextColor(0);

  // Save
  const safeName = (documentName || "menu").replace(/[^a-zA-Z0-9-_ ]/g, "");
  pdf.save(`${safeName}-allergen-matrix.pdf`);
}
