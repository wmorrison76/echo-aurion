/**
 * Barcode Extractor
 *
 * Extracts barcodes and GTINs from invoice images and text
 * Supports:
 * - Image-based barcode detection (Code128, EAN-13, UPC-A, etc.)
 * - Text-based barcode extraction (OCR patterns)
 * - GTIN validation and formatting
 */

export interface ExtractedBarcode {
  code: string;
  type: "gtin" | "barcode" | "sku" | "unknown";
  format: "EAN-13" | "UPC-A" | "Code128" | "Code39" | "text" | "unknown";
  confidence: number;
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  lineItemIndex?: number; // Which line item this barcode belongs to
}

/**
 * Extract barcodes from invoice image
 * Uses browser-based barcode detection libraries
 */
export async function extractBarcodesFromImage(
  imageFile: File | Blob,
): Promise<ExtractedBarcode[]> {
  const barcodes: ExtractedBarcode[] = [];

  try {
    // In production, use a barcode detection library like:
    // - @zxing/library (JavaScript)
    // - quaggaJS
    // - jsQR (for QR codes)

    // For now, return empty array (would need actual implementation)
    // Example implementation would be:
    //
    // const imageUrl = URL.createObjectURL(imageFile);
    // const image = await loadImage(imageUrl);
    // const codeReader = new BrowserMultiFormatReader();
    // const results = await codeReader.decodeFromImageElement(image);
    //
    // for (const result of results) {
    //   const code = result.getText();
    //   const format = result.getBarcodeFormat();
    //   if (isValidGTIN(code) || isValidBarcode(code)) {
    //     barcodes.push({
    //       code,
    //       type: isValidGTIN(code) ? 'gtin' : 'barcode',
    //       format: mapFormat(format),
    //       confidence: 0.95,
    //     });
    //   }
    // }

    console.log(
      `[BarcodeExtractor] Extracted ${barcodes.length} barcodes from image`,
    );
    return barcodes;
  } catch (error) {
    console.error(
      "[BarcodeExtractor] Error extracting barcodes from image:",
      error,
    );
    return [];
  }
}

/**
 * Extract barcodes from invoice text (OCR result)
 * Looks for barcode patterns in the text
 */
export function extractBarcodesFromText(text: string): ExtractedBarcode[] {
  const barcodes: ExtractedBarcode[] = [];

  // Pattern for GTIN-13 (EAN-13): 13 digits
  const gtin13Pattern = /\b(\d{13})\b/g;
  // Pattern for GTIN-12 (UPC-A): 12 digits
  const gtin12Pattern = /\b(\d{12})\b/g;
  // Pattern for GTIN-8 (EAN-8): 8 digits
  const gtin8Pattern = /\b(\d{8})\b/g;
  // Pattern for GTIN-14: 14 digits
  const gtin14Pattern = /\b(\d{14})\b/g;
  // Pattern for Code128: alphanumeric, often in parentheses or brackets
  const code128Pattern = /[\[\(]?([A-Z0-9]{8,20})[\]\)]?/g;
  // Pattern for SKU: often alphanumeric with dashes
  const skuPattern = /\b([A-Z0-9]{3,}-[A-Z0-9]{3,})\b/gi;

  // Extract GTIN-13
  let match;
  while ((match = gtin13Pattern.exec(text)) !== null) {
    const code = match[1];
    if (isValidGTIN(code)) {
      barcodes.push({
        code,
        type: "gtin",
        format: "EAN-13",
        confidence: 0.9,
      });
    }
  }

  // Extract GTIN-12 (UPC-A)
  while ((match = gtin12Pattern.exec(text)) !== null) {
    const code = match[1];
    if (isValidGTIN(code)) {
      barcodes.push({
        code,
        type: "gtin",
        format: "UPC-A",
        confidence: 0.9,
      });
    }
  }

  // Extract GTIN-8
  while ((match = gtin8Pattern.exec(text)) !== null) {
    const code = match[1];
    if (isValidGTIN(code)) {
      barcodes.push({
        code,
        type: "gtin",
        format: "EAN-8",
        confidence: 0.85,
      });
    }
  }

  // Extract GTIN-14
  while ((match = gtin14Pattern.exec(text)) !== null) {
    const code = match[1];
    if (isValidGTIN(code)) {
      barcodes.push({
        code,
        type: "gtin",
        format: "GTIN-14",
        confidence: 0.9,
      });
    }
  }

  // Extract Code128 patterns
  while ((match = code128Pattern.exec(text)) !== null) {
    const code = match[1];
    if (code.length >= 8 && code.length <= 20) {
      barcodes.push({
        code,
        type: "barcode",
        format: "Code128",
        confidence: 0.7,
      });
    }
  }

  // Extract SKU patterns
  while ((match = skuPattern.exec(text)) !== null) {
    const code = match[1];
    barcodes.push({
      code,
      type: "sku",
      format: "text",
      confidence: 0.6,
    });
  }

  // Remove duplicates
  const unique = new Map<string, ExtractedBarcode>();
  for (const barcode of barcodes) {
    const existing = unique.get(barcode.code);
    if (!existing || existing.confidence < barcode.confidence) {
      unique.set(barcode.code, barcode);
    }
  }

  console.log(
    `[BarcodeExtractor] Extracted ${unique.size} unique barcodes from text`,
  );
  return Array.from(unique.values());
}

/**
 * Match barcodes to invoice line items
 * Attempts to associate barcodes with specific line items based on proximity
 */
export function matchBarcodesToLineItems(
  barcodes: ExtractedBarcode[],
  lineItems: Array<{ productName: string; lineNumber: number }>,
  text: string,
): Map<number, ExtractedBarcode[]> {
  const matches = new Map<number, ExtractedBarcode[]>();
  const lines = text.split(/\r?\n/);

  for (const barcode of barcodes) {
    // Find line containing barcode
    const barcodeLineIndex = lines.findIndex((line) =>
      line.includes(barcode.code),
    );
    if (barcodeLineIndex === -1) continue;

    // Find nearest line item (within 5 lines)
    let bestMatch: {
      lineItem: (typeof lineItems)[0];
      distance: number;
    } | null = null;

    for (const item of lineItems) {
      const itemLineIndex = lines.findIndex((line, idx) => {
        const normalized = line.toLowerCase();
        return (
          normalized.includes(item.productName.toLowerCase()) &&
          idx <= barcodeLineIndex + 5
        );
      });

      if (itemLineIndex !== -1) {
        const distance = Math.abs(itemLineIndex - barcodeLineIndex);
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = { lineItem: item, distance };
        }
      }
    }

    if (bestMatch && bestMatch.distance <= 5) {
      const existing = matches.get(bestMatch.lineItem.lineNumber) || [];
      existing.push(barcode);
      matches.set(bestMatch.lineItem.lineNumber, existing);
    }
  }

  return matches;
}

/**
 * Validate GTIN using check digit algorithm
 */
export function isValidGTIN(code: string): boolean {
  if (!/^\d{8,14}$/.test(code)) {
    return false;
  }

  // Pad to 14 digits for calculation
  const padded = code.padStart(14, "0");
  const digits = padded.split("").map(Number);

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === digits[13];
}

/**
 * Normalize GTIN to standard format
 */
export function normalizeGTIN(code: string): string | null {
  // Remove non-digits
  const digits = code.replace(/\D/g, "");

  // Must be 8, 12, 13, or 14 digits
  if (!/^\d{8,14}$/.test(digits)) {
    return null;
  }

  // Validate check digit
  if (!isValidGTIN(digits)) {
    return null;
  }

  return digits;
}

/**
 * Determine GTIN type from code
 */
export function getGTINType(
  code: string,
): "GTIN-8" | "GTIN-12" | "GTIN-13" | "GTIN-14" | null {
  const normalized = normalizeGTIN(code);
  if (!normalized) return null;

  const length = normalized.length;
  if (length === 8) return "GTIN-8";
  if (length === 12) return "GTIN-12";
  if (length === 13) return "GTIN-13";
  if (length === 14) return "GTIN-14";
  return null;
}
