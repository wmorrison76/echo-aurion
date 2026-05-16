import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DALLECakePreview from "./DALLECakePreview";
import { DesignData, IntakeAnswers } from "./types";
import { priceEstimate, estimateServings } from "./logic";

interface OrderSummaryProps {
  design: DesignData;
  intakeAnswers: IntakeAnswers;
  onComplete: (design: DesignData) => void;
  onBack: () => void;
}

export default function OrderSummary({
  design,
  intakeAnswers,
  onComplete,
  onBack,
}: OrderSummaryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pricing = priceEstimate(design);
  const servings = estimateServings(design.tiers, design.shape);

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/save-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design,
          intakeAnswers,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        onComplete(design);
      } else {
        alert("Failed to save order. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("Failed to save order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="container mx-auto py-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Step 3: Order Summary</h2>
            <p className="text-gray-600 text-sm mt-1">
              Review your order details and confirm.
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#1a1a2e",
              border: "2px solid #00f0ff",
              borderRadius: "8px",
              padding: "12px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
              Total Price
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#00f0ff",
              }}
            >
              ${pricing.total}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Preview + Design Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview Card */}
            <div>
              <DALLECakePreview design={design} width={400} height={450} />
            </div>

            {/* Design Details */}
            <Tabs defaultValue="design" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="design">Design Details</TabsTrigger>
                <TabsTrigger value="breakdown">Pricing Breakdown</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              {/* Design Details Tab */}
              <TabsContent value="design" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cake Specifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-600">Shape</p>
                        <p className="font-semibold capitalize">
                          {design.shape}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Number of Tiers</p>
                        <p className="font-semibold">{design.tiers.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Base Flavor</p>
                        <p className="font-semibold">{design.baseFlavor}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Frosting</p>
                        <p className="font-semibold">{design.frosting}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Servings</p>
                        <p className="font-semibold">{servings}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Frosting Texture</p>
                        <p className="font-semibold capitalize">
                          {design.frostingTexture}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Fillings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {design.fillings.map((filling, idx) => (
                        <li key={idx} className="flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 mr-2"></span>
                          {filling}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tier Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {design.tiers.map((tier, idx) => (
                      <div
                        key={idx}
                        className="border-l-4 border-cyan-500 pl-3 py-2"
                      >
                        <p className="font-semibold">Tier {idx + 1}</p>
                        <p className="text-gray-600">
                          {design.shape === "sheet"
                            ? `${tier.width || 0}" × ${tier.depth || 0}"`
                            : `${tier.diameter || 0}" diameter`}
                          {" × "}
                          {tier.height}"H
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Pricing Breakdown Tab */}
              <TabsContent value="breakdown" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Price Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span>Base Cake</span>
                      <span className="font-semibold">
                        ${pricing.basePrice}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Decorations</span>
                      <span className="font-semibold">
                        ${pricing.decorations}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Cake Stand</span>
                      <span className="font-semibold">${pricing.stand}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Complexity</span>
                      <span className="font-semibold">
                        ${pricing.complexity}
                      </span>
                    </div>
                    <div className="flex justify-between bg-gray-100 p-3 rounded-lg mt-4">
                      <span className="font-bold">Total</span>
                      <span className="font-bold text-cyan-500 text-lg">
                        ${pricing.total}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {intakeAnswers.eventDate && (
                      <div className="border-l-4 border-cyan-500 pl-3 py-2">
                        <p className="font-semibold">Event Date</p>
                        <p className="text-gray-600">
                          {new Date(
                            intakeAnswers.eventDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {intakeAnswers.deliveryTime && (
                      <div className="border-l-4 border-cyan-500 pl-3 py-2">
                        <p className="font-semibold">Delivery Time</p>
                        <p className="text-gray-600">
                          {intakeAnswers.deliveryTime}
                        </p>
                      </div>
                    )}
                    <div className="border-l-4 border-cyan-500 pl-3 py-2">
                      <p className="font-semibold">Delivery Type</p>
                      <p className="text-gray-600 capitalize">
                        {intakeAnswers.deliveryType}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Client Information */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Occasion</p>
                  <p className="font-semibold">{intakeAnswers.occasion}</p>
                </div>
                <div>
                  <p className="text-gray-600">Guest Count</p>
                  <p className="font-semibold">{intakeAnswers.guestCount}</p>
                </div>
                {intakeAnswers.eventDate && (
                  <div>
                    <p className="text-gray-600">Event Date</p>
                    <p className="font-semibold">
                      {new Date(intakeAnswers.eventDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">Delivery Type</p>
                  <p className="font-semibold capitalize">
                    {intakeAnswers.deliveryType}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Dietary & Allergen Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {intakeAnswers.allergies.length > 0 && (
                  <div>
                    <p className="text-gray-600 mb-1">Allergies</p>
                    <div className="flex flex-wrap gap-1">
                      {intakeAnswers.allergies.map((allergy, idx) => (
                        <span
                          key={idx}
                          className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs"
                        >
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {intakeAnswers.dietaryPreferences.length > 0 && (
                  <div>
                    <p className="text-gray-600 mb-1">Dietary Preferences</p>
                    <div className="flex flex-wrap gap-1">
                      {intakeAnswers.dietaryPreferences.map(
                        (pref, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                          >
                            {pref}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Design Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Theme</p>
                  <p className="font-semibold capitalize">
                    {intakeAnswers.designComplexity}
                  </p>
                </div>
                {intakeAnswers.themeNotes && (
                  <div>
                    <p className="text-gray-600">Notes</p>
                    <p className="font-semibold">{intakeAnswers.themeNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-8 gap-4">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            Back to Design
          </Button>
          <Button
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {isSubmitting ? "Submitting..." : "Confirm & Submit Order"}
          </Button>
        </div>
      </div>
    </div>
  );
}
