import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const textures = {
  creamy: "Smooth, spreadable, low resistance – pudding, mashed potatoes.",
  crunchy: "Firm, breaks with pressure – apples, nuts, brittle.",
  gelatinous: "Wobbly, cohesive, slippery – aspic, spheres, jellies.",
  velvety: "Creamy with micro-smooth texture – ganache, hollandaise.",
  flaky: "Layered and delicate – croissants, phyllo.",
  airy: "Light, expanded volume – mousse, meringue.",
  chewy: "Elastic resistance – bagels, nougat, squid.",
  crispy: "Dry and audible break – tempura, chips, tuile.",
};

const texturePairings = {
  creamy: ["crunchy", "flaky", "acidic"],
  crunchy: ["smooth", "juicy", "tender"],
  gelatinous: ["acidic", "crisp", "sharp"],
  velvety: ["crunchy", "bitter", "herbaceous"],
  flaky: ["creamy", "fruit purée", "sweet glaze"],
  airy: ["dense", "sticky", "syrupy"],
  chewy: ["crisp", "juicy", "umami-rich"],
  crispy: ["soft", "unctuous", "aromatic"],
};

export default function TextureLabModule() {
  const [selectedTexture, setSelectedTexture] = useState("creamy");

  const texture = textures[selectedTexture];
  const pairing = texturePairings[selectedTexture] || [];

  return (
    <Card className="mt-4 rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-zinc-900">
      <CardContent className="p-4 space-y-4">
        <h2 className="text-xl font-semibold text-white">🧬 Texture Lab</h2>

        <Tabs value={selectedTexture} onValueChange={setSelectedTexture} className="w-full">
          <TabsList className="flex flex-wrap gap-2">
            {Object.keys(textures).map((type) => (
              <TabsTrigger key={type} value={type} className="capitalize">
                {type}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(textures).map(([type, description]) => (
            <TabsContent key={type} value={type} className="pt-4">
              <div className="space-y-2">
                <p className="text-slate-300 text-sm">{description}</p>
                <h4 className="text-sm font-medium text-purple-400">Suggested Pairings:</h4>
                <div className="flex flex-wrap gap-2">
                  {texturePairings[type]?.map((pair, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs capitalize">
                      {pair}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
