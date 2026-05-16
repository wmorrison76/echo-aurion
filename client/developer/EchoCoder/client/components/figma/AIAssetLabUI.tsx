import { useState, useEffect } from "react";
import {
  aiAssetLab,
  type AIAsset,
  type GenerationRequest,
} from "@/services/AIAssetLab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Download, Trash2, Zap, Search, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AIAssetLabUIProps {
  onAssetSelect?: (asset: AIAsset) => void;
}

export default function AIAssetLabUI({ onAssetSelect }: AIAssetLabUIProps) {
  const [assets, setAssets] = useState<AIAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AIAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [generationType, setGenerationType] = useState<
    | "icon"
    | "illustration"
    | "pattern"
    | "component"
    | "color-palette"
    | "typography"
  >("icon");
  const [stats, setStats] = useState(aiAssetLab.getStats());

  useEffect(() => {
    const loadAssets = () => {
      const all = aiAssetLab.getAssets();
      setAssets(all);
      filterAssets(all);
    };

    loadAssets();
    aiAssetLab.on("assetGenerated", loadAssets);
    aiAssetLab.on("assetUpdated", loadAssets);
    aiAssetLab.on("assetDeleted", loadAssets);

    return () => {
      aiAssetLab.off("assetGenerated", loadAssets);
      aiAssetLab.off("assetUpdated", loadAssets);
      aiAssetLab.off("assetDeleted", loadAssets);
    };
  }, []);

  useEffect(() => {
    filterAssets(assets);
  }, [searchQuery, selectedType, selectedTags]);

  const filterAssets = (all: AIAsset[]) => {
    let filtered = all;

    if (selectedType !== "all") {
      filtered = filtered.filter((a) => a.type === selectedType);
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((a) =>
        selectedTags.some((t) => a.tags.includes(t)),
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    setFilteredAssets(filtered);
  };

  const handleGenerateAsset = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const request: GenerationRequest = {
        prompt: prompt.trim(),
        type: generationType,
        style: "minimalist",
      };

      const result = await aiAssetLab.generateAsset(request);
      setAssets([...assets, result.asset]);
      setPrompt("");
      setStats(aiAssetLab.getStats());

      toast({
        title: "Success",
        description: `${result.asset.name} generated successfully!`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleFavorite = (id: string) => {
    aiAssetLab.toggleFavorite(id);
    setAssets([...assets]);
  };

  const handleDeleteAsset = (id: string) => {
    aiAssetLab.deleteAsset(id);
    setAssets(aiAssetLab.getAssets());
  };

  const handleSelectAsset = (asset: AIAsset) => {
    if (onAssetSelect) {
      onAssetSelect(asset);
    }
  };

  const allTags = aiAssetLab.getAllTags();

  return (
    <Card className="border border-primary/20 bg-background/75 backdrop-blur h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" />
          AI Asset Lab
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="generate" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="text-xs">
              Generate
            </TabsTrigger>
            <TabsTrigger value="library" className="text-xs">
              Library
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent
            value="generate"
            className="flex-1 overflow-y-auto space-y-4 pt-4"
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  What would you like to create?
                </Label>
                <Textarea
                  placeholder="e.g., A minimalist icon of a settings gear..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-20 text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={generationType}
                    onValueChange={(value: any) => setGenerationType(value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icon">Icon</SelectItem>
                      <SelectItem value="illustration">Illustration</SelectItem>
                      <SelectItem value="pattern">Pattern</SelectItem>
                      <SelectItem value="component">Component</SelectItem>
                      <SelectItem value="color-palette">
                        Color Palette
                      </SelectItem>
                      <SelectItem value="typography">Typography</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerateAsset}
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Asset
                  </>
                )}
              </Button>

              <Separator className="my-2" />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Recent Searches
                </p>
                <ScrollArea className="h-20 border border-primary/20 rounded p-2">
                  <div className="flex flex-wrap gap-1">
                    {aiAssetLab.getRecentSearches().map((search, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => setPrompt(search)}
                      >
                        {search.slice(0, 20)}...
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent
            value="library"
            className="flex-1 overflow-y-auto flex flex-col space-y-3 pt-4"
          >
            {/* Search & Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="icon">Icons</SelectItem>
                  <SelectItem value="illustration">Illustrations</SelectItem>
                  <SelectItem value="pattern">Patterns</SelectItem>
                  <SelectItem value="component">Components</SelectItem>
                  <SelectItem value="color-palette">Color Palettes</SelectItem>
                  <SelectItem value="typography">Typography</SelectItem>
                </SelectContent>
              </Select>

              {allTags.length > 0 && (
                <ScrollArea className="h-16 border border-primary/20 rounded p-2">
                  <div className="flex flex-wrap gap-1">
                    {allTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={
                          selectedTags.includes(tag) ? "default" : "outline"
                        }
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          setSelectedTags(
                            selectedTags.includes(tag)
                              ? selectedTags.filter((t) => t !== tag)
                              : [...selectedTags, tag],
                          );
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <Separator />

            {/* Asset Grid */}
            {filteredAssets.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-muted-foreground text-center">
                  No assets found
                </p>
              </div>
            ) : (
              <ScrollArea className="flex-1 -mr-4 pr-4">
                <div className="grid grid-cols-2 gap-2">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="border border-primary/20 rounded p-2 hover:border-primary/40 cursor-pointer transition-colors"
                      onClick={() => handleSelectAsset(asset)}
                    >
                      {/* Asset Preview */}
                      <div className="w-full aspect-square bg-secondary/50 rounded mb-2 flex items-center justify-center text-xs text-muted-foreground">
                        {asset.type === "color-palette" &&
                        asset.colorPalette ? (
                          <div className="flex gap-1 w-full h-full">
                            {asset.colorPalette.map((color, idx) => (
                              <div
                                key={idx}
                                className="flex-1"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        ) : asset.svgData ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: asset.svgData }}
                          />
                        ) : (
                          <span>{asset.type}</span>
                        )}
                      </div>

                      {/* Asset Info */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium truncate">
                          {asset.name}
                        </p>
                        <div className="flex items-center justify-between gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {asset.type}
                          </Badge>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(asset.id);
                            }}
                            className="p-0.5"
                          >
                            <Star
                              className={`w-3 h-3 ${
                                asset.favorite
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAsset(asset.id);
                            }}
                            className="p-0.5 hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Stats */}
            <Separator />
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">{stats.total}</p>
                <p>Assets</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {stats.favorites}
                </p>
                <p>Favorites</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {stats.totalUsage}
                </p>
                <p>Used</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
