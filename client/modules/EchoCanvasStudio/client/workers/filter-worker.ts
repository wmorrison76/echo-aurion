/**
 * Filter Worker
 * Handles heavy image processing operations on a background thread
 * Receives filter requests, processes them, and sends back results with progress updates
 */

import { clamp, iteratePixels, getPixel, setPixel, createGaussianKernel, convolve } from '../lib/pixel-utils';

// Message handler for incoming filter requests
self.onmessage = async (event: MessageEvent) => {
  const { id, type, data, workerIndex } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'gaussian-blur':
        result = applyGaussianBlur(data.imageData, data.radius, (progress) => {
          sendProgress(id, progress);
        });
        break;

      case 'brightness-contrast':
        result = applyBrightnessContrast(
          data.imageData,
          data.brightness,
          data.contrast
        );
        break;

      case 'hue-saturation':
        result = applyHueSaturation(
          data.imageData,
          data.hue,
          data.saturation,
          data.lightness
        );
        break;

      case 'levels':
        result = applyLevels(
          data.imageData,
          data.inputBlack,
          data.inputWhite,
          data.outputBlack,
          data.outputWhite
        );
        break;

      case 'curves':
        result = applyCurves(data.imageData, data.curve);
        break;

      case 'bilateral-filter':
        result = applyBilateralFilter(
          data.imageData,
          data.spatialRadius,
          data.colorRadius,
          (progress) => {
            sendProgress(id, progress);
          }
        );
        break;

      case 'sharpen':
        result = applySharpen(data.imageData, data.amount);
        break;

      case 'blur':
        result = applyBlur(data.imageData, data.radius);
        break;

      case 'grayscale':
        result = applyGrayscale(data.imageData);
        break;

      case 'sepia':
        result = applySepia(data.imageData);
        break;

      case 'invert':
        result = applyInvert(data.imageData);
        break;

      default:
        throw new Error(`Unknown filter type: ${type}`);
    }

    // Send completed result
    sendComplete(id, result);
  } catch (error) {
    sendError(id, error instanceof Error ? error.message : String(error));
  }
};

/**
 * Send progress update to main thread
 */
function sendProgress(taskId: string, progress: number): void {
  self.postMessage({
    id: taskId,
    type: 'progress',
    progress: Math.round(Math.min(100, Math.max(0, progress))),
  });
}

/**
 * Send completion message to main thread
 */
function sendComplete(taskId: string, result: any): void {
  self.postMessage({
    id: taskId,
    type: 'complete',
    result,
  });
}

/**
 * Send error message to main thread
 */
function sendError(taskId: string, error: string): void {
  self.postMessage({
    id: taskId,
    type: 'complete',
    error,
  });
}

/**
 * Apply Gaussian blur using separable convolution
 */
function applyGaussianBlur(
  imageData: ImageData,
  radius: number,
  onProgress?: (progress: number) => void
): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const kernel = createGaussianKernel(radius);
  const r = Math.floor(kernel.length / 2);

  // Horizontal pass
  for (let y = 0; y < imageData.height; y++) {
    for (let x = r; x < imageData.width - r; x++) {
      let r_ = 0, g = 0, b = 0, a = 0;

      for (let kx = 0; kx < kernel[0].length; kx++) {
        const weight = kernel[0][kx];
        const [pr, pg, pb, pa] = getPixel(imageData, x + kx - r, y);
        r_ += pr * weight;
        g += pg * weight;
        b += pb * weight;
        a += pa * weight;
      }

      setPixel(output, x, y, r_, g, b, a);
    }
    if (onProgress && y % 10 === 0) {
      onProgress((y / imageData.height) * 50);
    }
  }

  // Vertical pass
  for (let x = 0; x < imageData.width; x++) {
    for (let y = r; y < imageData.height - r; y++) {
      let r_ = 0, g = 0, b = 0, a = 0;

      for (let ky = 0; ky < kernel.length; ky++) {
        const weight = kernel[ky][0];
        const [pr, pg, pb, pa] = getPixel(output, x, y + ky - r);
        r_ += pr * weight;
        g += pg * weight;
        b += pb * weight;
        a += pa * weight;
      }

      setPixel(output, x, y, r_, g, b, a);
    }
    if (onProgress && x % 10 === 0) {
      onProgress(50 + (x / imageData.width) * 50);
    }
  }

  return output;
}

/**
 * Apply brightness and contrast
 */
function applyBrightnessContrast(
  imageData: ImageData,
  brightness: number,
  contrast: number
): ImageData {
  return iteratePixels(imageData, (r, g, b, a) => {
    // Apply contrast first
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    let r_ = factor * (r - 128) + 128;
    let g_ = factor * (g - 128) + 128;
    let b_ = factor * (b - 128) + 128;

    // Then brightness
    r_ += brightness;
    g_ += brightness;
    b_ += brightness;

    return [r_, g_, b_, a];
  });
}

/**
 * Apply hue, saturation, and lightness adjustment
 */
function applyHueSaturation(
  imageData: ImageData,
  hue: number,
  saturation: number,
  lightness: number
): ImageData {
  return iteratePixels(imageData, (r, g, b, a) => {
    // RGB to HSL
    const [h, s, l] = rgbToHsl(r, g, b);

    // Apply adjustments
    let newH = (h + hue) % 360;
    if (newH < 0) newH += 360;
    let newS = clamp(s + saturation, 0, 100);
    let newL = clamp(l + lightness, 0, 100);

    // HSL to RGB
    const [newR, newG, newB] = hslToRgb(newH, newS, newL);

    return [newR, newG, newB, a];
  });
}

/**
 * Apply levels adjustment
 */
function applyLevels(
  imageData: ImageData,
  inputBlack: number,
  inputWhite: number,
  outputBlack: number,
  outputWhite: number
): ImageData {
  return iteratePixels(imageData, (r, g, b, a) => {
    const range = inputWhite - inputBlack;
    const r_ = ((r - inputBlack) / range) * (outputWhite - outputBlack) + outputBlack;
    const g_ = ((g - inputBlack) / range) * (outputWhite - outputBlack) + outputBlack;
    const b_ = ((b - inputBlack) / range) * (outputWhite - outputBlack) + outputBlack;

    return [r_, g_, b_, a];
  });
}

/**
 * Apply curve adjustment
 */
function applyCurves(
  imageData: ImageData,
  curve: Array<[number, number]>
): ImageData {
  // Build LUT from curve points
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let y = i;

    // Find surrounding points
    for (let j = 0; j < curve.length - 1; j++) {
      const [x1, y1] = curve[j];
      const [x2, y2] = curve[j + 1];

      if (i >= x1 && i <= x2) {
        // Linear interpolation
        const t = (i - x1) / (x2 - x1);
        y = y1 + t * (y2 - y1);
        break;
      }
    }

    lut[i] = clamp(y);
  }

  // Apply LUT to image
  return iteratePixels(imageData, (r, g, b, a) => {
    return [lut[r], lut[g], lut[b], a];
  });
}

/**
 * Apply bilateral filter (preserves edges while blurring)
 */
function applyBilateralFilter(
  imageData: ImageData,
  spatialRadius: number,
  colorRadius: number,
  onProgress?: (progress: number) => void
): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const r = Math.floor(spatialRadius);

  for (let y = r; y < imageData.height - r; y++) {
    for (let x = r; x < imageData.width - r; x++) {
      const [centerR, centerG, centerB, centerA] = getPixel(imageData, x, y);

      let sumR = 0, sumG = 0, sumB = 0, weight = 0;

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const [pr, pg, pb, pa] = getPixel(imageData, x + dx, y + dy);

          // Spatial weight (Gaussian)
          const spatialDist = Math.sqrt(dx * dx + dy * dy);
          const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * spatialRadius * spatialRadius));

          // Color weight (Gaussian)
          const colorDist = Math.sqrt(
            (pr - centerR) ** 2 + (pg - centerG) ** 2 + (pb - centerB) ** 2
          );
          const colorWeight = Math.exp(-(colorDist * colorDist) / (2 * colorRadius * colorRadius));

          const w = spatialWeight * colorWeight;
          sumR += pr * w;
          sumG += pg * w;
          sumB += pb * w;
          weight += w;
        }
      }

      setPixel(output, x, y, sumR / weight, sumG / weight, sumB / weight, centerA);
    }

    if (onProgress && y % 10 === 0) {
      onProgress((y / imageData.height) * 100);
    }
  }

  return output;
}

/**
 * Apply sharpen filter
 */
function applySharpen(imageData: ImageData, amount: number): ImageData {
  const kernel = [
    [0, -1, 0],
    [-1, 4 + amount, -1],
    [0, -1, 0],
  ];

  return convolve(imageData, kernel);
}

/**
 * Apply simple blur
 */
function applyBlur(imageData: ImageData, radius: number): ImageData {
  const kernel = createGaussianKernel(radius);
  return convolve(imageData, kernel);
}

/**
 * Apply grayscale
 */
function applyGrayscale(imageData: ImageData): ImageData {
  return iteratePixels(imageData, (r, g, b, a) => {
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    return [gray, gray, gray, a];
  });
}

/**
 * Apply sepia tone
 */
function applySepia(imageData: ImageData): ImageData {
  return iteratePixels(imageData, (r, g, b, a) => {
    const r_ = r * 0.393 + g * 0.769 + b * 0.189;
    const g_ = r * 0.349 + g * 0.686 + b * 0.168;
    const b_ = r * 0.272 + g * 0.534 + b * 0.131;

    return [r_, g_, b_, a];
  });
}

/**
 * Apply invert
 */
function applyInvert(imageData: ImageData): ImageData {
  return iteratePixels(imageData, (r, g, b, a) => {
    return [255 - r, 255 - g, 255 - b, a];
  });
}

/**
 * Convert RGB to HSL (helper)
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

/**
 * Convert HSL to RGB (helper)
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}
