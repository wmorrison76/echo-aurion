import React, { useState, useRef, useEffect } from "react";
import ResizableDraggablePanel from "./ResizableDraggablePanel";
import CakeDesignerMenuBar from "../cake-builder/CakeDesignerMenuBar";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Play,
  Pause,
} from "lucide-react";
import {
  estimateServings,
  getRecommendedTierSpecs,
  validateCakeSize,
  calculatePricing,
  type TierSpec,
} from "@/lib/cake-sizing-utils";

interface CakeBuilderPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
}

interface CakeDesign {
  guestCount: number;
  occasion: string;
  tiers: TierSpec[];
  shape: "round" | "square" | "sheet";
  flavors: string[];
  frostings: string[];
  fillings: string[];
  decorations: string[];
  themeNotes: string;
  designComplexity: "simple" | "moderate" | "intricate";
  generatedPrompt?: string;
  // Order details
  beoNumber?: string;
  countryCode?: string;
  contactPhone?: string;
  contactEmail?: string;
  deliveryAddress?: string;
  // Cake presentation
  pedestal?: "none" | "gold" | "silver" | "crystal" | "wood" | "acrylic";
  // Pricing
  basePrice?: number;
  decorationPrice?: number;
  pedestalPrice?: number;
  deliveryPrice?: number;
}

const CAKE_FLAVORS = [
  "Vanilla",
  "Chocolate",
  "Carrot",
  "Red Velvet",
  "Lemon",
  "Strawberry",
  "Cheesecake",
  "Tiramisu",
];

const FROSTINGS = [
  "Buttercream",
  "Cream Cheese",
  "Ganache",
  "Whipped Cream",
  "Fondant",
  "Royal Icing",
];

const FILLINGS = [
  "Buttercream",
  "Ganache",
  "Jam",
  "Mousse",
  "Custard",
  "Caramel",
];

export default function CakeBuilderPopup({
  isOpen,
  onClose,
  onMinimize,
}: CakeBuilderPopupProps) {
  const [step, setStep] = useState(0);
  const [design, setDesign] = useState<CakeDesign>({
    guestCount: 50,
    occasion: "",
    tiers: [
      { diameter: 10, height: 4 },
      { diameter: 8, height: 4 },
      { diameter: 6, height: 4 },
    ],
    shape: "round",
    flavors: ["Vanilla"],
    frostings: ["Buttercream"],
    fillings: ["Buttercream"],
    decorations: [],
    themeNotes: "",
    designComplexity: "moderate",
    beoNumber: "",
    countryCode: "+1",
    contactPhone: "",
    contactEmail: "",
    deliveryAddress: "",
    pedestal: "none",
    basePrice: 6,
    decorationPrice: 0,
    pedestalPrice: 0,
    deliveryPrice: 0,
  });

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layerOpacities, setLayerOpacities] = useState<number[]>([1, 1, 1]);
  const [imageRotation, setImageRotation] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [autoPrintCopies, setAutoPrintCopies] = useState(2);
  const [showPricing, setShowPricing] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate || !generatedImage || step !== 2) return;

    let rotation = 0;
    let direction = 1;

    const interval = setInterval(() => {
      rotation += direction * 2;
      if (rotation >= 45 || rotation <= -45) {
        direction *= -1;
      }
      setImageRotation(rotation);
    }, 50);

    rotationIntervalRef.current = interval;

    return () => {
      if (rotationIntervalRef.current)
        clearInterval(rotationIntervalRef.current);
    };
  }, [autoRotate, generatedImage, step]);

  if (!isOpen) return null;

  const handleDesignChange = <K extends keyof CakeDesign>(
    key: K,
    value: CakeDesign[K],
  ) => {
    setDesign((prev) => ({ ...prev, [key]: value }));
  };

  const handleGuestCountChange = (count: number) => {
    handleDesignChange("guestCount", count);
    const { tiers } = getRecommendedTierSpecs(count);
    handleDesignChange("tiers", tiers);
  };

  const handleTierHeightChange = (tierIndex: number, newHeight: number) => {
    const newTiers = [...design.tiers];
    newTiers[tierIndex] = { ...newTiers[tierIndex], height: newHeight };
    handleDesignChange("tiers", newTiers);
  };

  const validation = validateCakeSize(
    design.tiers,
    design.shape,
    design.guestCount,
  );

  const generateImage = async (useStoredPrompt?: boolean) => {
    let prompt: string;

    if (useStoredPrompt && design.generatedPrompt) {
      prompt = design.generatedPrompt;
    } else {
      const flavorList = design.flavors.join(", ");
      const frostingList = design.frostings.join(", ");
      const fillingsList = design.fillings.join(", ");

      prompt = `Create a beautiful ${design.tiers.length}-tier ${design.shape} wedding cake.
Flavors: ${flavorList}.
Frosting: ${frostingList}.
Fillings: ${fillingsList}.
Theme: ${design.themeNotes || design.occasion}.
Style: ${design.designComplexity}.
Decorations: ${design.decorations.length > 0 ? design.decorations.join(", ") : "elegant and refined"}.
Include transparent background, show cake structure clearly, professional bakery photography quality.`;

      // Store the prompt for future regeneration
      handleDesignChange("generatedPrompt", prompt);
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          size: "1024x1024",
          quality: "hd",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Generation failed: ${response.status}`,
        );
      }

      const data = await response.json();

      if (!data.success || !data.imageUrl) {
        throw new Error(data.error || "No image URL returned");
      }

      setGeneratedImage(data.imageUrl);
      setLayerOpacities(Array(design.tiers.length).fill(1));
      setImageRotation(0);
      setAutoRotate(true);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuAction = (action: string, data?: any) => {
    switch (action) {
      case "cake-toggle-pricing":
        setShowPricing(!showPricing);
        break;
      case "cake-new":
        setDesign({
          guestCount: 50,
          occasion: "",
          tiers: [
            { diameter: 10, height: 4 },
            { diameter: 8, height: 4 },
            { diameter: 6, height: 4 },
          ],
          shape: "round",
          flavors: ["Vanilla"],
          frostings: ["Buttercream"],
          fillings: ["Buttercream"],
          decorations: [],
          themeNotes: "",
          designComplexity: "moderate",
          beoNumber: "",
          countryCode: "+1",
          contactPhone: "",
          contactEmail: "",
          deliveryAddress: "",
          pedestal: "none",
          basePrice: 6,
          decorationPrice: 0,
          pedestalPrice: 0,
          deliveryPrice: 0,
        });
        setGeneratedImage(null);
        setStep(0);
        break;
      case "cake-save":
        console.log("Save design:", design);
        break;
      case "cake-export-pdf":
        console.log("Export PDF:", design);
        break;
      case "cake-export-png":
        if (canvasRef.current) {
          const link = document.createElement("a");
          link.href = canvasRef.current.toDataURL("image/png");
          link.download = "cake-design.png";
          link.click();
        }
        break;
      case "cake-print":
        window.print();
        break;
      default:
        console.log("Menu action:", action, data);
    }
  };

  // Step 0: Basic Info
  if (step === 0) {
    return (
      <ResizableDraggablePanel
        title="🍰 Cake Designer - Setup"
        onClose={onClose}
        onMinimize={onMinimize}
        defaultPosition={{ x: 200, y: 100, width: 980, height: 690 }}
        minWidth={700}
        minHeight={500}
      >
        <div style={{ padding: "20px", overflowY: "auto", height: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            {/* Left: Form */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <h3
                style={{
                  color: "#c8a97e",
                  fontSize: "14px",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                Basic Information
              </h3>

              {/* Occasion */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Occasion
                </label>
                <input
                  type="text"
                  value={design.occasion}
                  onChange={(e) =>
                    handleDesignChange("occasion", e.target.value)
                  }
                  placeholder="Wedding, Birthday, Anniversary..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "rgba(200, 169, 126, 0.05)",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                />
              </div>

              {/* Guest Count */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Guest Count
                </label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={design.guestCount}
                  onChange={(e) =>
                    handleGuestCountChange(parseInt(e.target.value))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "rgba(200, 169, 126, 0.05)",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                />
                <p
                  style={{
                    fontSize: "11px",
                    color: validation.isValid ? "#4f9" : "#f99",
                    margin: "4px 0 0 0",
                  }}
                >
                  {validation.message}
                </p>
              </div>

              {/* Shape */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Cake Shape
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["round", "square", "sheet"] as const).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => handleDesignChange("shape", shape)}
                      style={{
                        flex: 1,
                        padding: "6px 12px",
                        backgroundColor:
                          design.shape === shape
                            ? "rgba(200, 169, 126, 0.2)"
                            : "transparent",
                        border: `1px solid ${design.shape === shape ? "#c8a97e" : "#444"}`,
                        borderRadius: "4px",
                        color: design.shape === shape ? "#c8a97e" : "#aaa",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tier Count */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Number of Tiers
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={design.tiers.length}
                  onChange={(e) => {
                    const newCount = parseInt(e.target.value);
                    const { tiers } = getRecommendedTierSpecs(
                      design.guestCount,
                    );
                    const adjustedTiers = tiers.slice(0, newCount);
                    if (adjustedTiers.length < newCount) {
                      adjustedTiers.push({ diameter: 6, height: 4 });
                    }
                    handleDesignChange("tiers", adjustedTiers);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "rgba(200, 169, 126, 0.05)",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                />
              </div>

              {/* Complexity */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Design Complexity
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["simple", "moderate", "intricate"] as const).map(
                    (complexity) => (
                      <button
                        key={complexity}
                        onClick={() =>
                          handleDesignChange("designComplexity", complexity)
                        }
                        style={{
                          flex: 1,
                          padding: "6px 12px",
                          backgroundColor:
                            design.designComplexity === complexity
                              ? "rgba(200, 169, 126, 0.2)"
                              : "transparent",
                          border: `1px solid ${design.designComplexity === complexity ? "#c8a97e" : "#444"}`,
                          borderRadius: "4px",
                          color:
                            design.designComplexity === complexity
                              ? "#c8a97e"
                              : "#aaa",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                          textTransform: "capitalize",
                        }}
                      >
                        {complexity}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Right: Flavors & Details */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <h3
                style={{
                  color: "#c8a97e",
                  fontSize: "14px",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                Flavors & Details
              </h3>

              {/* Flavors */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Cake Flavors (select all)
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                  }}
                >
                  {CAKE_FLAVORS.map((flavor) => (
                    <label
                      key={flavor}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={design.flavors.includes(flavor)}
                        onChange={(e) => {
                          const newFlavors = e.target.checked
                            ? [...design.flavors, flavor]
                            : design.flavors.filter((f) => f !== flavor);
                          handleDesignChange(
                            "flavors",
                            newFlavors.length > 0 ? newFlavors : ["Vanilla"],
                          );
                        }}
                      />
                      <span style={{ color: "#aaa" }}>{flavor}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Frostings */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Frosting Type
                </label>
                <select
                  value={design.frostings[0]}
                  onChange={(e) =>
                    handleDesignChange("frostings", [e.target.value])
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "rgba(200, 169, 126, 0.05)",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                >
                  {FROSTINGS.map((frosting) => (
                    <option key={frosting} value={frosting}>
                      {frosting}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fillings */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Filling Type
                </label>
                <select
                  value={design.fillings[0]}
                  onChange={(e) =>
                    handleDesignChange("fillings", [e.target.value])
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "rgba(200, 169, 126, 0.05)",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                >
                  {FILLINGS.map((filling) => (
                    <option key={filling} value={filling}>
                      {filling}
                    </option>
                  ))}
                </select>
              </div>

              {/* Theme Notes */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Theme & Special Notes
                </label>
                <textarea
                  value={design.themeNotes}
                  onChange={(e) =>
                    handleDesignChange("themeNotes", e.target.value)
                  }
                  placeholder="Describe the theme, colors, style..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "rgba(200, 169, 126, 0.05)",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "13px",
                    minHeight: "60px",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <hr style={{ borderColor: "#333", margin: "12px 0" }} />

              <h4
                style={{
                  color: "#c8a97e",
                  fontSize: "12px",
                  fontWeight: "bold",
                  margin: "12px 0 8px 0",
                }}
              >
                Order Details
              </h4>

              {/* BEO/RFQ Number */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  BEO/RFQ #
                </label>
                <input
                  type="text"
                  value={design.beoNumber || ""}
                  onChange={(e) =>
                    handleDesignChange("beoNumber", e.target.value)
                  }
                  placeholder="e.g., BEO-2024-001"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "rgba(200, 169, 126, 0.05)",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Contact Phone
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    value={design.countryCode || "+1"}
                    onChange={(e) =>
                      handleDesignChange("countryCode", e.target.value)
                    }
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "rgba(200, 169, 126, 0.05)",
                      border: "1px solid #444",
                      borderRadius: "4px",
                      color: "#fff",
                      fontSize: "13px",
                      minWidth: "80px",
                    }}
                  >
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+33">+33 (FR)</option>
                    <option value="+49">+49 (DE)</option>
                    <option value="+39">+39 (IT)</option>
                    <option value="+34">+34 (ES)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+81">+81 (JP)</option>
                    <option value="+86">+86 (CN)</option>
                    <option value="+91">+91 (IN)</option>
                    <option value="+55">+55 (BR)</option>
                    <option value="+27">+27 (ZA)</option>
                  </select>
                  <input
                    type="tel"
                    value={design.contactPhone || ""}
                    onChange={(e) =>
                      handleDesignChange("contactPhone", e.target.value)
                    }
                    placeholder="(555) 000-0000"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      backgroundColor: "rgba(200, 169, 126, 0.05)",
                      border: "1px solid #444",
                      borderRadius: "4px",
                      color: "#fff",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              {/* Contact Email */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Contact Email
                </label>
                <input
                  type="email"
                  value={design.contactEmail || ""}
                  onChange={(e) =>
                    handleDesignChange("contactEmail", e.target.value)
                  }
                  placeholder="client@example.com"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "rgba(200, 169, 126, 0.05)",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                />
              </div>

              {/* Delivery Address */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Delivery Address (if applicable)
                </label>
                <textarea
                  value={design.deliveryAddress || ""}
                  onChange={(e) =>
                    handleDesignChange("deliveryAddress", e.target.value)
                  }
                  placeholder="Street address, city, state, zip..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "rgba(200, 169, 126, 0.05)",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "13px",
                    minHeight: "50px",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Pedestal/Stand */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Cake Pedestal/Stand
                </label>
                <select
                  value={design.pedestal || "none"}
                  onChange={(e) =>
                    handleDesignChange("pedestal", e.target.value as any)
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "rgba(200, 169, 126, 0.05)",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                >
                  <option value="none">No Pedestal</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="crystal">Crystal</option>
                  <option value="wood">Wood</option>
                  <option value="acrylic">Acrylic</option>
                </select>
              </div>

              {/* Next Button */}
              <button
                onClick={() => setStep(1)}
                disabled={!design.occasion.trim()}
                style={{
                  padding: "10px 16px",
                  backgroundColor: design.occasion.trim()
                    ? "rgba(200, 169, 126, 0.15)"
                    : "rgba(100, 100, 100, 0.2)",
                  border: `2px solid ${design.occasion.trim() ? "#c8a97e" : "#444"}`,
                  borderRadius: "6px",
                  color: design.occasion.trim() ? "#c8a97e" : "#666",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: design.occasion.trim() ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                Review & Generate <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </ResizableDraggablePanel>
    );
  }

  // Step 1: Review & Generate
  if (step === 1) {
    return (
      <ResizableDraggablePanel
        title="🍰 Cake Designer - Review"
        onClose={onClose}
        onMinimize={onMinimize}
        defaultPosition={{ x: 200, y: 100, width: 980, height: 690 }}
        minWidth={700}
        minHeight={500}
      >
        <div style={{ padding: "20px", overflowY: "auto", height: "100%" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            {/* Left: Design Summary */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <h3
                style={{
                  color: "#c8a97e",
                  fontSize: "14px",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                Design Summary
              </h3>

              <div
                style={{
                  backgroundColor: "rgba(200, 169, 126, 0.05)",
                  padding: "12px",
                  borderRadius: "4px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    margin: "0 0 8px 0",
                  }}
                >
                  <strong style={{ color: "#c8a97e" }}>Occasion:</strong>{" "}
                  {design.occasion}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    margin: "0 0 8px 0",
                  }}
                >
                  <strong style={{ color: "#c8a97e" }}>Guests:</strong>{" "}
                  {design.guestCount} people
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    margin: "0 0 8px 0",
                  }}
                >
                  <strong style={{ color: "#c8a97e" }}>Cake Serves:</strong>{" "}
                  {estimateServings(design.tiers, design.shape)} people
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: validation.isValid ? "#4f9" : "#f99",
                    margin: "0 0 8px 0",
                  }}
                >
                  {validation.message}
                </p>
              </div>

              <h4
                style={{
                  color: "#c8a97e",
                  fontSize: "12px",
                  fontWeight: "bold",
                  margin: "8px 0",
                }}
              >
                Tiers & Layers
              </h4>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {design.tiers.map((tier, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: "rgba(200, 169, 126, 0.05)",
                      padding: "10px",
                      borderRadius: "4px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#aaa",
                        marginBottom: "6px",
                      }}
                    >
                      <strong>Tier {i + 1}:</strong> {tier.diameter}"Ø ×{" "}
                      {tier.height}" H
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="6"
                      value={tier.height}
                      onChange={(e) =>
                        handleTierHeightChange(i, parseInt(e.target.value))
                      }
                      style={{ width: "100%" }}
                    />
                    <small
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Height: {tier.height}"
                    </small>
                  </div>
                ))}
              </div>

              <h4
                style={{
                  color: "#c8a97e",
                  fontSize: "12px",
                  fontWeight: "bold",
                  margin: "8px 0",
                }}
              >
                Specifications
              </h4>
              <div
                style={{
                  fontSize: "12px",
                  color: "#aaa",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <p style={{ margin: 0 }}>
                  <strong>Shape:</strong> {design.shape}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Flavors:</strong> {design.flavors.join(", ")}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Frosting:</strong> {design.frostings[0]}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Filling:</strong> {design.fillings[0]}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Complexity:</strong> {design.designComplexity}
                </p>
              </div>

              <h4
                style={{
                  color: "#FFD700",
                  fontSize: "12px",
                  fontWeight: "bold",
                  margin: "12px 0 8px 0",
                }}
              >
                💰 Pricing
              </h4>
              <div
                style={{
                  backgroundColor: "rgba(255, 215, 0, 0.1)",
                  padding: "12px",
                  borderRadius: "4px",
                  borderLeft: "3px solid #FFD700",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: "8px",
                      alignItems: "center",
                      fontSize: "11px",
                    }}
                  >
                    <span style={{ color: "#aaa" }}>Base (per serving):</span>
                    <input
                      type="number"
                      value={design.basePrice || 6}
                      onChange={(e) =>
                        handleDesignChange(
                          "basePrice",
                          parseFloat(e.target.value),
                        )
                      }
                      min="0"
                      step="0.5"
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "rgba(200, 169, 126, 0.1)",
                        border: "1px solid #444",
                        borderRadius: "3px",
                        color: "#fff",
                        fontSize: "11px",
                        width: "60px",
                      }}
                    />
                    <span style={{ color: "#FFD700", fontWeight: "bold" }}>
                      $
                      {(design.basePrice || 6) *
                        estimateServings(design.tiers, design.shape)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: "8px",
                      alignItems: "center",
                      fontSize: "11px",
                    }}
                  >
                    <span style={{ color: "#aaa" }}>Decorations:</span>
                    <input
                      type="number"
                      value={design.decorationPrice || 0}
                      onChange={(e) =>
                        handleDesignChange(
                          "decorationPrice",
                          parseFloat(e.target.value),
                        )
                      }
                      min="0"
                      step="5"
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "rgba(200, 169, 126, 0.1)",
                        border: "1px solid #444",
                        borderRadius: "3px",
                        color: "#fff",
                        fontSize: "11px",
                        width: "60px",
                      }}
                    />
                    <span style={{ color: "#FFD700", fontWeight: "bold" }}>
                      ${design.decorationPrice || 0}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: "8px",
                      alignItems: "center",
                      fontSize: "11px",
                    }}
                  >
                    <span style={{ color: "#aaa" }}>Pedestal:</span>
                    <input
                      type="number"
                      value={design.pedestalPrice || 0}
                      onChange={(e) =>
                        handleDesignChange(
                          "pedestalPrice",
                          parseFloat(e.target.value),
                        )
                      }
                      min="0"
                      step="5"
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "rgba(200, 169, 126, 0.1)",
                        border: "1px solid #444",
                        borderRadius: "3px",
                        color: "#fff",
                        fontSize: "11px",
                        width: "60px",
                      }}
                    />
                    <span style={{ color: "#FFD700", fontWeight: "bold" }}>
                      ${design.pedestalPrice || 0}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: "8px",
                      alignItems: "center",
                      fontSize: "11px",
                    }}
                  >
                    <span style={{ color: "#aaa" }}>Delivery:</span>
                    <input
                      type="number"
                      value={design.deliveryPrice || 0}
                      onChange={(e) =>
                        handleDesignChange(
                          "deliveryPrice",
                          parseFloat(e.target.value),
                        )
                      }
                      min="0"
                      step="5"
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "rgba(200, 169, 126, 0.1)",
                        border: "1px solid #444",
                        borderRadius: "3px",
                        color: "#fff",
                        fontSize: "11px",
                        width: "60px",
                      }}
                    />
                    <span style={{ color: "#FFD700", fontWeight: "bold" }}>
                      ${design.deliveryPrice || 0}
                    </span>
                  </div>

                  <hr style={{ borderColor: "#444", margin: "8px 0" }} />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: "8px",
                      alignItems: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    <span style={{ color: "#FFD700" }}>TOTAL:</span>
                    <div />
                    <span style={{ color: "#FFD700" }}>
                      $
                      {(
                        (design.basePrice || 6) *
                          estimateServings(design.tiers, design.shape) +
                        (design.decorationPrice || 0) +
                        (design.pedestalPrice || 0) +
                        (design.deliveryPrice || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <h3
                style={{
                  color: "#c8a97e",
                  fontSize: "14px",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                Generate Preview
              </h3>

              <p
                style={{
                  fontSize: "12px",
                  color: "#999",
                  margin: "0 0 12px 0",
                }}
              >
                Click below to generate an AI image of your cake design. You'll
                then be able to adjust layers and styling in real-time.
              </p>

              <div
                style={{
                  backgroundColor: "rgba(0, 200, 200, 0.1)",
                  padding: "10px",
                  borderRadius: "4px",
                  borderLeft: "3px solid #00d8d8",
                  marginBottom: "12px",
                }}
              >
                <p style={{ fontSize: "11px", color: "#8dd", margin: 0 }}>
                  💡 Your prompt will be saved so you can regenerate the exact
                  same cake later without re-entering all details.
                </p>
              </div>

              <button
                onClick={generateImage}
                disabled={isLoading}
                style={{
                  padding: "12px 16px",
                  backgroundColor: isLoading
                    ? "rgba(200, 169, 126, 0.1)"
                    : "rgba(200, 169, 126, 0.15)",
                  border: "2px solid #c8a97e",
                  borderRadius: "6px",
                  color: "#c8a97e",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2
                      size={16}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Generating...
                  </>
                ) : (
                  <>✨ Generate AI Image</>
                )}
              </button>

              {error && (
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "rgba(255, 0, 0, 0.15)",
                    border: "1px solid #ff4444",
                    borderRadius: "4px",
                    color: "#ff8888",
                    fontSize: "12px",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={() => setStep(0)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "transparent",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  color: "#aaa",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <ChevronLeft size={14} /> Back to Setup
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </ResizableDraggablePanel>
    );
  }

  // Step 2: Image Editing
  return (
    <ResizableDraggablePanel
      title="🍰 Cake Designer - Adjust & Refine"
      onClose={onClose}
      onMinimize={onMinimize}
      defaultPosition={{ x: 200, y: 100, width: 1180, height: 740 }}
      minWidth={800}
      minHeight={500}
    >
      <div
        style={{
          padding: "16px",
          display: "grid",
          gridTemplateColumns: "300px 1fr 250px",
          gap: "16px",
          height: "100%",
        }}
      >
        {/* Left: Layer Controls */}
        <div
          style={{
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <h4
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            Layer Controls
          </h4>

          {design.tiers.map((tier, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "rgba(200, 169, 126, 0.08)",
                padding: "12px",
                borderRadius: "4px",
                border: "1px solid #333",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "#c8a97e",
                  fontWeight: "600",
                  margin: "0 0 8px 0",
                }}
              >
                Tier {i + 1}: {tier.diameter}"
              </p>

              <div style={{ marginBottom: "8px" }}>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Visibility: {Math.round(layerOpacities[i] * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={layerOpacities[i]}
                  onChange={(e) => {
                    const newOpacities = [...layerOpacities];
                    newOpacities[i] = parseFloat(e.target.value);
                    setLayerOpacities(newOpacities);
                  }}
                  style={{ width: "100%", cursor: "pointer" }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Height: {tier.height}"
                </label>
                <input
                  type="range"
                  min="2"
                  max="6"
                  step="0.5"
                  value={tier.height}
                  onChange={(e) =>
                    handleTierHeightChange(i, parseFloat(e.target.value))
                  }
                  style={{ width: "100%", cursor: "pointer" }}
                />
              </div>
            </div>
          ))}

          <button
            onClick={() => setStep(0)}
            style={{
              marginTop: "auto",
              padding: "10px",
              backgroundColor: "transparent",
              border: "1px solid #444",
              borderRadius: "4px",
              color: "#aaa",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            ← Back to Design
          </button>
        </div>

        {/* Center: Image Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h4
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            Cake Preview
          </h4>

          <div
            style={{
              flex: 1,
              backgroundColor: "#0a0a0a",
              borderRadius: "8px",
              border: "1px solid #444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {generatedImage && (
              <img
                src={generatedImage}
                alt="Generated cake"
                style={{
                  maxWidth: "90%",
                  maxHeight: "90%",
                  objectFit: "contain",
                  transform: `rotateY(${imageRotation}deg)`,
                  transition: "transform 0.2s",
                  filter: `opacity(${
                    layerOpacities.reduce((a, b) => a + b, 0) /
                    layerOpacities.length
                  })`,
                }}
              />
            )}
          </div>

          {/* Image Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: autoRotate
                    ? "rgba(0, 200, 200, 0.2)"
                    : "rgba(200, 169, 126, 0.1)",
                  border: `1px solid ${autoRotate ? "#00d8d8" : "#c8a97e"}`,
                  borderRadius: "4px",
                  color: "#c8a97e",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  transition: "all 0.2s",
                }}
              >
                {autoRotate ? <Pause size={14} /> : <Play size={14} />}
                {autoRotate ? "Auto" : "Manual"}
              </button>

              <button
                onClick={() => setImageRotation((r) => (r + 45) % 360)}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: "rgba(200, 169, 126, 0.1)",
                  border: "1px solid #c8a97e",
                  borderRadius: "4px",
                  color: "#c8a97e",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                }}
              >
                <RotateCw size={14} /> 45°
              </button>

              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = generatedImage!;
                  a.download = `cake-${Date.now()}.png`;
                  a.click();
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  backgroundColor: "rgba(200, 169, 126, 0.1)",
                  border: "1px solid #c8a97e",
                  borderRadius: "4px",
                  color: "#c8a97e",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ��️ Download
              </button>
            </div>

            <div
              style={{ fontSize: "11px", color: "#666", textAlign: "center" }}
            >
              Rotation: {imageRotation}° {autoRotate && "• Auto-rotating"}
            </div>
          </div>
        </div>

        {/* Right: Design Info */}
        <div
          style={{
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <h4
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            Design Details
          </h4>

          <div
            style={{
              backgroundColor: "rgba(200, 169, 126, 0.05)",
              padding: "12px",
              borderRadius: "4px",
            }}
          >
            <p style={{ fontSize: "11px", color: "#aaa", margin: "0 0 6px 0" }}>
              <strong style={{ color: "#c8a97e" }}>Occasion:</strong>{" "}
              {design.occasion}
            </p>
            <p style={{ fontSize: "11px", color: "#aaa", margin: "0 0 6px 0" }}>
              <strong style={{ color: "#c8a97e" }}>Guests:</strong>{" "}
              {design.guestCount}
            </p>
            <p
              style={{
                fontSize: "11px",
                color: validation.isValid ? "#4f9" : "#f99",
                margin: "0 0 6px 0",
              }}
            >
              {validation.message}
            </p>
            <hr style={{ borderColor: "#333", margin: "8px 0" }} />
            <p style={{ fontSize: "11px", color: "#aaa", margin: "0 0 6px 0" }}>
              <strong style={{ color: "#c8a97e" }}>Flavors:</strong>{" "}
              {design.flavors.join(", ")}
            </p>
            <p style={{ fontSize: "11px", color: "#aaa", margin: "0 0 6px 0" }}>
              <strong style={{ color: "#c8a97e" }}>Frosting:</strong>{" "}
              {design.frostings[0]}
            </p>
            <p style={{ fontSize: "11px", color: "#aaa", margin: "0 0 6px 0" }}>
              <strong style={{ color: "#c8a97e" }}>Shape:</strong>{" "}
              {design.shape}
            </p>
            <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>
              <strong style={{ color: "#c8a97e" }}>Complexity:</strong>{" "}
              {design.designComplexity}
            </p>
          </div>

          {design.themeNotes && (
            <div
              style={{
                backgroundColor: "rgba(200, 169, 126, 0.05)",
                padding: "12px",
                borderRadius: "4px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "#c8a97e",
                  fontWeight: "bold",
                  margin: "0 0 6px 0",
                }}
              >
                Theme Notes
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "#aaa",
                  margin: 0,
                  wordBreak: "break-word",
                }}
              >
                {design.themeNotes}
              </p>
            </div>
          )}

          <div
            style={{
              backgroundColor: "rgba(255, 215, 0, 0.1)",
              padding: "12px",
              borderRadius: "4px",
              border: "1px solid rgba(255, 215, 0, 0.3)",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                color: "#FFD700",
                fontWeight: "bold",
                margin: "0 0 6px 0",
              }}
            >
              Order Summary
            </p>
            <p style={{ fontSize: "11px", color: "#aaa", margin: "0 0 6px 0" }}>
              <strong style={{ color: "#c8a97e" }}>Total Price:</strong>{" "}
              <span style={{ color: "#FFD700", fontWeight: "bold" }}>
                $
                {calculatePricing(
                  design.tiers,
                  design.shape,
                  0,
                  design.pedestal as any,
                ).total.toFixed(2)}
              </span>
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              <label style={{ fontSize: "11px", color: "#aaa", flex: 1 }}>
                Print Copies:
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={autoPrintCopies}
                onChange={(e) =>
                  setAutoPrintCopies(Math.max(1, parseInt(e.target.value) || 1))
                }
                style={{
                  width: "50px",
                  padding: "4px 6px",
                  backgroundColor: "rgba(200, 169, 126, 0.05)",
                  border: "1px solid #444",
                  borderRadius: "3px",
                  color: "#fff",
                  fontSize: "11px",
                  textAlign: "center",
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <button
              onClick={() => {
                generateImage(true);
              }}
              style={{
                padding: "10px",
                backgroundColor: "rgba(255, 200, 0, 0.15)",
                border: "1px solid #FFD700",
                borderRadius: "4px",
                color: "#FFD700",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              ♻️ Regenerate Same
            </button>

            <button
              onClick={() => {
                setGeneratedImage(null);
                setStep(1);
              }}
              style={{
                padding: "10px",
                backgroundColor: "rgba(200, 169, 126, 0.1)",
                border: "1px solid #c8a97e",
                borderRadius: "4px",
                color: "#c8a97e",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              ✨ New Design
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </ResizableDraggablePanel>
  );
}
