import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import type { DesignData } from "./types";

interface DALLECakePreviewProps {
  design: DesignData;
  width?: number;
  height?: number;
}

export default function DALLECakePreview({
  design,
  width = 280,
  height = 350,
}: DALLECakePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const generateCakePrompt = (): string => {
    const tierCount = design.tiers?.length || 2;
    const shape = design.shape || "round";
    const frosting = design.frosting || "Buttercream";
    const color = design.color || "#d4a373";
    const fillings = design.fillings?.[0] || "Vanilla";

    const colorName = getColorName(color);
    const shapeAdjective =
      shape === "round"
        ? "perfectly round"
        : shape === "square"
          ? "elegant square"
          : "rectangular sheet";

    return `Professional high-quality product photograph of an exquisite ${tierCount}-tier ${shapeAdjective} wedding cake. 
    ${colorName} ${frosting} frosting with ${fillings} filling. 
    Beautifully decorated with delicate details, perfect lighting, white background, bakery professional photography style.
    The cake should look elegant, pristine, and ready to serve. 
    Ultra-detailed, photorealistic, professional pastry chef quality, studio lighting.`;
  };

  const getColorName = (hex: string): string => {
    const colorMap: { [key: string]: string } = {
      "#ffffff": "white",
      "#000000": "black",
      "#ff0000": "red",
      "#00ff00": "green",
      "#0000ff": "blue",
      "#ffff00": "yellow",
      "#ffa500": "orange",
      "#800080": "purple",
      "#ffc0cb": "pink",
      "#d4a373": "warm beige",
      "#8b4513": "chocolate brown",
      "#daa520": "golden",
      "#c41e3a": "crimson red",
    };

    return colorMap[hex.toLowerCase()] || "custom colored";
  };

  const generateImage = async () => {
    setIsLoading(true);
    setError("");

    try {
      const prompt = generateCakePrompt();

      console.log(
        "[DALLECakePreview] Generating image with prompt length:",
        prompt.length,
      );

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          size: "1024x1024",
          quality: "standard",
        }),
      });

      console.log("[DALLECakePreview] Response status:", response.status);

      if (!response.ok) {
        let errorMessage = `Server error: HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          console.log("[DALLECakePreview] Could not parse error response");
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("[DALLECakePreview] Response data:", {
        success: data.success,
        hasImageUrl: !!data.imageUrl,
      });

      if (data.success && data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error("No image URL returned from server");
      }
    } catch (err) {
      let errorMessage =
        err instanceof Error ? err.message : "Failed to generate cake image";

      // Provide more user-friendly error messages
      if (errorMessage.includes("billing_hard_limit_reached")) {
        errorMessage =
          "Image generation is currently unavailable due to API billing limits. Please contact your administrator.";
      } else if (errorMessage.includes("Billing hard limit")) {
        errorMessage =
          "Image generation is temporarily unavailable due to API billing limits. Please try again later.";
      }

      setError(errorMessage);
      console.error("[DALLECakePreview] Image generation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Auto-generate image when design changes
    generateImage();
  }, [design.tiers, design.frosting, design.color, design.fillings]);

  return (
    <Card style={{ width: width + 32 }}>
      <CardHeader>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <CardTitle className="text-lg">Preview</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={generateImage}
            disabled={isLoading}
            style={{ padding: "4px 8px" }}
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: width,
            height: height,
            backgroundColor: "#f5f5f5",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {isLoading && (
            <div style={{ textAlign: "center", color: "#666" }}>
              <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                Generating cake image...
              </div>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  border: "3px solid #e0e0e0",
                  borderTop: "3px solid #00f0ff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto",
                }}
              />
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {error && (
            <div
              style={{ textAlign: "center", color: "#d32f2f", padding: "16px" }}
            >
              <div style={{ fontSize: "12px", marginBottom: "8px" }}>
                Error generating image:
              </div>
              <div style={{ fontSize: "11px" }}>{error}</div>
              <Button
                size="sm"
                variant="outline"
                onClick={generateImage}
                style={{ marginTop: "8px" }}
              >
                Retry
              </Button>
            </div>
          )}

          {!isLoading && imageUrl && (
            <img
              src={imageUrl}
              alt="Cake preview"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          )}

          {!isLoading && !imageUrl && !error && (
            <Button onClick={generateImage}>Generate Preview</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
