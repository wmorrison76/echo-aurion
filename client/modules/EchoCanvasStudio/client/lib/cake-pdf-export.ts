/**
 * Cake Design PDF Export Utility
 * Exports cake designs with pricing, specifications, and images to PDF
 */

import { sanitizeTextForPDF } from "./html-sanitizer";

interface CakeDesignPDF {
  title: string;
  imageUrl: string;
  tiers: Array<{
    diameter: number;
    height: number;
    flavor: string;
    filling: string;
  }>;
  frosting: {
    type: string;
    color: string;
    texture: string;
  };
  decorations: Array<{
    name: string;
    description: string;
  }>;
  servings: number;
  pricing: {
    basePrice: number;
    decorationPrice: number;
    totalPrice: number;
    deliveryFee: number;
  };
  eventDate?: string;
  clientName?: string;
  notes?: string;
  copies?: number;
}

export async function generateCakePDF(design: CakeDesignPDF): Promise<Blob> {
  // Create a canvas-based PDF generator
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // Set canvas size for A4 (210mm × 297mm at 96 DPI)
  canvas.width = 800;
  canvas.height = 1131;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let yPosition = 40;

  // Header
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 28px Arial";
  ctx.fillText("Cake Design Proposal", 40, yPosition);
  yPosition += 40;

  // Client info
  if (design.clientName) {
    ctx.font = "14px Arial";
    ctx.fillStyle = "#333";
    ctx.fillText(`Client: ${design.clientName}`, 40, yPosition);
    yPosition += 25;
  }

  if (design.eventDate) {
    ctx.fillText(
      `Event Date: ${new Date(design.eventDate).toLocaleDateString()}`,
      40,
      yPosition,
    );
    yPosition += 25;
  }

  yPosition += 20;

  // Specifications Section
  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Cake Specifications", 40, yPosition);
  yPosition += 25;

  ctx.fillStyle = "#333";
  ctx.font = "12px Arial";

  const specs = [
    `Tiers: ${design.tiers.length}`,
    `Total Servings: ${design.servings}`,
    `Frosting: ${design.frosting.type}`,
    `Frosting Texture: ${design.frosting.texture}`,
  ];

  specs.forEach((spec) => {
    ctx.fillText(spec, 60, yPosition);
    yPosition += 20;
  });

  yPosition += 10;

  // Tier Details
  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 14px Arial";
  ctx.fillText("Tier Details", 40, yPosition);
  yPosition += 20;

  design.tiers.forEach((tier, index) => {
    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";
    ctx.fillText(
      `Tier ${index + 1}: ${tier.diameter}" diameter × ${tier.height}" height`,
      60,
      yPosition,
    );
    yPosition += 18;
    ctx.fillText(
      `Flavor: ${tier.flavor} | Filling: ${tier.filling}`,
      80,
      yPosition,
    );
    yPosition += 18;
  });

  yPosition += 10;

  // Decorations
  if (design.decorations.length > 0) {
    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 14px Arial";
    ctx.fillText("Decorations", 40, yPosition);
    yPosition += 20;

    design.decorations.forEach((deco) => {
      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.fillText(`• ${deco.name}`, 60, yPosition);
      yPosition += 18;
    });

    yPosition += 10;
  }

  // Pricing Section
  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Pricing Breakdown", 40, yPosition);
  yPosition += 25;

  const pricingData = [
    { label: "Base Cake", value: design.pricing.basePrice },
    { label: "Decorations", value: design.pricing.decorationPrice },
    { label: "Delivery Fee", value: design.pricing.deliveryFee },
  ];

  ctx.fillStyle = "#333";
  ctx.font = "12px Arial";

  pricingData.forEach(({ label, value }) => {
    ctx.fillText(label, 60, yPosition);
    ctx.fillText(`$${value.toFixed(2)}`, 350, yPosition);
    yPosition += 20;
  });

  // Total
  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 14px Arial";
  ctx.fillText("Total Price", 60, yPosition);
  ctx.fillText(`$${design.pricing.totalPrice.toFixed(2)}`, 350, yPosition);
  yPosition += 25;

  // Print copies
  if (design.copies && design.copies > 1) {
    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";
    ctx.fillText(`Number of Copies: ${design.copies}`, 40, yPosition);
    yPosition += 20;
    ctx.fillText(
      `Total for ${design.copies} copies: $${(design.pricing.totalPrice * design.copies).toFixed(2)}`,
      40,
      yPosition,
    );
  }

  // Notes (Sanitized)
  if (design.notes) {
    yPosition += 30;
    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 14px Arial";
    ctx.fillText("Additional Notes", 40, yPosition);
    yPosition += 20;

    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";

    const sanitizedNotes = sanitizeTextForPDF(design.notes);
    const maxWidth = 700;
    const noteLines = sanitizedNotes.split("\n");

    noteLines.forEach((line) => {
      if (line.trim()) {
        const wrappedLines = wrapText(ctx, line, maxWidth);
        wrappedLines.forEach((wrappedLine) => {
          if (yPosition > canvas.height - 60) {
            yPosition = canvas.height - 40;
          }
          ctx.fillText(wrappedLine, 60, yPosition);
          yPosition += 18;
        });
      } else {
        yPosition += 8;
      }
    });
  }

  // Footer
  ctx.fillStyle = "#999";
  ctx.font = "10px Arial";
  ctx.fillText("Generated by EchoCanva Cake Designer", 40, canvas.height - 20);

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to generate PDF blob"));
      }
    }, "image/png");
  });
}

export async function downloadPDF(
  design: CakeDesignPDF,
  filename: string = "cake-design.pdf",
): Promise<void> {
  try {
    const blob = await generateCakePDF(design);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    throw error;
  }
}

export async function printPDF(
  design: CakeDesignPDF,
  copies: number = 1,
): Promise<void> {
  try {
    const updatedDesign = { ...design, copies };
    const blob = await generateCakePDF(updatedDesign);
    const url = URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    };
  } catch (error) {
    console.error("Error printing PDF:", error);
    throw error;
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
