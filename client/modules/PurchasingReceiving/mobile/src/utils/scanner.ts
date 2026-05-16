import { CameraView, useCameraPermissions } from "expo-camera";
import { BarCodeScannedCallback } from "expo-camera";
export interface BarCodeData {
  type: string;
  data: string;
  cornerPoints?: Array<{ x: number; y: number }>;
  bounds?: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
}
export const useScannerPermissions = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const isPermissionGranted = permission?.granted || false;
  return { isPermissionGranted, requestPermission, permission };
};
export const parseBarcodeData = (barcode: BarCodeData) => {
  const data = barcode.data.trim();
  if (barcode.type === "ean13" || barcode.type === "ean8") {
    return { type: "ean", value: data, format: barcode.type };
  }
  if (barcode.type === "code128" || barcode.type === "code39") {
    return { type: "code", value: data, format: barcode.type };
  }
  if (barcode.type === "qr") {
    try {
      return {
        type: "qr",
        value: data,
        isParsedUrl: data.startsWith("http"),
        parsedData: tryParseJSON(data),
      };
    } catch {
      return { type: "qr", value: data, isParsedUrl: false };
    }
  }
  return { type: barcode.type, value: data };
};
const tryParseJSON = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};
export const validateSKU = (sku: string): boolean => {
  const skuPattern = /^[A-Z0-9\-]+$/i;
  return skuPattern.test(sku) && sku.length >= 3;
};
export const formatSKUForDisplay = (sku: string): string => {
  return sku.toUpperCase().trim();
};
