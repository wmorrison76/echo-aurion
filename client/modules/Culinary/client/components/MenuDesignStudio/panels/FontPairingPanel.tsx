import React, { useMemo, useState } from "react";
import { Zap, ArrowRight, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { FontPairingAI, vectorFontLibrary, type BrandIdentity } from "@/echo/vectorFonts";

interface FontPairingPanelProps {
  brand: BrandIdentity;
  currentHeadingFontId?: string;
  currentBodyFontId?: string;
  onApplyPairing: (headingId: string, bodyId: string, accentId?: string) => void;
}

export const FontPairingPanel: React.FC<FontPairingPanelProps> = ({
  brand,
  currentHeadingFontId,
  currentBodyFontId,
  onApplyPairing,
}) => {
  const [activeTab, setActiveTab] = useState("recommended");
  const [isLoadingImprovement, setIsLoadingImprovement] = useState(false);

  // Get recommendations
  const recommendations = useMemo(() => {
    return FontPairingAI.recommendPairings(brand).slice(0, 3);
  }, [brand]);

  // Get font suggestions for specific roles
  const headingFontSuggestions = useMemo(() => {
    return FontPairingAI.suggestFontsForRole("heading", brand, 5);
  }, [brand]);

  const bodyFontSuggestions = useMemo(() => {
    return FontPairingAI.suggestFontsForRole("body", brand, 5);
  }, [brand]);

  const accentFontSuggestions = useMemo(() => {
    return FontPairingAI.suggestFontsForRole("accent", brand, 3);
  }, [brand]);

  // Check current pairing compatibility
  const currentCompatibility = useMemo(() => {
    if (!currentHeadingFontId || !currentBodyFontId) return null;
    return FontPairingAI.analyzeCompatibility(currentHeadingFontId, currentBodyFontId);
  }, [currentHeadingFontId, currentBodyFontId]);

  // Get improvement suggestion if needed
  const improvementSuggestion = useMemo(() => {
    if (!currentHeadingFontId || !currentBodyFontId) return null;
    return FontPairingAI.suggestImprovement(
      currentHeadingFontId,
      currentBodyFontId,
      brand
    );
  }, [currentHeadingFontId, currentBodyFontId, brand]);

  const handleApplyPairing = (headingId: string, bodyId: string, accentId?: string) => {
    onApplyPairing(headingId, bodyId, accentId);
    toast({
      title: "Pairing Applied",
      description: "Font pairing has been updated",
    });
  };

  const handleImprove = async () => {
    setIsLoadingImprovement(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (improvementSuggestion) {
        handleApplyPairing(
          improvementSuggestion.headingFont.id,
          improvementSuggestion.bodyFont.id,
          improvementSuggestion.accentFont?.id
        );
      }
    } finally {
      setIsLoadingImprovement(false);
    }
  };

  const stats = FontPairingAI.getPairingStats();

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-6 p-4 pb-8">
        {/* Current Pairing Analysis */}
        {currentHeadingFontId && currentBodyFontId && (
          <Card className="border-blue-300/50 bg-blue-50 dark:bg-blue-950/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600" />
                Current Pairing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Heading + Body</p>
                  <p className="text-sm font-semibold">
                    {FontPairingAI.getFontById(currentHeadingFontId)?.name} +{" "}
                    {FontPairingAI.getFontById(currentBodyFontId)?.name}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-xs font-semibold ${
                    (currentCompatibility || 0) > 70
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-100"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-100"
                  }`}
                >
                  {Math.round(currentCompatibility || 0)}% Match
                </Badge>
              </div>

              {improvementSuggestion && (currentCompatibility || 0) < 80 && (
                <Button
                  size="sm"
                  onClick={handleImprove}
                  disabled={isLoadingImprovement}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 text-xs"
                >
                  {isLoadingImprovement ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Improving...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
                      Improve Pairing
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-background/80 border border-primary/30">
            <TabsTrigger value="recommended" className="text-xs">
              AI Picks
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs">
              By Role
            </TabsTrigger>
            <TabsTrigger value="trending" className="text-xs">
              Trending
            </TabsTrigger>
          </TabsList>

          {/* AI Recommendations */}
          <TabsContent value="recommended" className="space-y-3 mt-4">
            <div className="text-xs text-muted-foreground mb-3">
              Top AI-powered pairings for {brand.cuisine} {brand.mood}
            </div>

            {recommendations.map((pairing, idx) => (
              <Card
                key={`pairing-${pairing.headingFont.id}-${pairing.bodyFont.id}-${idx}`}
                className="border-primary/30 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground">
                        {pairing.headingFont.name}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <ArrowRight className="h-3 w-3" />
                        {pairing.bodyFont.name}
                      </p>
                      {pairing.accentFont && (
                        <p className="text-xs text-muted-foreground mt-1">
                          + {pairing.accentFont.name}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-primary/20 text-primary whitespace-nowrap"
                    >
                      {Math.round(pairing.confidence * 100)}%
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pairing.reason}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                      onClick={() =>
                        handleApplyPairing(
                          pairing.headingFont.id,
                          pairing.bodyFont.id,
                          pairing.accentFont?.id
                        )
                      }
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* By Role */}
          <TabsContent value="custom" className="space-y-4 mt-4">
            {/* Headings */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Heading Fonts
              </h3>
              <div className="space-y-2">
                {headingFontSuggestions.map((font) => (
                  <Card
                    key={font.id}
                    className="border-primary/30 hover:border-primary/50 cursor-pointer transition-all"
                    onClick={() => {
                      if (currentBodyFontId) {
                        handleApplyPairing(font.id, currentBodyFontId);
                      }
                    }}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{font.name}</p>
                        <p className="text-xs text-muted-foreground">{font.category}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {font.category}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Bodies */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Body Fonts
              </h3>
              <div className="space-y-2">
                {bodyFontSuggestions.map((font) => (
                  <Card
                    key={font.id}
                    className="border-primary/30 hover:border-primary/50 cursor-pointer transition-all"
                    onClick={() => {
                      if (currentHeadingFontId) {
                        handleApplyPairing(currentHeadingFontId, font.id);
                      }
                    }}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{font.name}</p>
                        <p className="text-xs text-muted-foreground">{font.category}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {font.category}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Accents */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                Accent Fonts
              </h3>
              <div className="space-y-2">
                {accentFontSuggestions.map((font) => (
                  <Card key={font.id} className="border-primary/30 hover:border-primary/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{font.name}</p>
                        <p className="text-xs text-muted-foreground">{font.category}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {font.category}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Trending */}
          <TabsContent value="trending" className="space-y-3 mt-4">
            {FontPairingAI.getTrendingPairings(5).map((pairing, idx) => (
              <Card
                key={idx}
                className="border-primary/30 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <h4 className="font-semibold text-sm">{pairing.headingFont.name}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        + {pairing.bodyFont.name}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      Popular
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() =>
                      handleApplyPairing(
                        pairing.headingFont.id,
                        pairing.bodyFont.id,
                        pairing.accentFont?.id
                      )
                    }
                  >
                    Apply
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Stats */}
        <Card className="border-primary/30 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Font Library Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Total Fonts</p>
                <p className="text-lg font-semibold text-primary">{stats.totalFonts}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pairings</p>
                <p className="text-lg font-semibold text-primary">{stats.totalPairings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default FontPairingPanel;
