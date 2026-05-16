import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MENU_TEMPLATES, type MenuTemplate } from "@/data/menu-templates";
import type { DesignerElement } from "../hooks";

interface TemplateLibraryProps {
  onApplyTemplate: (elements: Omit<DesignerElement, "id">[]) => void;
}

type TemplateCategory = "modern" | "classic" | "minimal" | "luxury" | "playful" | "seasonal";

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  modern: "Modern",
  classic: "Classic",
  minimal: "Minimal",
  luxury: "Luxury",
  playful: "Playful",
  seasonal: "Seasonal",
};

export function TemplateLibrary({ onApplyTemplate }: TemplateLibraryProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MenuTemplate | null>(null);

  const categories = ["modern", "classic", "minimal", "luxury", "playful", "seasonal"] as const;
  const allCategories = ["all", ...categories] as const;

  const getTemplatesForCategory = (category: (typeof allCategories)[number]) => {
    if (category === "all") return MENU_TEMPLATES;
    return MENU_TEMPLATES.filter((t) => t.category === category);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Template Library</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Choose a template to get started quickly
        </p>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="text-xs">
            All
          </TabsTrigger>
          <TabsTrigger value="modern" className="text-xs">
            Modern
          </TabsTrigger>
          <TabsTrigger value="classic" className="text-xs">
            Classic
          </TabsTrigger>
          <TabsTrigger value="luxury" className="text-xs">
            Luxury
          </TabsTrigger>
          <TabsTrigger value="minimal" className="text-xs hidden sm:inline-flex">
            Minimal
          </TabsTrigger>
          <TabsTrigger value="playful" className="text-xs hidden sm:inline-flex">
            Playful
          </TabsTrigger>
          <TabsTrigger value="seasonal" className="text-xs hidden sm:inline-flex">
            Seasonal
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 mt-3">
          {allCategories.map((category) => (
            <TabsContent
              key={category}
              value={category}
              className="flex-1 grid grid-cols-1 gap-2 pr-4"
            >
              {getTemplatesForCategory(category).length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                  No templates in this category
                </p>
              ) : (
                getTemplatesForCategory(category).map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all select-none ${
                      selectedTemplate?.id === template.id
                        ? "ring-2 ring-[#c8a97e] bg-amber-50 dark:bg-neutral-950/30"
                        : "hover:shadow-md dark:hover:border-gray-600"
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3 space-y-3">
                      {/* Preview */}
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-md aspect-video flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {template.pageSize.width} × {template.pageSize.height}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {template.elements.length} elements
                          </p>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Category:</span>
                          <span className="font-medium">
                            {CATEGORY_LABELS[template.category]}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Size:</span>
                          <span className="font-medium">
                            {template.pageSize.width / 96}" × {template.pageSize.height / 96}"
                          </span>
                        </div>
                      </div>

                      {/* Apply Button */}
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyTemplate(template.elements);
                        }}
                        className="w-full h-8 text-xs bg-[#c8a97e] hover:bg-[#b8976c] dark:bg-[#b8976c] dark:hover:bg-[#c8a97e]-800"
                      >
                        Apply Template
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>

      {/* Selected Template Details */}
      {selectedTemplate && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <h4 className="text-xs font-semibold mb-2">{selectedTemplate.name}</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            {selectedTemplate.description}
          </p>
          <Button
            size="sm"
            onClick={() => onApplyTemplate(selectedTemplate.elements)}
            className="w-full bg-[#c8a97e] hover:bg-[#b8976c] dark:bg-[#b8976c] dark:hover:bg-[#c8a97e]-800"
          >
            Apply This Template
          </Button>
        </div>
      )}
    </div>
  );
}
