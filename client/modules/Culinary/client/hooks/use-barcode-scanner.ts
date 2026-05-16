import { useEffect, useRef, useCallback, useState } from "react";

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Hook to handle barcode scanning on tablet devices
 * Listens for rapid keyboard input (typical barcode scanner behavior)
 * or integrates with camera-based barcode detection libraries
 */
export function useBarcodeScanner({
  onScan,
  onError,
  enabled = true,
  debounceMs = 50,
}: BarcodeScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const barcodeBufferRef = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle keyboard input (simulates barcode scanner)
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only capture printable characters and Enter key
      if (!event.key || (event.key.length > 1 && event.key !== "Enter")) {
        return;
      }

      // Ignore if modifier keys are pressed (Ctrl, Alt, Cmd)
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      event.preventDefault();

      if (event.key === "Enter") {
        // End of barcode
        const barcode = barcodeBufferRef.current.trim();
        if (barcode) {
          setIsScanning(false);
          setLastScanTime(Date.now());
          onScan(barcode);
        }
        barcodeBufferRef.current = "";
      } else {
        // Accumulate barcode characters
        if (!isScanning) {
          setIsScanning(true);
        }
        barcodeBufferRef.current += event.key;

        // Clear buffer if no new input for debounceMs
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          if (barcodeBufferRef.current) {
            const barcode = barcodeBufferRef.current.trim();
            setIsScanning(false);
            setLastScanTime(Date.now());
            if (barcode.length >= 8) {
              // Typical barcode length
              onScan(barcode);
            }
            barcodeBufferRef.current = "";
          }
        }, debounceMs);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, onScan, debounceMs]);

  // Reset scanning state after scan
  useEffect(() => {
    if (isScanning) {
      const timer = setTimeout(() => {
        setIsScanning(false);
        barcodeBufferRef.current = "";
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isScanning]);

  return {
    isScanning,
    lastScanTime,
    currentBuffer: barcodeBufferRef.current,
  };
}

/**
 * Hook to integrate camera-based barcode detection
 * Requires: https://github.com/mebius6/quagga2 or jsQR
 * Usage: const { startCamera, stopCamera, detected } = useCameraBarcode({ onDetect })
 */
export function useCameraBarcode({
  onDetect,
  enabled = false,
}: {
  onDetect: (barcode: string) => void;
  enabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "error">("idle");
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setStatus("scanning");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error("Camera access failed:", error);
      setStatus("error");
      onDetect("camera-error");
    }
  }, [onDetect]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStatus("idle");
  }, []);

  return {
    videoRef,
    status,
    startCamera,
    stopCamera,
  };
}

/**
 * Parse barcode to extract useful information
 * Supports: EAN-13, Code128, and generic format
 */
export function parseBarcodeFormat(barcode: string): {
  type: "ean13" | "code128" | "unknown";
  value: string;
  checksum?: string;
} {
  const cleaned = barcode.replace(/\s/g, "");

  // EAN-13: 13 digits
  if (/^\d{13}$/.test(cleaned)) {
    return {
      type: "ean13",
      value: cleaned.substring(0, 12),
      checksum: cleaned[12],
    };
  }

  // Code128: various formats
  if (/^[A-Z0-9\-_]{8,}$/.test(cleaned)) {
    return {
      type: "code128",
      value: cleaned,
    };
  }

  return {
    type: "unknown",
    value: cleaned,
  };
}
