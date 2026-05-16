/** * Invoice"Face" Recognition System * Detects document type (invoice vs credit memo) through: * - Color analysis (HSV color space) * - Orientation detection (portrait vs landscape) * - Document type classification * Creates unique fingerprints for template matching */ export interface InvoiceFaceSignature {
  primaryColorHsv: ColorHSV;
  colorPalette: string[];
  orientation: "portrait" | "landscape" | "mixed";
  documentType: "invoice" | "credit_memo" | "debit_memo" | "statement";
  fingerprint: string;
  confidence: number;
  colorConfidence: number;
  orientationConfidence: number;
}
export interface ColorHSV {
  h: number; // 0-360 s: number; // 0-100 v: number; // 0-100
}
export interface FaceMatch {
  vendorName: string;
  documentType: string;
  orientation: string;
  matchConfidence: number;
  colorDistance: number;
  orientationMatch: boolean;
  fingerprintMatch: boolean;
} /** * Extract color signature from invoice image */
export async function extractInvoiceFace(
  imageSource: File | string | ArrayBuffer,
): Promise<InvoiceFaceSignature> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const img = new Image(); // Load image const imageUrl = await loadImageSource(imageSource); await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.crossOrigin ="anonymous"; img.src = imageUrl; }); // Set canvas to image dimensions canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; ctx.drawImage(img, 0, 0); // Extract color data const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); const pixels = imageData.data; // Detect orientation const orientation = canvas.width > canvas.height ?"landscape" :"portrait"; const orientationConfidence = Math.abs(canvas.width - canvas.height) / Math.max(canvas.width, canvas.height); // Sample colors from document (avoid edges which may be shadows) const sampleWidth = Math.floor(canvas.width * 0.8); const sampleHeight = Math.floor(canvas.height * 0.8); const startX = Math.floor(canvas.width * 0.1); const startY = Math.floor(canvas.height * 0.1); const colors: ColorHSV[] = []; const colorCounts = new Map<string, number>(); // Sample every 10th pixel to improve performance for (let y = startY; y < startY + sampleHeight; y += 10) { for (let x = startX; x < startX + sampleWidth; x += 10) { const idx = (y * canvas.width + x) * 4; const r = pixels[idx]; const g = pixels[idx + 1]; const b = pixels[idx + 2]; const hsv = rgbToHsv(r, g, b); colors.push(hsv); // Track color frequencies for palette const colorStr = hsvToString(hsv); colorCounts.set(colorStr, (colorCounts.get(colorStr) || 0) + 1); } } // Get primary color (most frequent) const sortedColors = Array.from(colorCounts.entries()) .sort((a, b) => b[1] - a[1]) .slice(0, 5) .map(([colorStr]) => colorStr); const primaryColorHsv = colors.length > 0 ? calculateAverageHsv(colors) : { h: 0, s: 0, v: 50 }; const colorConfidence = calculateColorConfidence(colors, primaryColorHsv); // Classify document type by color const documentType = classifyDocumentType(primaryColorHsv, sortedColors); // Generate fingerprint combining color, orientation, and document type const fingerprint = generateFingerprint( primaryColorHsv, orientation, documentType, ); return { primaryColorHsv, colorPalette: sortedColors, orientation, documentType, fingerprint, confidence: (colorConfidence + orientationConfidence) / 2, colorConfidence, orientationConfidence, };
} /** * Classify document type based on color signatures * Halperns: Yellow invoice (H: 40-60, S: 80+) = INVOICE, White (S: <20) = CREDIT * USFoods: Landscape = INVOICE, Portrait = often CREDIT * Sysco: Similar patterns to USFoods */
function classifyDocumentType(
  primaryColor: ColorHSV,
  palette: string[],
): string {
  const { h, s, v } = primaryColor; // White/light = credit memo (very low saturation or high value) if (s < 20 && v > 85) { return"credit_memo"; } // Yellow tones (H: 40-70, S: 50+) = invoice if (h >= 40 && h <= 70 && s > 50) { return"invoice"; } // Blue/gray tones = likely statement if ((h >= 200 && h <= 250) || (h <= 30 && v < 50)) { return"statement"; } // Pinkish/reddish = debit memo if (h >= 0 && h < 30 && s > 30) { return"debit_memo"; } // Default to invoice return"invoice";
} /** * Generate unique fingerprint for template matching */
function generateFingerprint(
  color: ColorHSV,
  orientation: string,
  documentType: string,
): string {
  // Quantize color to reduce variations const hBucket = Math.floor(color.h / 10); const sBucket = Math.floor(color.s / 20); const vBucket = Math.floor(color.v / 25); const oriPrefix = orientation[0].toUpperCase(); const docPrefix = documentType.substring(0, 3).toUpperCase(); return `${docPrefix}-${oriPrefix}-H${hBucket}-S${sBucket}-V${vBucket}`;
} /** * Calculate average HSV from multiple colors */
function calculateAverageHsv(colors: ColorHSV[]): ColorHSV {
  if (colors.length === 0) {
    return { h: 0, s: 0, v: 50 };
  } // For hue, use circular mean (account for wrapping at 360) let sinSum = 0, cosSum = 0; for (const color of colors) { const rad = (color.h * Math.PI) / 180; sinSum += Math.sin(rad); cosSum += Math.cos(rad); } const avgHue = (Math.atan2(sinSum / colors.length, cosSum / colors.length) * 180) / Math.PI; const avgSaturation = colors.reduce((sum, c) => sum + c.s, 0) / colors.length; const avgValue = colors.reduce((sum, c) => sum + c.v, 0) / colors.length; return { h: avgHue < 0 ? avgHue + 360 : avgHue, s: avgSaturation, v: avgValue, };
} /** * Calculate confidence score for primary color (how consistent are colors) */
function calculateColorConfidence(
  colors: ColorHSV[],
  avgColor: ColorHSV,
): number {
  if (colors.length === 0) return 0; // Calculate variance let totalDistance = 0; for (const color of colors) { const hDist = Math.min( Math.abs(color.h - avgColor.h), 360 - Math.abs(color.h - avgColor.h), ); const sDist = Math.abs(color.s - avgColor.s); const vDist = Math.abs(color.v - avgColor.v); const distance = Math.sqrt( (hDist / 180) ** 2 + (sDist / 100) ** 2 + (vDist / 100) ** 2, ); totalDistance += distance; } const avgDistance = totalDistance / colors.length; // Convert distance to confidence (lower distance = higher confidence) return Math.max(0, Math.min(100, 100 - avgDistance * 100)) / 100;
} /** * Convert RGB to HSV */
function rgbToHsv(r: number, g: number, b: number): ColorHSV {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
    if (h < 0) h += 360;
  }
  const s = max > 0 ? delta / max : 0;
  const v = max;
  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
} /** * Convert HSV to standardized string (for color palette deduplication) */
function hsvToString(hsv: ColorHSV): string {
  // Quantize to reduce palette size const h = Math.floor(hsv.h / 5) * 5; const s = Math.floor(hsv.s / 10) * 10; const v = Math.floor(hsv.v / 10) * 10; return `H${h}S${s}V${v}`;
} /** * Calculate color distance between two HSV colors * Returns 0-1 where 1 is identical */
export function colorDistance(color1: ColorHSV, color2: ColorHSV): number {
  const hDist =
    Math.min(
      Math.abs(color1.h - color2.h),
      360 - Math.abs(color1.h - color2.h),
    ) / 180;
  const sDist = Math.abs(color1.s - color2.s) / 100;
  const vDist = Math.abs(color1.v - color2.v) / 100;
  const euclideanDist = Math.sqrt(hDist ** 2 + sDist ** 2 + vDist ** 2);
  return Math.max(0, 1 - euclideanDist);
} /** * Load image from File, URL, or ArrayBuffer */
async function loadImageSource(
  source: File | string | ArrayBuffer,
): Promise<string> {
  if (source instanceof File) {
    return URL.createObjectURL(source);
  } else if (typeof source === "string") {
    return source;
  } else {
    const blob = new Blob([source], { type: "image/png" });
    return URL.createObjectURL(blob);
  }
} /** * Detect if orientation is mixed (multiple orientations found across batch) */
export function detectOrientationPattern(
  invoices: InvoiceFaceSignature[],
): string {
  if (invoices.length === 0) return "portrait";
  const orientations = invoices.map((inv) => inv.orientation);
  const portraitCount = orientations.filter((o) => o === "portrait").length;
  const landscapeCount = orientations.filter((o) => o === "landscape").length;
  if (portraitCount > 0 && landscapeCount > 0) {
    return "mixed";
  }
  return portraitCount > landscapeCount ? "portrait" : "landscape";
}
