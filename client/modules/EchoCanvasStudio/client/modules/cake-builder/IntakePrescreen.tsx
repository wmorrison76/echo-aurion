import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { IntakeAnswers } from "./types";
import { loadSettings } from "./settings";

const CAKE_TYPES = [
  "Sponge Cake",
  "Pound Cake",
  "Chiffon Cake",
  "Carrot Cake",
  "Cheesecake",
  "Mousse Cake",
  "Tiramisu",
  "Red Velvet",
  "Custom",
];

const ICINGS = [
  "Buttercream",
  "Cream Cheese",
  "Ganache",
  "Whipped Cream",
  "Fondant",
  "Royal Icing",
];

const INITIAL_ANSWERS: IntakeAnswers = {
  occasion: "",
  eventDate: undefined,
  eventTime: undefined,
  bakeryAvailable: true,
  locationDetails: "",
  deliveryType: "delivery",
  guestCount: 50,
  otherDesserts: false,
  allergies: [],
  dietaryPreferences: [],
  flavors: [],
  multiFlavorPerTier: false,
  fillings: [],
  frostings: [],
  outdoorIcing: false,
  tiersShape: "round",
  tierCount: 3,
  portionStyle: "standard",
  specialDietNeeds: [],
  themeNotes: "",
  inspirationLinks: "",
  designComplexity: "simple",
  textureNotes: "",
  decorativeElements: [],
  freshFlowersBy: "baker",
  cakeTopperBy: "client",
  needsSketch: false,
  approvesAdvancedCost: false,
  deliveryFeeApproved: false,
  venueRestrictions: "",
  cuttingBy: "",
  needCuttingGuide: false,
  storageNotes: "",
  depositConfirmed: false,
  cancellationAck: false,
  tastingRequested: false,
  tastingFlavors: "",
  matchingDesserts: "",
  needsLabels: false,
  standRental: false,
  displaySetup: false,
  cakeType: "",
  cakeIcing: "",
  customShape: "",
};

interface IntakePrescreonProps {
  onComplete?: (answers: IntakeAnswers) => void;
  onCancel?: () => void;
}

const AUTO_SAVE_KEY = "cake_intake_draft";

export default function IntakePrescreen({
  onComplete,
  onCancel,
}: IntakePrescreonProps) {
  const [answers, setAnswers] = useState<IntakeAnswers>(INITIAL_ANSWERS);
  const [step, setStep] = useState(0);
  const [hasNoAllergies, setHasNoAllergies] = useState(true);
  const settings = loadSettings();

  // Auto-save to localStorage
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(answers));
    }, 500);
    return () => clearTimeout(saveTimer);
  }, [answers]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(AUTO_SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as IntakeAnswers;
        setAnswers(parsed);
        setHasNoAllergies(parsed.allergies.length === 0);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handleChange = <K extends keyof IntakeAnswers>(key: K, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleAllergiesChange = (value: string) => {
    if (
      value.toLowerCase() === "none" ||
      value.toLowerCase() === "no allergies" ||
      !value.trim()
    ) {
      setAnswers((prev) => ({ ...prev, allergies: [] }));
    } else {
      const allergies = value
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a);
      setAnswers((prev) => ({ ...prev, allergies }));
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = () => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    onComplete?.(answers);
  };

  const getShapeLabel = (shape: string) => {
    if (shape === "round") return "⭕ Round";
    if (shape === "square") return "⬜ Square";
    if (shape === "sheet") return "▭ Sheet";
    return "✏️ Custom";
  };

  const sections = [
    // Step 0: Event basics
    <div key="step0" className="space-y-5">
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-lg border border-cyan-200">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">
          📅 Event Details
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Occasion *
            </label>
            <Input
              value={answers.occasion}
              onChange={(e) => handleChange("occasion", e.target.value)}
              placeholder="e.g., Birthday, Wedding, Anniversary..."
              className="border-gray-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Event Date *
              </label>
              <Input
                type="date"
                value={answers.eventDate || ""}
                onChange={(e) => handleChange("eventDate", e.target.value)}
                className="border-gray-300"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Event Time
              </label>
              <Input
                type="time"
                value={answers.eventTime || ""}
                onChange={(e) => handleChange("eventTime", e.target.value)}
                className="border-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Guest Count *
            </label>
            <Input
              type="number"
              min="1"
              value={answers.guestCount}
              onChange={(e) =>
                handleChange("guestCount", Number(e.target.value))
              }
              className="border-gray-300"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Venue/Location Details
            </label>
            <Input
              value={answers.locationDetails}
              onChange={(e) => handleChange("locationDetails", e.target.value)}
              placeholder="Address, venue type, restrictions..."
              className="border-gray-300"
            />
          </div>
        </div>
      </div>
    </div>,

    // Step 1: Cake preferences
    <div key="step1" className="space-y-5">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">
          🍰 Cake Preferences
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Cake Type *
            </label>
            <select
              value={answers.cakeType}
              onChange={(e) => handleChange("cakeType", e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
            >
              <option value="">Select cake type...</option>
              {CAKE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Base Flavor *
            </label>
            <select
              value={answers.flavors[0] || ""}
              onChange={(e) =>
                handleChange("flavors", e.target.value ? [e.target.value] : [])
              }
              className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
            >
              <option value="">Select flavor...</option>
              {settings.flavors.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Icing/Frosting Type *
            </label>
            <select
              value={answers.cakeIcing}
              onChange={(e) => handleChange("cakeIcing", e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
            >
              <option value="">Select icing...</option>
              {ICINGS.map((icing) => (
                <option key={icing} value={icing}>
                  {icing}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Filling
            </label>
            <select
              value={answers.fillings[0] || ""}
              onChange={(e) =>
                handleChange("fillings", e.target.value ? [e.target.value] : [])
              }
              className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
            >
              <option value="">Select filling...</option>
              {settings.fillings.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-3">
              Shape *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["round", "square", "sheet"].map((shape) => (
                <button
                  key={shape}
                  onClick={() => handleChange("tiersShape", shape as any)}
                  className={`p-3 rounded-lg border-2 font-medium transition ${
                    answers.tiersShape === shape
                      ? "border-cyan-500 bg-cyan-50 text-cyan-900"
                      : "border-gray-300 bg-white text-gray-700 hover:border-cyan-300"
                  }`}
                >
                  {getShapeLabel(shape)}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-700 block mb-2">
                Or describe custom shape (e.g., "Mad Hatter", "Heart-shaped")
              </label>
              <Input
                value={answers.customShape || ""}
                onChange={(e) => handleChange("customShape", e.target.value)}
                placeholder="Describe your custom shape idea..."
                className="border-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Number of Tiers *
            </label>
            <Input
              type="number"
              min="1"
              max="5"
              value={answers.tierCount}
              onChange={(e) =>
                handleChange("tierCount", Number(e.target.value))
              }
              className="border-gray-300"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Checkbox
              checked={answers.outdoorIcing}
              onCheckedChange={(checked) =>
                handleChange("outdoorIcing", checked)
              }
              id="outdoor"
            />
            <label
              htmlFor="outdoor"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Outdoor event (heat-resistant frosting needed)
            </label>
          </div>
        </div>
      </div>
    </div>,

    // Step 2: Dietary & allergies
    <div key="step2" className="space-y-5">
      <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-4 rounded-lg border border-rose-200">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">
          ⚠️ Dietary Needs & Allergies
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Allergies
            </label>
            <div className="mb-3 flex items-center gap-3">
              <Checkbox
                checked={hasNoAllergies}
                onCheckedChange={(checked) => {
                  setHasNoAllergies(checked as boolean);
                  if (checked) {
                    handleChange("allergies", []);
                  }
                }}
                id="noAllergies"
              />
              <label
                htmlFor="noAllergies"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                No allergies
              </label>
            </div>
            {!hasNoAllergies && (
              <Input
                value={answers.allergies.join(", ")}
                onChange={(e) => handleAllergiesChange(e.target.value)}
                placeholder="e.g., peanuts, gluten, dairy (comma-separated)"
                className="border-gray-300"
              />
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Dietary Restrictions/Preferences
            </label>
            <Input
              value={answers.dietaryPreferences.join(", ")}
              onChange={(e) =>
                handleChange(
                  "dietaryPreferences",
                  e.target.value
                    .split(",")
                    .map((a) => a.trim())
                    .filter((a) => a),
                )
              }
              placeholder="e.g., vegan, keto, gluten-free (comma-separated)"
              className="border-gray-300"
            />
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={answers.tastingRequested}
              onCheckedChange={(checked) =>
                handleChange("tastingRequested", checked)
              }
              id="tasting"
            />
            <label
              htmlFor="tasting"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Client wants a tasting session
            </label>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Design Complexity
            </label>
            <div className="flex gap-3">
              {["simple", "intricate"].map((complexity) => (
                <button
                  key={complexity}
                  onClick={() =>
                    handleChange("designComplexity", complexity as any)
                  }
                  className={`flex-1 p-3 rounded-lg border-2 font-medium transition ${
                    answers.designComplexity === complexity
                      ? "border-purple-500 bg-purple-50 text-purple-900"
                      : "border-gray-300 bg-white text-gray-700 hover:border-purple-300"
                  }`}
                >
                  {complexity === "simple" ? "📐 Simple" : "✨ Intricate"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Special Notes
            </label>
            <Input
              value={answers.specialDietNeeds.join(", ")}
              onChange={(e) =>
                handleChange(
                  "specialDietNeeds",
                  e.target.value
                    .split(",")
                    .map((a) => a.trim())
                    .filter((a) => a),
                )
              }
              placeholder="Any additional dietary considerations..."
              className="border-gray-300"
            />
          </div>
        </div>
      </div>
    </div>,

    // Step 3: Delivery & terms
    <div key="step3" className="space-y-5">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
        <h3 className="font-semibold text-lg text-gray-800 mb-4">
          🚚 Delivery & Order Terms
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Delivery Type *
            </label>
            <div className="flex gap-3">
              {["delivery", "pickup"].map((type) => (
                <button
                  key={type}
                  onClick={() => handleChange("deliveryType", type as any)}
                  className={`flex-1 p-3 rounded-lg border-2 font-medium transition ${
                    answers.deliveryType === type
                      ? "border-green-500 bg-green-50 text-green-900"
                      : "border-gray-300 bg-white text-gray-700 hover:border-green-300"
                  }`}
                >
                  {type === "delivery" ? "🚗 Delivery" : "🏪 Pickup"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={answers.deliveryFeeApproved}
              onCheckedChange={(checked) =>
                handleChange("deliveryFeeApproved", checked)
              }
              id="deliveryFee"
            />
            <label
              htmlFor="deliveryFee"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Client approves potential delivery fee
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={answers.depositConfirmed}
              onCheckedChange={(checked) =>
                handleChange("depositConfirmed", checked)
              }
              id="deposit"
            />
            <label
              htmlFor="deposit"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Deposit confirmed
            </label>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              BEO/REO Number (for events)
            </label>
            <Input
              value={answers.venueRestrictions}
              onChange={(e) =>
                handleChange("venueRestrictions", e.target.value)
              }
              placeholder="e.g., BEO-2024-001 or REO-001"
              className="border-gray-300"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Venue Restrictions/Notes
            </label>
            <Input
              value={answers.storageNotes}
              onChange={(e) => handleChange("storageNotes", e.target.value)}
              placeholder="Any venue restrictions, setup requirements, etc..."
              className="border-gray-300"
            />
          </div>
        </div>
      </div>
    </div>,

    // Step 4: Review & submit
    <div key="step4" className="space-y-4">
      <h3 className="font-semibold text-lg text-gray-800 mb-4">
        ✅ Review Summary
      </h3>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Occasion:</span>
            <p className="font-semibold text-gray-900">{answers.occasion}</p>
          </div>
          <div>
            <span className="text-gray-600">Date:</span>
            <p className="font-semibold text-gray-900">{answers.eventDate}</p>
          </div>
          <div>
            <span className="text-gray-600">Guests:</span>
            <p className="font-semibold text-gray-900">{answers.guestCount}</p>
          </div>
          <div>
            <span className="text-gray-600">Shape:</span>
            <p className="font-semibold text-gray-900">
              {answers.customShape || answers.tiersShape}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Cake Type:</span>
            <p className="font-semibold text-gray-900">{answers.cakeType}</p>
          </div>
          <div>
            <span className="text-gray-600">Flavor:</span>
            <p className="font-semibold text-gray-900">
              {answers.flavors[0] || "Not selected"}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Icing:</span>
            <p className="font-semibold text-gray-900">
              {answers.cakeIcing || "Not selected"}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Tiers:</span>
            <p className="font-semibold text-gray-900">{answers.tierCount}</p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">Allergies:</span>
            <p className="font-semibold text-gray-900">
              {answers.allergies.length > 0
                ? answers.allergies.join(", ")
                : "None"}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">Delivery:</span>
            <p className="font-semibold text-gray-900">
              {answers.deliveryType}
            </p>
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-4 bg-gray-50 p-3 rounded">
        💾 Your intake data is auto-saved locally. You can continue editing and
        it will be preserved.
      </div>
    </div>,
  ];

  return (
    <Card className="w-full max-w-3xl mx-auto border-gray-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-lg">
        <CardTitle className="text-2xl">🍰 Cake Intake Prescreen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="flex gap-1 mb-6">
          {[0, 1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all ${
                s <= step
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="text-sm text-gray-600 mb-4">Step {step + 1} of 5</div>

        {sections[step]}

        <div className="flex justify-between gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
            className="border-gray-300"
          >
            ← Back
          </Button>
          {step === 4 ? (
            <>
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
              >
                Complete Intake ✓
              </Button>
            </>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white ml-auto"
            >
              Next →
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
