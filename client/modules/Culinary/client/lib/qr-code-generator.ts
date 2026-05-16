/**
 * Generate a simple text representation of QR data for barcode printers
 * Can be used with barcode fonts or third-party QR generation services
 */

export interface QRCodeData {
  recipeName: string;
  allergens: string[];
  chefName?: string;
  printDate: string;
}

/**
 * Generate QR code data string
 * Format: RECIPE:name|ALLERGEN:allergen1,allergen2|DATE:yyyy-mm-dd|CHEF:name
 */
export function generateQRCodeString(data: QRCodeData): string {
  const parts = [
    `RECIPE:${data.recipeName}`,
    `ALLERGEN:${data.allergens.join(",")}`,
    `DATE:${data.printDate}`,
  ];

  if (data.chefName) {
    parts.push(`CHEF:${data.chefName}`);
  }

  return parts.join("|");
}

/**
 * Encode QR data for use with external QR generation APIs
 * Can be used with services like: api.qrserver.com, chart.googleapis.com/chart, etc.
 */
export function getQRCodeImageUrl(
  data: string,
  size: number = 200,
  service: "qrserver" | "google" = "qrserver",
): string {
  const encoded = encodeURIComponent(data);

  if (service === "qrserver") {
    // https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Test
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  }

  // Google Charts API fallback
  // https://chart.googleapis.com/chart?chs=200x200&chd=D:Hello&cht=qr
  return `https://chart.googleapis.com/chart?chs=${size}x${size}&chd=D:${encoded}&cht=qr`;
}

/**
 * Create a canvas-based QR code image (ASCII art style)
 * Useful for testing or low-bandwidth scenarios
 */
export function createASCIIQRCode(data: string): string {
  // Simple ASCII representation - in production, use a proper QR library
  const lines = [];
  lines.push("█".repeat(20));

  // Split data into chunks for display
  const chunks = data.match(/.{1,15}/g) || [];
  for (const chunk of chunks) {
    lines.push(`█ ${chunk.padEnd(15)} █`);
  }

  lines.push("█".repeat(20));
  return lines.join("\n");
}

/**
 * Generate a SVG-based QR code placeholder
 * This is a simple placeholder - for production, integrate with qrcode.js or similar
 */
export function generateQRCodeSVG(data: string, size: number = 200): string {
  const encoded = encodeURIComponent(data);
  const qrImageUrl = getQRCodeImageUrl(encoded, size, "qrserver");

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <image width="${size}" height="${size}" href="${qrImageUrl}" />
    </svg>
  `;
}

/**
 * Format label data for printing
 */
export interface LabelData {
  recipeName: string;
  bornOn: string;
  expiresOn: string;
  allergens: string[];
  portions: string;
  qrData: string;
  chefName?: string;
}

export function formatLabelHTML(label: LabelData): string {
  const qrImageUrl = getQRCodeImageUrl(label.qrData, 150, "qrserver");

  return `
    <div style="
      width: 4in;
      height: 6in;
      border: 1px solid #000;
      padding: 0.25in;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    ">
      <div>
        <h2 style="margin: 0 0 0.1in 0; font-size: 24px; text-align: center;">
          ${label.recipeName}
        </h2>
      </div>

      <div style="font-size: 12px; line-height: 1.8;">
        <div><strong>Born on:</strong> ${label.bornOn}</div>
        <div><strong>Expires:</strong> ${label.expiresOn}</div>
        ${label.portions ? `<div><strong>Portions:</strong> ${label.portions}</div>` : ""}
      </div>

      ${
        label.allergens && label.allergens.length > 0
          ? `
        <div style="
          background-color: #ffe6e6;
          color: #800000;
          padding: 0.1in;
          border-radius: 3px;
          font-weight: bold;
          font-size: 11px;
          text-align: center;
        ">
          ⚠️ ${label.allergens.join(", ")}
        </div>
      `
          : ""
      }

      <div style="text-align: center;">
        <img src="${qrImageUrl}" width="120" height="120" style="border: 1px solid #000;" />
      </div>

      ${
        label.chefName
          ? `<div style="font-size: 9px; text-align: center; margin-top: 0.05in;">Chef: ${label.chefName}</div>`
          : ""
      }
    </div>
  `;
}
