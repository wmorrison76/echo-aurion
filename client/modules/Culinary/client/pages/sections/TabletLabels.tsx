import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Settings,
  Printer,
  Wifi,
  WifiOff,
  Loader2,
  Moon,
  Sun,
  ArrowLeft,
} from "lucide-react";
import {
  generateQRCodeString,
  getQRCodeImageUrl,
  formatLabelHTML,
} from "@/lib/qr-code-generator";
import { useTabletServiceWorker } from "@/hooks/use-tablet-sw";
import { TabletNav } from "@/components/TabletNav";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Recipe {
  id: string;
  name: string;
  description?: string;
  image?: string;
  allergens?: string[];
  ingredients?: string[];
  instructions?: string;
  cookTime?: string;
  prepTime?: string;
  portionSize?: { value: string; unit: string };
  createdBy?: string;
}

interface TabletConfig {
  credentialMode: "none" | "camera" | "employee_id" | "disabled";
  includeChefName: boolean;
  enabled: boolean;
  deviceName: string;
}

export default function TabletLabels() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { swRegistered, isOnline: swOnline } = useTabletServiceWorker();

  const deviceToken =
    searchParams.get("device") || localStorage.getItem("tablet:deviceToken");
  const [isOnline, setIsOnline] = useState(navigator.onLine || swOnline);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [prepCount, setPrepCount] = useState(1);
  const [employeeId, setEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<TabletConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Store device token on first load
  useEffect(() => {
    if (deviceToken && !localStorage.getItem("tablet:deviceToken")) {
      localStorage.setItem("tablet:deviceToken", deviceToken);
    }
  }, [deviceToken]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load recipes on mount
  useEffect(() => {
    loadRecipes();
    loadConfig();
  }, []);

  const loadRecipes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/tablet/recipes?limit=100");
      if (!response.ok) throw new Error("Failed to load recipes");

      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load recipes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem("tablet:deviceToken");
      if (!token) return;

      const response = await fetch(`/api/tablet/settings?deviceToken=${token}`);
      if (!response.ok) throw new Error("Failed to load settings");

      const data = await response.json();
      setConfig(data);

      if (data.credentialMode === "disabled") {
        toast({
          title: "Disabled",
          description: "Tablet label printing is currently disabled",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  }, [toast]);

  const filteredRecipes = useMemo(() => {
    if (!searchTerm) return recipes;
    return recipes.filter((r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [recipes, searchTerm]);

  const handlePrint = useCallback(async () => {
    if (!selectedRecipe) {
      toast({
        title: "No Recipe",
        description: "Please select a recipe first",
        variant: "destructive",
      });
      return;
    }

    if (config?.credentialMode === "disabled") {
      toast({
        title: "Disabled",
        description: "Printing is currently disabled",
        variant: "destructive",
      });
      return;
    }

    if (config?.credentialMode === "employee_id" && !employeeId) {
      toast({
        title: "Required",
        description: "Please enter your employee ID",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("tablet:deviceToken");
      const response = await fetch("/api/tablet/print-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceToken: token,
          recipeId: selectedRecipe.id,
          recipeName: selectedRecipe.name,
          allergens: selectedRecipe.allergens || [],
          portionSize: selectedRecipe.portionSize
            ? `${selectedRecipe.portionSize.value} ${selectedRecipe.portionSize.unit}`
            : undefined,
          portionMultiplier: prepCount,
          employeeId: employeeId || undefined,
          chefName: selectedRecipe.createdBy,
        }),
      });

      if (!response.ok) throw new Error("Failed to print label");

      const data = await response.json();

      // Generate QR code data
      const qrData = generateQRCodeString({
        recipeName: selectedRecipe.name,
        allergens: selectedRecipe.allergens || [],
        chefName: selectedRecipe.createdBy,
        printDate: data.bornOn,
      });

      // Create and open print dialog
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const labels = Array(prepCount)
          .fill(0)
          .map((_, i) => {
            const qrImageUrl = getQRCodeImageUrl(qrData, 150);
            return `
              <div style="
                width: 4in;
                height: 6in;
                border: 1px solid #000;
                padding: 0.25in;
                box-sizing: border-box;
                page-break-after: always;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                margin: 0;
                font-family: Arial, sans-serif;
              ">
                <h2 style="margin: 0 0 0.1in 0; font-size: 24px; text-align: center;">
                  ${selectedRecipe.name}
                </h2>

                <div style="font-size: 12px; line-height: 1.8;">
                  <div><strong>Born on:</strong> ${data.bornOn}</div>
                  <div><strong>Expires:</strong> ${data.expiresOn}</div>
                </div>

                ${
                  selectedRecipe.allergens?.length
                    ? `
                  <div style="
                    background-color: #ffe6e6;
                    color: #800000;
                    padding: 0.1in;
                    border-radius: 3px;
                    font-weight: bold;
                    font-size: 11px;
                    text-align: center;
                  ">
                    ⚠️ ${selectedRecipe.allergens.join(", ")}
                  </div>
                `
                    : ""
                }

                <div style="text-align: center;">
                  <img src="${qrImageUrl}" width="120" height="120" style="border: 1px solid #000;" />
                </div>

                ${
                  selectedRecipe.createdBy
                    ? `<div style="font-size: 9px; text-align: center; margin-top: 0.05in;">Chef: ${selectedRecipe.createdBy}</div>`
                    : ""
                }
              </div>
            `;
          })
          .join("");

        printWindow.document.write(`
          <html>
            <head>
              <title>Print Labels - ${selectedRecipe.name}</title>
              <style>
                body { margin: 0; padding: 0; background: white; }
              </style>
            </head>
            <body>
              ${labels}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }

      toast({
        title: "Success",
        description: `Printed ${prepCount} label(s)`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to print label",
        variant: "destructive",
      });
    }
  }, [selectedRecipe, prepCount, employeeId, config, toast]);

  if (config?.credentialMode === "disabled") {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-2">Disabled</h1>
          <p className="text-red-600">
            Tablet label printing is currently disabled
          </p>
        </div>
      </div>
    );
  }

  // Check if this is a tablet setup (has device query param) or admin access
  const isTabletMode = !!searchParams.get("device");

  return (
    <div className="w-full h-screen bg-gray-100 dark:bg-slate-900 flex flex-row">
      {/* Sidebar Navigation */}
      <div className="w-64 flex-shrink-0 border-r border-gray-300 dark:border-slate-700">
        <TabletNav />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Back Button - Show only when not in tablet mode */}
            {!isTabletMode && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/?tab=recipes")}
                title="Back to Echo Recipe Pro"
                className="text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Recipe Labels
            </h1>
            <div className="flex items-center gap-1 text-sm">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600 dark:text-green-500" />
                  <span className="text-green-600 dark:text-green-400">
                    Online
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Offline
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Search */}
          <div className="w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-2 top-3 w-4 h-4 text-gray-400 dark:text-slate-500" />
                <Input
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                />
              </div>
            </div>

            {/* Recipe List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-500" />
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-slate-400 py-8">
                  No recipes found
                </div>
              ) : (
                filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedRecipe?.id === recipe.id
                        ? "bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400"
                        : "bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600"
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {recipe.name}
                    </div>
                    {recipe.portionSize && (
                      <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                        Portion: {recipe.portionSize.value}{" "}
                        {recipe.portionSize.unit}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Prep Count & Print Controls */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block mb-2">
                  # Prep Labels
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrepCount(Math.max(1, prepCount - 1))}
                    className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={prepCount}
                    onChange={(e) =>
                      setPrepCount(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="text-center flex-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrepCount(prepCount + 1)}
                    className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    +
                  </Button>
                </div>
              </div>

              {config?.credentialMode === "employee_id" && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 block mb-2">
                    Employee ID
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter ID"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                  />
                </div>
              )}

              <Button
                onClick={handlePrint}
                disabled={!selectedRecipe || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600"
                size="lg"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Labels
              </Button>
            </div>
          </div>

          {/* Right Panel - Recipe Display */}
          {selectedRecipe ? (
            <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-800">
              <div className="max-w-3xl mx-auto">
                {/* Recipe Image */}
                {selectedRecipe.image && (
                  <img
                    src={selectedRecipe.image}
                    alt={selectedRecipe.name}
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}

                {/* Recipe Header */}
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedRecipe.name}
                </h2>
                {selectedRecipe.description && (
                  <p className="text-gray-600 dark:text-slate-400 mb-4">
                    {selectedRecipe.description}
                  </p>
                )}

                {/* Timing & Portion Info */}
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  {selectedRecipe.prepTime && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
                        Prep Time
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedRecipe.prepTime}
                      </div>
                    </div>
                  )}
                  {selectedRecipe.cookTime && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
                        Cook Time
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedRecipe.cookTime}
                      </div>
                    </div>
                  )}
                  {selectedRecipe.portionSize && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
                        Portion
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedRecipe.portionSize.value}{" "}
                        {selectedRecipe.portionSize.unit}
                      </div>
                    </div>
                  )}
                </div>

                {/* Allergens */}
                {selectedRecipe.allergens &&
                  selectedRecipe.allergens.length > 0 && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="font-bold text-red-800 dark:text-red-300 mb-2">
                        ⚠️ Allergens
                      </div>
                      <div className="text-red-700 dark:text-red-200">
                        {selectedRecipe.allergens.join(", ")}
                      </div>
                    </div>
                  )}

                {/* Ingredients */}
                {selectedRecipe.ingredients &&
                  selectedRecipe.ingredients.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Ingredients
                      </h3>
                      <ul className="space-y-2">
                        {selectedRecipe.ingredients.map((ing, i) => (
                          <li
                            key={i}
                            className="text-gray-700 dark:text-slate-300"
                          >
                            • {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Instructions */}
                {selectedRecipe.instructions && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Instructions
                    </h3>
                    <div className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
                      {selectedRecipe.instructions}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-slate-800">
              <div className="text-center text-gray-500 dark:text-slate-400">
                <p className="text-lg">Select a recipe to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
