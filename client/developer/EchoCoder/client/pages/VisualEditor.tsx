import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  useBreakpoint,
} from "@/components/layout";
import {
  Loader2,
  Copy,
  Download,
  Eye,
  Code,
  Smartphone,
  Tablet,
  Monitor,
  Zap,
  Settings,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ComponentProperty {
  name: string;
  type: "string" | "number" | "boolean" | "select";
  value: any;
  options?: string[];
}

interface SelectedElement {
  id: string;
  tag: string;
  properties: ComponentProperty[];
}

export default function VisualEditor() {
  const [code, setCode] = useState<string>(`
import React, { useState } from 'react';

export default function Component() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Visual Editor
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Edit code on the left, see live preview on the right
        </p>
        <button
          onClick={() => setCount(count + 1)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Click me ({count})
        </button>
      </div>
    </div>
  );
}
`);

  const [preview, setPreview] = useState("");
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  useEffect(() => {
    // Simulate preview rendering
    setPreview("Preview rendering...");
    const timer = setTimeout(() => {
      setPreview("Component preview loaded successfully");
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Success",
      description: "Code copied to clipboard",
    });
  };

  const handleDownloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "component.tsx";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({
      title: "Success",
      description: "Code downloaded",
    });
  };

  const getPreviewWidth = () => {
    switch (viewMode) {
      case "mobile":
        return "max-w-sm";
      case "tablet":
        return "max-w-2xl";
      default:
        return "w-full";
    }
  };

  return (
    <ResponsiveContainer className="py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Code className="h-6 w-6 sm:h-8 sm:w-8" />
              <span>Visual Editor</span>
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-2">
              Write code and see live preview
            </p>
          </div>
        </div>

        {/* Editor & Preview Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Code Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold">Code</h2>
              <div className="flex gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-8 text-xs"
                >
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadCode}
                  className="h-8 text-xs"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
            <Card className="overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-64 sm:h-96 font-mono text-xs sm:text-sm bg-muted border-0 rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Write your React component code here..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold">Preview</h2>
              <div className="flex gap-1 sm:gap-2">
                <Button
                  variant={viewMode === "mobile" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("mobile")}
                  className="h-8 px-2 text-xs"
                  aria-label="Mobile view"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "tablet" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("tablet")}
                  className="h-8 px-2 text-xs"
                  aria-label="Tablet view"
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "desktop" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("desktop")}
                  className="h-8 px-2 text-xs"
                  aria-label="Desktop view"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Card className="overflow-hidden">
              <CardContent className={`p-3 sm:p-4 h-64 sm:h-96 flex items-center justify-center ${getPreviewWidth()} mx-auto`}>
                <div className="text-center text-muted-foreground text-xs sm:text-sm">
                  {preview || "Loading preview..."}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Inspector Panel (mobile-friendly) */}
        {!isMobile && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Inspector
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Select an element in the preview to edit its properties
              </div>
              {selectedElement && (
                <div className="space-y-2 p-3 border rounded-lg">
                  <p className="text-xs font-medium">
                    &lt;{selectedElement.tag}&gt;
                  </p>
                  {selectedElement.properties.map((prop) => (
                    <div key={prop.name}>
                      <label className="text-xs font-medium">{prop.name}</label>
                      <Input
                        type={prop.type === "number" ? "number" : "text"}
                        value={prop.value}
                        className="mt-1 text-xs h-8"
                        disabled
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ResponsiveContainer>
  );
}
