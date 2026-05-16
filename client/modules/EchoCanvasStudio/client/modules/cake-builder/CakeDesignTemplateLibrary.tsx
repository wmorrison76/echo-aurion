import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grid2x2, UtensilsCrossed } from "lucide-react";
import type { DesignData } from "./types";

interface TemplateDesign extends Partial<DesignData> {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
}

interface CakeDesignTemplateLibraryProps {
  onTemplateSelect: (design: Partial<DesignData>) => void;
}

const CAKE_TEMPLATES: TemplateDesign[] = [
  {
    id: "classic-wedding",
    name: "Classic Wedding",
    description: "Elegant 3-tier round cake with white frosting",
    shape: "round",
    tiers: [
      { diameter: 12, height: 4 },
      { diameter: 10, height: 4 },
      { diameter: 8, height: 4 },
    ],
    frosting: "Buttercream",
    color: "#ffffff",
    fillings: ["Vanilla Buttercream"],
    decorations: [],
    guests: 150,
  },
  {
    id: "modern-square",
    name: "Modern Square",
    description: "Sleek 2-tier square cake with chocolate frosting",
    shape: "square",
    tiers: [
      { diameter: 10, height: 4 },
      { diameter: 8, height: 4 },
    ],
    frosting: "Ganache",
    color: "#3d2817",
    fillings: ["Chocolate Mousse"],
    decorations: [],
    guests: 80,
  },
  {
    id: "romantic-rose",
    name: "Romantic Rose",
    description: "Pink 3-tier cake with rose-inspired decorations",
    shape: "round",
    tiers: [
      { diameter: 10, height: 3.5 },
      { diameter: 8, height: 3.5 },
      { diameter: 6, height: 3.5 },
    ],
    frosting: "Buttercream",
    color: "#ffc0cb",
    fillings: ["Raspberry Jam"],
    decorations: [],
    guests: 100,
  },
  {
    id: "bold-black",
    name: "Bold & Black",
    description: "Sophisticated 2-tier black and white design",
    shape: "square",
    tiers: [
      { diameter: 12, height: 4 },
      { diameter: 8, height: 4 },
    ],
    frosting: "Fondant",
    color: "#000000",
    fillings: ["Vanilla Bean"],
    decorations: [],
    guests: 120,
  },
  {
    id: "tropical-vibes",
    name: "Tropical Vibes",
    description: "Bright tropical 2-tier round cake with gold accents",
    shape: "round",
    tiers: [
      { diameter: 10, height: 4 },
      { diameter: 8, height: 4 },
    ],
    frosting: "Buttercream",
    color: "#FFD700",
    fillings: ["Mango Passion Fruit"],
    decorations: [],
    guests: 90,
  },
  {
    id: "simple-sheet",
    name: "Simple Sheet",
    description: "Classic sheet cake perfect for casual gatherings",
    shape: "sheet",
    tiers: [{ diameter: 1, height: 4 }],
    frosting: "Buttercream",
    color: "#d4a373",
    fillings: ["Chocolate"],
    decorations: [],
    guests: 30,
  },
  {
    id: "luxe-gold",
    name: "Luxe Gold",
    description: "Premium 3-tier gold and white wedding cake",
    shape: "round",
    tiers: [
      { diameter: 12, height: 4 },
      { diameter: 10, height: 4 },
      { diameter: 8, height: 4 },
    ],
    frosting: "Cream Cheese",
    color: "#daa520",
    fillings: ["Lemon Curd"],
    decorations: [],
    guests: 150,
  },
  {
    id: "vintage-charm",
    name: "Vintage Charm",
    description: "Rustic 3-tier cake with cream cheese frosting",
    shape: "round",
    tiers: [
      { diameter: 10, height: 4 },
      { diameter: 8, height: 4 },
      { diameter: 6, height: 4 },
    ],
    frosting: "Cream Cheese",
    color: "#f5deb3",
    fillings: ["Red Velvet"],
    decorations: [],
    guests: 80,
  },
];

export default function CakeDesignTemplateLibrary({
  onTemplateSelect,
}: CakeDesignTemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", label: "All Templates" },
    { id: "wedding", label: "Wedding" },
    { id: "casual", label: "Casual" },
    { id: "modern", label: "Modern" },
  ];

  const getTemplateColor = (template: TemplateDesign): string => {
    switch (template.color) {
      case "#ffffff":
        return "bg-white";
      case "#3d2817":
        return "bg-amber-900";
      case "#ffc0cb":
        return "bg-pink-300";
      case "#000000":
        return "bg-black";
      case "#FFD700":
        return "bg-yellow-400";
      case "#daa520":
        return "bg-yellow-600";
      case "#f5deb3":
        return "bg-yellow-100";
      default:
        return "bg-gradient-to-b from-yellow-100 to-orange-200";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Grid2x2 size={20} />
          Cake Design Templates
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose from professionally designed cake templates to get started
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500"
                : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-500"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CAKE_TEMPLATES.map((template) => (
          <Card
            key={template.id}
            className="hover:border-cyan-500 transition-colors cursor-pointer group"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <UtensilsCrossed
                  size={16}
                  className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {template.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Visual Preview */}
              <div className="flex items-end justify-center gap-2 h-24 bg-gray-900 rounded-lg p-4">
                {template.tiers && template.tiers.length > 0 ? (
                  template.tiers
                    .slice()
                    .reverse()
                    .map((tier, idx) => (
                      <div
                        key={idx}
                        className={`${getTemplateColor(template)} rounded-t-lg shadow-lg`}
                        style={{
                          width: `${Math.max(30, (template.tiers![idx].diameter || 6) * 4)}px`,
                          height: `${(template.tiers![idx].height || 4) * 4}px`,
                          opacity: 0.8,
                        }}
                      />
                    ))
                ) : (
                  <div className="text-xs text-gray-500">No tiers</div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Shape:</span>
                  <span className="capitalize font-medium">
                    {template.shape || "round"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tiers:</span>
                  <span className="font-medium">
                    {template.tiers?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Servings:</span>
                  <span className="font-medium">{template.guests || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Frosting:</span>
                  <span className="font-medium">{template.frosting}</span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={() => {
                  const design: Partial<DesignData> = {
                    shape: template.shape,
                    tiers: template.tiers,
                    frosting: template.frosting,
                    color: template.color,
                    fillings: template.fillings,
                    guests: template.guests,
                    decorations: template.decorations,
                  };
                  onTemplateSelect(design);
                }}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                size="sm"
              >
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
