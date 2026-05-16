import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeScanner({ onBarcodeScanned, isOpen, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [buffer, setBuffer] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Check for camera access
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const hasCameraDevice = devices.some((device) => device.kind === "videoinput");
        setHasCamera(hasCameraDevice);
        if (hasCameraDevice && !manualEntry) {
          startCamera();
        }
      })
      .catch((err) => {
        console.error("Error checking camera:", err);
        setHasCamera(false);
        setManualEntry(true);
      });
    return () => {
      stopCamera();
    };
  }, [isOpen, manualEntry]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.error("Error playing video:", err);
          setError("Unable to play camera stream");
        });
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Camera access denied. Use manual entry.");
      setManualEntry(true);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (buffer.trim()) {
          onBarcodeScanned(buffer.trim());
          setBuffer("");
          setError(null);
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }
      }
    },
    [buffer, onBarcodeScanned]
  );

  const handleManualEntry = useCallback(() => {
    if (buffer.trim()) {
      onBarcodeScanned(buffer.trim());
      setBuffer("");
      setError(null);
    }
  }, [buffer, onBarcodeScanned]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-card backdrop-blur-sm">
      <Card className="w-full max-w-md border-cyan-400/30 bg-card text-cyan-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Barcode Scanner</CardTitle>
            <CardDescription className="text-cyan-200/70">
              {manualEntry ? "Enter barcode manually" : "Point camera at barcode"}
            </CardDescription>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-red-400/40 px-2 py-1 text-red-200 transition hover:border-red-200/70"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-400/40 bg-red-500/10 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {hasCamera && !manualEntry && (
            <div className="relative bg-surface rounded-lg overflow-hidden aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline />
              <div className="absolute inset-0 border-2 border-cyan-400/50 pointer-events-none" />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
              Barcode Value
            </label>
            <Input
              ref={inputRef}
              type="text"
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Scan barcode or type manually..."
              className="border-cyan-400/20 bg-card text-cyan-100"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleManualEntry} className="flex-1" disabled={!buffer.trim()}>
              Confirm Barcode
            </Button>
            {hasCamera && (
              <Button
                onClick={() => setManualEntry(!manualEntry)}
                variant="outline"
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                {manualEntry ? "Use Camera" : "Manual Entry"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
