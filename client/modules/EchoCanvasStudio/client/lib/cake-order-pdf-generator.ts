/**
 * Cake Order PDF Generator
 * Generates professional PDF order documents with cake images and all details
 */

import type { CakeDesignExport } from "@/modules/cake-designer-module";

interface PDFGeneratorOptions {
  bakeryName?: string;
  bakeryPhone?: string;
  bakeryEmail?: string;
  bakeryAddress?: string;
  logo?: string;
}

/**
 * Generate a professional cake order PDF
 * Note: This uses canvas-based PDF generation for client-side generation
 * For production, consider using a library like jsPDF or pdfkit
 */
export async function generateCakeOrderPDF(
  design: CakeDesignExport,
  options: PDFGeneratorOptions = {}
) {
  // Import jsPDF dynamically to avoid bundling if not needed
  const { jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Helper function to add text
  const addText = (text: string, x: number = margin, size: number = 12, weight: string = "normal", color: string = "#000000") => {
    doc.setFontSize(size);
    doc.setTextColor(parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16));
    if (weight === "bold") doc.setFont("", "bold");
    doc.text(text, x, yPosition);
    doc.setFont("", "normal");
    yPosition += size / 2.5 + 2;
  };

  // Header
  addText("CAKE ORDER FORM", margin, 24, "bold", "#00A8CC");

  // BEO Number & Date
  if (design.beoNumber) {
    addText(`Order #: ${design.beoNumber}`, margin, 11);
  }
  addText(`Order Date: ${new Date(design.createdAt).toLocaleDateString()}`, margin, 11);

  yPosition += 4;

  // Customer Information
  addText("CUSTOMER INFORMATION", margin, 14, "bold");
  if (design.contactPhone) {
    addText(`Phone: ${design.contactPhone}`, margin, 10);
  }
  if (design.contactEmail) {
    addText(`Email: ${design.contactEmail}`, margin, 10);
  }
  if (design.deliveryAddress) {
    addText(`Delivery Address: ${design.deliveryAddress}`, margin, 10);
  }

  yPosition += 4;

  // Cake Design Details
  addText("CAKE DESIGN DETAILS", margin, 14, "bold");
  addText(`Occasion: ${design.occasion}`, margin, 10);
  addText(`Guest Count: ${design.guestCount}`, margin, 10);
  addText(`Shape: ${design.shape}`, margin, 10);
  addText(`Design Complexity: ${design.designComplexity}`, margin, 10);

  yPosition += 4;

  // Cake Tiers
  addText("CAKE TIERS & LAYERS", margin, 12, "bold");
  design.tiers.forEach((tier, index) => {
    const diameter = tier.diameter ? `${tier.diameter}"Ø` : "custom";
    addText(
      `Tier ${index + 1}: ${diameter} × ${tier.height}" height`,
      margin + 5,
      10
    );
  });

  yPosition += 4;

  // Specifications
  addText("SPECIFICATIONS", margin, 12, "bold");
  addText(`Flavors: ${design.flavors.join(", ")}`, margin + 5, 10);
  addText(`Frosting: ${design.frostings.join(", ")}`, margin + 5, 10);
  addText(`Fillings: ${design.fillings.join(", ")}`, margin + 5, 10);
  if (design.decorations.length > 0) {
    addText(
      `Decorations: ${design.decorations.join(", ")}`,
      margin + 5,
      10
    );
  }
  if (design.pedestal !== "none" && design.pedestal) {
    addText(`Pedestal: ${design.pedestal}`, margin + 5, 10);
  }
  if (design.themeNotes) {
    addText(`Theme Notes: ${design.themeNotes}`, margin + 5, 10);
  }

  yPosition += 4;

  // Add image if available
  if (design.generatedImageUrl) {
    try {
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = 80;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        doc.addImage(img, "PNG", margin, yPosition, imageWidth, imageHeight);
        yPosition += imageHeight + 4;
      };
      img.src = design.generatedImageUrl;
    } catch (error) {
      console.error("Failed to add cake image to PDF:", error);
    }
  }

  // Pricing Section
  if (design.basePrice !== undefined) {
    yPosition += 4;
    addText("PRICING", margin, 14, "bold", "#FFD700");

    const servings = Math.round(
      Math.max(1, (design.tiers[0]?.diameter || 8) * (design.tiers.length || 1))
    );

    const baseCost = (design.basePrice || 6) * servings;
    addText(
      `Base Cake (${servings} servings @ $${design.basePrice}/serving): $${baseCost.toFixed(2)}`,
      margin + 5,
      10
    );

    if (design.decorationPrice && design.decorationPrice > 0) {
      addText(`Decorations: $${design.decorationPrice.toFixed(2)}`, margin + 5, 10);
    }

    if (design.pedestalPrice && design.pedestalPrice > 0) {
      addText(`Pedestal: $${design.pedestalPrice.toFixed(2)}`, margin + 5, 10);
    }

    if (design.deliveryPrice && design.deliveryPrice > 0) {
      addText(`Delivery: $${design.deliveryPrice.toFixed(2)}`, margin + 5, 10);
    }

    // Total
    const total =
      baseCost +
      (design.decorationPrice || 0) +
      (design.pedestalPrice || 0) +
      (design.deliveryPrice || 0);

    yPosition += 2;
    addText(`TOTAL: $${total.toFixed(2)}`, margin, 13, "bold", "#FFD700");
  }

  // Footer
  yPosition = pageHeight - margin - 12;
  addText("Thank you for your order!", margin, 10);
  if (options.bakeryName) {
    addText(`${options.bakeryName}`, margin, 10);
  }

  // Save PDF
  const filename = `cake-order-${design.beoNumber || Date.now()}.pdf`;
  doc.save(filename);

  return filename;
}

/**
 * Generate a simplified order summary as HTML (for email/sharing)
 */
export function generateOrderHTML(design: CakeDesignExport): string {
  const baseServings = Math.round(
    Math.max(1, (design.tiers[0]?.diameter || 8) * (design.tiers.length || 1))
  );
  const baseCost = (design.basePrice || 6) * baseServings;
  const total =
    baseCost +
    (design.decorationPrice || 0) +
    (design.pedestalPrice || 0) +
    (design.deliveryPrice || 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #00A8CC; color: white; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 14px; font-weight: bold; color: #00A8CC; margin-bottom: 8px; }
        .detail { margin: 4px 0; font-size: 13px; }
        .pricing { background: #FFF8DC; padding: 15px; border-left: 4px solid #FFD700; margin: 20px 0; }
        .pricing-row { display: flex; justify-content: space-between; margin: 6px 0; }
        .total { font-weight: bold; font-size: 16px; color: #FFD700; margin-top: 10px; padding-top: 10px; border-top: 1px solid #FFD700; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Cake Order Confirmation</h2>
          ${design.beoNumber ? `<p>Order #: ${design.beoNumber}</p>` : ""}
        </div>

        <div class="section">
          <div class="section-title">Customer Information</div>
          ${design.contactPhone ? `<div class="detail">Phone: ${design.contactPhone}</div>` : ""}
          ${design.contactEmail ? `<div class="detail">Email: ${design.contactEmail}</div>` : ""}
          ${design.deliveryAddress ? `<div class="detail">Delivery Address: ${design.deliveryAddress}</div>` : ""}
        </div>

        <div class="section">
          <div class="section-title">Cake Design</div>
          <div class="detail">Occasion: ${design.occasion}</div>
          <div class="detail">Guests: ${design.guestCount}</div>
          <div class="detail">Shape: ${design.shape}</div>
          <div class="detail">Tiers: ${design.tiers.length}</div>
          <div class="detail">Complexity: ${design.designComplexity}</div>
        </div>

        <div class="section">
          <div class="section-title">Flavors & Details</div>
          <div class="detail">Cake: ${design.flavors.join(", ")}</div>
          <div class="detail">Frosting: ${design.frostings.join(", ")}</div>
          <div class="detail">Fillings: ${design.fillings.join(", ")}</div>
          ${design.pedestal ? `<div class="detail">Pedestal: ${design.pedestal}</div>` : ""}
        </div>

        <div class="pricing">
          <div class="pricing-row">
            <span>Base Cake (${baseServings} servings):</span>
            <span>$${baseCost.toFixed(2)}</span>
          </div>
          ${design.decorationPrice ? `<div class="pricing-row"><span>Decorations:</span><span>$${design.decorationPrice.toFixed(2)}</span></div>` : ""}
          ${design.pedestalPrice ? `<div class="pricing-row"><span>Pedestal:</span><span>$${design.pedestalPrice.toFixed(2)}</span></div>` : ""}
          ${design.deliveryPrice ? `<div class="pricing-row"><span>Delivery:</span><span>$${design.deliveryPrice.toFixed(2)}</span></div>` : ""}
          <div class="total">TOTAL: $${total.toFixed(2)}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}
