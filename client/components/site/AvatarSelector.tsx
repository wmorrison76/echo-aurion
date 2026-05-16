import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/glass";

interface AvatarSelectorProps {
  selectedAvatar: string;
  onAvatarSelect: (avatarId: string) => void;
}

const AVATARS = [
  {
    id: "Echo_B",
    name: "Bold",
    url: "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F39958189ec2246e4be04ec1175c785ab?format=webp&width=800",
  },
  {
    id: "Echo_F",
    name: "Fresh",
    url: "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2Fcb864730c3ee4d1e958b4fab1ed482c8?format=webp&width=800",
  },
  {
    id: "Echo_M",
    name: "Modern",
    url: "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2Ff3fc2b0a09db4996942ac5450acf92b0?format=webp&width=800",
  },
  {
    id: "Echo_R",
    name: "Radiant",
    url: "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2Ff3ac2b1108c24085972e35e79ae182a5?format=webp&width=800",
  },
];

export default function AvatarSelector({
  selectedAvatar,
  onAvatarSelect,
}: AvatarSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Load custom avatar on mount
  useEffect(() => {
    const stored = localStorage.getItem("user-avatar");
    if (stored && stored.startsWith("data:image/")) {
      setCustomAvatarUrl(stored);
    } else if (stored && stored.startsWith("avatar-")) {
      setCustomAvatarUrl(`/api/avatar/file/${stored}`);
    }
  }, []);

  const handleAvatarSelect = (avatarId: string) => {
    onAvatarSelect(avatarId);
    localStorage.setItem("user-avatar", avatarId);
    window.dispatchEvent(new Event("avatar-changed"));
    setCustomAvatarUrl(null);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const startCamera = async () => {
    setUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });
      setCameraStream(stream);
      setShowCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video starts playing
        videoRef.current.play().catch((err) => {
          console.error("Error playing video:", err);
        });
      }
    } catch (error) {
      setUploadError(
        "Camera access denied. Please enable camera permissions in your browser settings."
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    try {
      const video = videoRef.current;
      
      // Ensure video has loaded
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setUploadError("Camera not ready. Please wait a moment and try again.");
        return;
      }

      // Calculate dimensions to center face (crop to portrait aspect ratio)
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const targetAspect = 1; // Square for avatar
      
      let drawWidth = videoHeight * targetAspect;
      let drawHeight = videoHeight;
      let drawX = (videoWidth - drawWidth) / 2;
      let drawY = 0;

      // Set canvas to smaller size but capture full video
      canvasRef.current.width = 512;
      canvasRef.current.height = 512;

      // Scale the video to fit canvas properly (center crop)
      const scale = 512 / videoHeight;
      context.drawImage(
        video,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
        0,
        0,
        512,
        512
      );

      // Convert to blob and upload
      canvasRef.current.toBlob(
        (blob) => {
          if (blob) {
            handleUploadAvatar(blob, "camera-capture.jpg");
            stopCamera();
          }
        },
        "image/jpeg",
        0.95
      );
    } catch (error) {
      setUploadError("Failed to capture photo. Please try again.");
      console.error("Capture error:", error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadAvatar(file, file.name);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadAvatar = async (file: Blob, filename: string) => {
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = reader.result as string;

        try {
          // Get org ID from localStorage or use default
          const orgId = localStorage.getItem("org-id") || "default-org";

          const response = await fetch("/api/avatar/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Org-ID": orgId,
            },
            body: JSON.stringify({
              file: base64String,
              filename: filename,
            }),
          });

          // Check for network/fetch errors
          if (!response) {
            setUploadError("Upload failed. No response from server.");
            setUploading(false);
            return;
          }

          let data: any;

          // Try to parse response
          try {
            const contentType = response.headers.get("content-type");

            // Read response body once
            if (contentType && contentType.includes("application/json")) {
              data = await response.json();
            } else {
              // Read as text and try to parse as JSON
              const text = await response.text();
              try {
                data = JSON.parse(text);
              } catch {
                // If not valid JSON, wrap the text in an error object
                data = { error: text || "Invalid response format" };
              }
            }
          } catch (parseError) {
            console.error("Failed to parse response:", parseError);
            // Try to get any available info
            try {
              data = { error: "Upload failed. Could not process server response." };
            } catch {
              data = { error: "Upload failed. Could not process server response." };
            }
            setUploadError(data.error);
            setUploading(false);
            return;
          }

          if (!response.ok) {
            setUploadError(
              data?.error ||
                "Upload failed. " +
                  (data?.details
                    ? `The image may not be appropriate: ${data.details}`
                    : "")
            );
            setUploading(false);
            return;
          }

          // Store the avatar ID
          localStorage.setItem("user-avatar", data.avatarId);

          // Store base64 for immediate display
          const base64Data = data.base64;
          setCustomAvatarUrl(`data:${data.mimeType};base64,${base64Data}`);

          // Update selected avatar
          onAvatarSelect(data.avatarId);

          // Dispatch event for instant UI updates
          window.dispatchEvent(new Event("avatar-changed"));

          setUploadSuccess(true);
          setUploading(false);

          // Clear success message after 3 seconds
          setTimeout(() => {
            setUploadSuccess(false);
          }, 3000);
        } catch (error) {
          setUploadError(
            error instanceof Error
              ? error.message
              : "Upload failed. Please try again."
          );
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "File processing failed. Please try again."
      );
      setUploading(false);
    }
  };

  const isCustomAvatarSelected =
    customAvatarUrl &&
    (selectedAvatar === "custom" || selectedAvatar.startsWith("avatar-"));

  return (
    <div className="p-6 bg-background/60 rounded-lg border border-border/30 space-y-6">
      <div className="text-center mb-4">
        <p className="text-sm font-medium text-foreground">William Morrison</p>
        <p className="text-xs text-foreground/60">Admin User</p>
      </div>

      {/* Error message */}
      {uploadError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
          <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>
        </div>
      )}

      {/* Success message */}
      {uploadSuccess && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
          <p className="text-xs text-green-600 dark:text-green-400">
            Avatar updated successfully!
          </p>
        </div>
      )}

      {/* Current custom avatar preview */}
      {isCustomAvatarSelected && customAvatarUrl && (
        <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <img
            src={customAvatarUrl}
            alt="Your custom avatar"
            className="w-20 h-20 rounded-full object-cover border border-primary/30"
          />
          <p className="text-xs font-medium text-foreground">Custom Avatar</p>
          <button
            onClick={() => {
              setCustomAvatarUrl(null);
              handleAvatarSelect("Echo_B");
            }}
            className="text-xs text-primary hover:text-primary/80 underline"
          >
            Clear custom avatar
          </button>
        </div>
      )}

      {/* Predefined avatars - single row */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
          Select Avatar
        </p>
        <div className="flex gap-2 justify-start overflow-x-auto pb-2">
          {AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleAvatarSelect(avatar.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 flex-shrink-0",
                selectedAvatar === avatar.id && !isCustomAvatarSelected
                  ? "border-primary bg-primary/10"
                  : "border-border/30 bg-background/40 hover:border-primary/50 hover:bg-background/60"
              )}
            >
              <div className="w-20 h-20 rounded-full overflow-hidden border border-border/30 bg-background flex-shrink-0">
                <img
                  src={avatar.url}
                  alt={avatar.name}
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <span className="text-xs font-medium text-foreground text-center whitespace-nowrap">
                {avatar.name}
              </span>
              {selectedAvatar === avatar.id && !isCustomAvatarSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Camera and Upload Controls */}
      <div className="space-y-3 pt-4 border-t border-border/20">
        <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
          Use Your Own Photo
        </p>

        {showCamera ? (
          <div className="space-y-3">
            <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-square">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-4 border-primary/40 rounded-full" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={capturePhoto}
                disabled={uploading}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                </svg>
                {uploading ? "Processing..." : "Capture"}
              </button>

              <button
                onClick={stopCamera}
                disabled={uploading}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-background border border-border/30 text-foreground rounded-md hover:bg-background/80 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={startCamera}
              disabled={uploading}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-background border border-border/30 text-foreground rounded-md hover:bg-background/80 hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Camera
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-background border border-border/30 text-foreground rounded-md hover:bg-background/80 hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Upload
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <p className="text-xs text-foreground/50">
          Max 5MB. Appropriate for work environment.
        </p>
      </div>

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
