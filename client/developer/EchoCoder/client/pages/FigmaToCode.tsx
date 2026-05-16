import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResponsiveContainer,
  ResponsiveGrid,
  useBreakpoint,
} from "@/components/layout";
import {
  Loader2,
  Copy,
  Download,
  Zap,
  Image as ImageIcon,
  FileJson,
  Type,
  Wand2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { figmaToCodeService } from "@/services/figmaToCodeService";
import { toast } from "@/hooks/use-toast";

type ConversionMethod = "json" | "description" | "image";
type OutputFormat = "react" | "html" | "tailwind";
type ComponentScope = "basic" | "advanced" | "full";

export default function FigmaToCode() {
  const [activeMethod, setActiveMethod] =
    useState<ConversionMethod>("description");
  const [input, setInput] = useState("");
  const [outputFormats, setOutputFormats] = useState<OutputFormat[]>(["react"]);
  const [componentScope, setComponentScope] =
    useState<ComponentScope>("advanced");
  const [generatedCode, setGeneratedCode] = useState<
    string | Record<string, string> | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  const methodOptions = [
    {
      id: "description",
      label: "Text",
      description: "Describe design",
      icon: Type,
    },
    { id: "json", label: "JSON", description: "Figma JSON", icon: FileJson },
    {
      id: "image",
      label: "Image",
      description: "Upload design",
      icon: ImageIcon,
    },
  ] as const;

  const handleConvert = async (allFormats: boolean = false) => {
    if (!input.trim()) {
      toast({
        title: "Error",
        description: "Please provide input",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let result;
      if (allFormats) {
        result = await figmaToCodeService.convertAllFormats(
          input,
          activeMethod,
          componentScope,
        );
      } else {
        switch (activeMethod) {
          case "json":
            result = await figmaToCodeService.convertFromJSON(
              input,
              outputFormats,
              componentScope,
            );
            break;
          case "description":
            result = await figmaToCodeService.convertFromDescription(
              input,
              outputFormats,
              componentScope,
            );
            break;
          case "image":
            result = await figmaToCodeService.convertFromImage(
              input,
              outputFormats,
              componentScope,
            );
            break;
        }
      }

      if (result.success && result.code) {
        setGeneratedCode(result.code);
        toast({
          title: "Success",
          description: "Code generated successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Conversion failed",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Conversion failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!input.trim()) {
      toast({
        title: "Error",
        description: "Please provide input",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    try {
      const result = await figmaToCodeService.analyzeDesign(
        input,
        activeMethod,
      );
      if (result.success) {
        setAnalysis(result.analysis);
        toast({
          title: "Analysis Complete",
          description: "Design analysis ready",
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Analysis failed",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Analysis failed",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setInput(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Code copied to clipboard" });
  };

  const downloadCode = (text: string, format: string) => {
    const extension =
      format === "react" ? "tsx" : format === "html" ? "html" : "jsx";
    const filename = `generated-component.${extension}`;
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`,
    );
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({ title: "Downloaded", description: `${filename} downloaded` });
  };

  return (
    <ResponsiveContainer className="py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="space-y-2 sm:space-y-4">
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Figma to Code
          </h1>
          <p className="text-xs sm:text-lg text-muted-foreground max-w-2xl">
            Convert Figma designs to production-ready React, HTML, and Tailwind CSS code
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-3">
          {/* Input Section */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Input Method */}
            <Card className="border border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                  Input Method
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Choose how to provide your design
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs
                  value={activeMethod}
                  onValueChange={(v) => setActiveMethod(v as ConversionMethod)}
                  className="w-full"
                >
                  <TabsList className={`w-full grid gap-1 ${
                    isMobile ? "grid-cols-3" : "grid-cols-3"
                  }`}>
                    {methodOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <TabsTrigger
                          key={option.id}
                          value={option.id}
                          className="flex items-center gap-1 text-xs sm:text-sm"
                        >
                          <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">{option.label}</span>
                          <span className="inline sm:hidden">{option.label[0]}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {/* Description Tab */}
                  <TabsContent value="description" className="space-y-3 mt-4">
                    <Textarea
                      placeholder="Describe your design (e.g., 'A hero section with blue button...')"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="h-32 sm:h-40 text-xs sm:text-sm resize-none"
                      aria-label="Design description"
                    />
                  </TabsContent>

                  {/* JSON Tab */}
                  <TabsContent value="json" className="space-y-3 mt-4">
                    <Textarea
                      placeholder='Paste Figma JSON export here...'
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="h-32 sm:h-40 font-mono text-xs sm:text-sm resize-none"
                      aria-label="Figma JSON"
                    />
                  </TabsContent>

                  {/* Image Tab */}
                  <TabsContent value="image" className="space-y-3 mt-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="text-xs sm:text-sm"
                      aria-label="Upload design image"
                    />
                    {input && (
                      <img
                        src={input}
                        alt="Design preview"
                        className="w-full h-32 sm:h-40 object-cover rounded border"
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Output Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Output Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Formats */}
                <div>
                  <label className="text-xs sm:text-sm font-medium block mb-2">
                    Output Formats
                  </label>
                  <div className="space-y-2">
                    {(["react", "html", "tailwind"] as OutputFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() =>
                          setOutputFormats((prev) =>
                            prev.includes(fmt)
                              ? prev.filter((f) => f !== fmt)
                              : [...prev, fmt],
                          )
                        }
                        className={`w-full text-left p-2 sm:p-3 rounded border text-xs sm:text-sm transition ${
                          outputFormats.includes(fmt)
                            ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{fmt}</span>
                          {outputFormats.includes(fmt) && (
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Component Scope */}
                <div>
                  <label className="text-xs sm:text-sm font-medium block mb-2">
                    Component Scope
                  </label>
                  <div className="space-y-2">
                    {(["basic", "advanced", "full"] as ComponentScope[]).map((scope) => (
                      <button
                        key={scope}
                        onClick={() => setComponentScope(scope)}
                        className={`w-full text-left p-2 sm:p-3 rounded border text-xs sm:text-sm transition ${
                          componentScope === scope
                            ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{scope}</span>
                          {componentScope === scope && (
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2 sm:space-y-3">
              <Button
                onClick={() => handleConvert(false)}
                disabled={loading || !input.trim()}
                className="w-full text-xs sm:text-sm"
                size={isMobile ? "sm" : "default"}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Convert
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleConvert(true)}
                disabled={loading || !input.trim()}
                variant="outline"
                className="w-full text-xs sm:text-sm"
                size={isMobile ? "sm" : "default"}
              >
                <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                All Formats
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !input.trim()}
                variant="outline"
                className="w-full text-xs sm:text-sm"
                size={isMobile ? "sm" : "default"}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Output Section */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Generated Code */}
            {generatedCode && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle className="text-base sm:text-lg">Generated Code</CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        Production-ready component code
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 sm:gap-2">
                      {typeof generatedCode === "string" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(generatedCode as string)}
                            className="h-8 text-xs sm:text-sm"
                          >
                            <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline ml-1">Copy</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              downloadCode(
                                generatedCode as string,
                                outputFormats[0],
                              )
                            }
                            className="h-8 text-xs sm:text-sm"
                          >
                            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline ml-1">Download</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {typeof generatedCode === "string" ? (
                    <ScrollArea className="h-64 sm:h-96 border rounded p-3 sm:p-4">
                      <pre className="text-xs sm:text-sm font-mono break-words whitespace-pre-wrap">
                        {generatedCode}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(generatedCode).map(([format, code]) => (
                        <div key={format}>
                          <div className="flex items-center justify-between mb-2">
                            <Badge>{format}</Badge>
                            <div className="flex gap-1 sm:gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(code)}
                                className="h-7 px-2 text-xs"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadCode(code, format)}
                                className="h-7 px-2 text-xs"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <ScrollArea className="h-40 border rounded p-3 bg-muted/30">
                            <pre className="text-xs font-mono break-words whitespace-pre-wrap">
                              {code}
                            </pre>
                          </ScrollArea>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Analysis Results */}
            {analysis && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Design Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ResponsiveGrid 
                    cols={{ xs: 1, sm: 2, md: 3, lg: 3 }} 
                    gap="md"
                  >
                    {analysis.components && (
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Components</p>
                        <p className="text-lg sm:text-2xl font-bold">
                          {analysis.components.length}
                        </p>
                      </div>
                    )}
                    {analysis.layers && (
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Layers</p>
                        <p className="text-lg sm:text-2xl font-bold">
                          {analysis.layers.length}
                        </p>
                      </div>
                    )}
                    {analysis.complexity && (
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Complexity</p>
                        <p className="text-lg sm:text-2xl font-bold capitalize">
                          {analysis.complexity}
                        </p>
                      </div>
                    )}
                  </ResponsiveGrid>

                  {analysis.recommendations && (
                    <div className="space-y-2 pt-4 border-t">
                      <p className="text-xs sm:text-sm font-medium">Recommendations:</p>
                      <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                        {analysis.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!generatedCode && !analysis && (
              <Card className="flex items-center justify-center p-8 sm:p-12 text-center">
                <div>
                  <Wand2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm sm:text-base font-medium">No code generated yet</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Use the input methods on the left to convert your design
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
}
