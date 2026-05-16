/**
 * Pixel-level processing utilities
 * Used by FilterEngine, AdjustmentLayerEngine, and other image processing modules
 */

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number = 0, max: number = 255): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Iterate over pixels in ImageData and apply a callback function
 * Modifies the ImageData in place
 */
export function iteratePixels(
  imageData: ImageData,
  callback: (
    r: number,
    g: number,
    b: number,
    a: number,
    index: number
  ) => [number, number, number, number]
): ImageData {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = callback(data[i], data[i + 1], data[i + 2], data[i + 3], i);
    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
    data[i + 3] = clamp(a);
  }
  return imageData;
}

/**
 * Get pixel value at coordinates (with bounds checking)
 */
export function getPixel(
  imageData: ImageData,
  x: number,
  y: number
): [number, number, number, number] {
  const idx = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
  if (idx < 0 || idx + 3 >= imageData.data.length) {
    return [0, 0, 0, 0];
  }
  return [
    imageData.data[idx],
    imageData.data[idx + 1],
    imageData.data[idx + 2],
    imageData.data[idx + 3],
  ];
}

/**
 * Set pixel value at coordinates (with bounds checking)
 */
export function setPixel(
  imageData: ImageData,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number
): void {
  const idx = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
  if (idx >= 0 && idx + 3 < imageData.data.length) {
    imageData.data[idx] = clamp(r);
    imageData.data[idx + 1] = clamp(g);
    imageData.data[idx + 2] = clamp(b);
    imageData.data[idx + 3] = clamp(a);
  }
}

/**
 * Get bilinear interpolated pixel value (for smooth sampling)
 */
export function getPixelBilinear(
  imageData: ImageData,
  x: number,
  y: number
): [number, number, number, number] {
  const x1 = Math.floor(x);
  const x2 = Math.min(x1 + 1, imageData.width - 1);
  const y1 = Math.floor(y);
  const y2 = Math.min(y1 + 1, imageData.height - 1);

  const fx = x - x1;
  const fy = y - y1;

  const p11 = getPixel(imageData, x1, y1);
  const p21 = getPixel(imageData, x2, y1);
  const p12 = getPixel(imageData, x1, y2);
  const p22 = getPixel(imageData, x2, y2);

  return [
    p11[0] * (1 - fx) * (1 - fy) +
      p21[0] * fx * (1 - fy) +
      p12[0] * (1 - fx) * fy +
      p22[0] * fx * fy,
    p11[1] * (1 - fx) * (1 - fy) +
      p21[1] * fx * (1 - fy) +
      p12[1] * (1 - fx) * fy +
      p22[1] * fx * fy,
    p11[2] * (1 - fx) * (1 - fy) +
      p21[2] * fx * (1 - fy) +
      p12[2] * (1 - fx) * fy +
      p22[2] * fx * fy,
    p11[3] * (1 - fx) * (1 - fy) +
      p21[3] * fx * (1 - fy) +
      p12[3] * (1 - fx) * fy +
      p22[3] * fx * fy,
  ];
}

/**
 * Simple box blur on a single pixel
 */
export function blurPixel(
  imageData: ImageData,
  x: number,
  y: number,
  radius: number
): [number, number, number, number] {
  let r = 0,
    g = 0,
    b = 0,
    a = 0,
    count = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const [pr, pg, pb, pa] = getPixel(imageData, x + dx, y + dy);
      r += pr;
      g += pg;
      b += pb;
      a += pa;
      count++;
    }
  }

  return [r / count, g / count, b / count, a / count];
}

/**
 * Create a Gaussian kernel for convolution filters
 */
export function createGaussianKernel(radius: number): number[][] {
  const size = radius * 2 + 1;
  const kernel: number[][] = [];
  let sum = 0;

  const sigma = radius / 3;

  for (let y = -radius; y <= radius; y++) {
    const row: number[] = [];
    for (let x = -radius; x <= radius; x++) {
      const value =
        Math.exp(-(x * x + y * y) / (2 * sigma * sigma)) /
        (2 * Math.PI * sigma * sigma);
      row.push(value);
      sum += value;
    }
    kernel.push(row);
  }

  // Normalize kernel
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum;
    }
  }

  return kernel;
}

/**
 * Apply convolution filter to image data
 */
export function convolve(
  imageData: ImageData,
  kernel: number[][],
  offset: number = 0
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const radius = Math.floor(kernel.length / 2);

  for (let y = radius; y < imageData.height - radius; y++) {
    for (let x = radius; x < imageData.width - radius; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;

      for (let ky = 0; ky < kernel.length; ky++) {
        for (let kx = 0; kx < kernel[ky].length; kx++) {
          const weight = kernel[ky][kx];
          const [pr, pg, pb, pa] = getPixel(
            imageData,
            x + kx - radius,
            y + ky - radius
          );
          r += pr * weight;
          g += pg * weight;
          b += pb * weight;
          a += pa * weight;
        }
      }

      setPixel(result, x, y, r + offset, g + offset, b + offset, a);
    }
  }

  return result;
}
