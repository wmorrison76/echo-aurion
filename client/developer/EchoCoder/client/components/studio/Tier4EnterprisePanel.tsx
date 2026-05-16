import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Image, Activity, Plus, Play, Pause, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export const Tier4EnterprisePanel: React.FC = () => {
  const [tests] = useState([
    { id: "1", name: "Homepage Hero", status: "running", progress: 65, winner: null },
    { id: "2", name: "CTA Button Color", status: "completed", progress: 100, winner: "Variant B" },
  ]);

  const [targetingRules] = useState([
    { id: "1", name: "VIP Users", audience: 250, active: true },
    { id: "2", name: "New Visitors", audience: 1200, active: true },
  ]);

  const [imageStats] = useState({
    total_optimized: 1250,
    total_saved: "2.4 GB",
    avg_compression: "42%",
  });

  const [predictions] = useState([
    { id: "1", content: "Blog Post A", views: 5200, confidence: 0.92, trend: "up" },
    { id: "2", content: "Product Page", views: 3100, confidence: 0.88, trend: "down" },
  ]);

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Advanced Features & Analytics</h2>
        <p className="text-sm text-muted-foreground">
          A/B testing, audience targeting, image optimization, and predictive analytics
        </p>
      </div>

      <Tabs defaultValue="abtesting" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="abtesting" className="flex gap-2">
            <TrendingUp className="w-4 h-4" />
            A/B Tests
          </TabsTrigger>
          <TabsTrigger value="targeting" className="flex gap-2">
            <Target className="w-4 h-4" />
            Targeting
          </TabsTrigger>
          <TabsTrigger value="images" className="flex gap-2">
            <Image className="w-4 h-4" />
            Images
          </TabsTrigger>
          <TabsTrigger value="predictive" className="flex gap-2">
            <Activity className="w-4 h-4" />
            Predictive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="abtesting" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">A/B Tests ({tests.length})</h3>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              New Test
            </Button>
          </div>
          <div className="grid gap-4">
            {tests.map((test) => (
              <Card key={test.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{test.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          Status: {test.status}
                        </p>
                      </div>
                      <span className="text-xs font-semibold bg-primary/10 px-2 py-1 rounded">
                        {test.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded h-2">
                      <div
                        className="bg-primary h-full rounded transition-all"
                        style={{ width: `${test.progress}%` }}
                      />
                    </div>
                    {test.winner && (
                      <p className="text-sm font-semibold text-green-600">
                        Winner: {test.winner}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {test.status === "running" ? (
                        <Button variant="outline" size="sm" className="gap-1">
                          <Pause className="w-3 h-3" />
                          Pause
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="gap-1">
                          <Play className="w-3 h-3" />
                          Restart
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="targeting" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Audience Rules ({targetingRules.length})</h3>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              New Rule
            </Button>
          </div>
          <div className="grid gap-3">
            {targetingRules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="font-semibold">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.audience.toLocaleString()} users targeted
                      </p>
                    </div>
                    <div className="text-right">
                      {rule.active && <span className="text-xs font-semibold text-green-600">Active</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="images" className="space-y-4 mt-4">
          <h3 className="font-semibold">Image Optimization</h3>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Optimized</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{imageStats.total_optimized.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">images</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Space Saved</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{imageStats.total_saved}</p>
                <p className="text-xs text-muted-foreground mt-1">storage</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Avg Compression</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{imageStats.avg_compression}</p>
                <p className="text-xs text-muted-foreground mt-1">reduction</p>
              </CardContent>
            </Card>
          </div>
          <Button className="w-full">Optimize All Images</Button>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4 mt-4">
          <h3 className="font-semibold">Predictive Analytics</h3>
          <div className="grid gap-3">
            {predictions.map((pred) => (
              <Card key={pred.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{pred.content}</p>
                        <p className="text-sm text-muted-foreground">
                          Predicted views: {pred.views.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {pred.trend === "up" ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <ArrowUp className="w-4 h-4" />
                            <span className="text-sm font-semibold">Trending</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600">
                            <ArrowDown className="w-4 h-4" />
                            <span className="text-sm font-semibold">Declining</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary rounded h-2">
                        <div
                          className="bg-blue-500 h-full rounded"
                          style={{ width: `${pred.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold">
                        {(pred.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Tier4EnterprisePanel;
