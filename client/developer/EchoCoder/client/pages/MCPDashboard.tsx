import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, AlertCircle, Settings, DollarSign, Zap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface MCP {
  id: string;
  name: string;
  status: string;
  tier: string;
  cost: string;
  features: string[];
  configured: boolean;
}

export default function MCPDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [allMCPs, setAllMCPs] = useState<MCP[]>([]);
  const [activeMCPs, setActiveMCPs] = useState<MCP[]>([]);
  const [selectedMCP, setSelectedMCP] = useState<MCP | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [pricingData, setPricingData] = useState<any>(null);

  useEffect(() => {
    loadMCPs();
  }, []);

  const loadMCPs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/mcp/list");
      const data = await res.json();
      setAllMCPs(data);

      const active = data.filter((m: MCP) => m.configured);
      setActiveMCPs(active);

      // Load pricing
      const pricingRes = await fetch("/api/mcp/pricing");
      const pricing = await pricingRes.json();
      setPricingData(pricing);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureMCP = async (mcp: MCP) => {
    if (!apiKey.trim()) {
      toast({ title: "Error", description: "Please enter an API key" });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/mcp/configure/${mcp.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!res.ok) throw new Error("Configuration failed");
      toast({ title: "Success", description: `${mcp.name} configured` });
      setApiKey("");
      setSelectedMCP(null);
      loadMCPs();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoInitialize = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/mcp/auto-initialize", { method: "POST" });
      const data = await res.json();
      toast({ title: "Success", description: data.message });
      loadMCPs();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading && allMCPs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8" /> MCP Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Manage integrations and connect to external services
          </p>
        </div>
        <Button onClick={handleAutoInitialize} disabled={loading} className="gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Auto-Initialize
        </Button>
      </div>

      {/* Active MCPs Summary */}
      {activeMCPs.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Active MCPs ({activeMCPs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activeMCPs.map((mcp) => (
                <Badge key={mcp.id} className="bg-green-600 hover:bg-green-700">
                  {mcp.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Comparison */}
      {pricingData && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Cost Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Builder.io */}
              <div className="space-y-3 p-4 rounded-lg border border-orange-200 bg-orange-50">
                <h3 className="font-bold text-lg">Builder.io</h3>
                <div className="text-2xl font-bold text-orange-600">
                  {pricingData.builderIO.totalEstimate}
                </div>
                <ul className="space-y-1 text-sm">
                  {pricingData.builderIO.features.map((f: string, i: number) => (
                    <li key={i} className="flex gap-2">
                      <span>•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* EchoCoder */}
              <div className="space-y-3 p-4 rounded-lg border border-green-200 bg-green-50">
                <h3 className="font-bold text-lg">EchoCoder</h3>
                <div className="text-2xl font-bold text-green-600">
                  {pricingData.echoCoder.totalEstimate}
                </div>
                <ul className="space-y-1 text-sm">
                  {pricingData.echoCoder.features.map((f: string, i: number) => (
                    <li key={i} className="flex gap-2">
                      <span>✅</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900">
                💰 {pricingData.savings}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MCP Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All MCPs ({allMCPs.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeMCPs.length})</TabsTrigger>
          <TabsTrigger value="available">
            Available ({allMCPs.length - activeMCPs.length})
          </TabsTrigger>
        </TabsList>

        {/* All MCPs */}
        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allMCPs.map((mcp) => (
              <Card key={mcp.id} className={mcp.configured ? "border-green-200" : "border-gray-200"}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {mcp.configured ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-gray-400" />
                        )}
                        {mcp.name}
                      </CardTitle>
                      <CardDescription className="mt-2">{mcp.cost}</CardDescription>
                    </div>
                    <Badge
                      variant={mcp.configured ? "default" : "outline"}
                      className={
                        mcp.configured ? "bg-green-600" : "bg-gray-100 text-gray-700"
                      }
                    >
                      {mcp.configured ? "Active" : "Setup"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold mb-2">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {mcp.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {!mcp.configured && (
                    <Button
                      onClick={() => setSelectedMCP(mcp)}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <Settings className="h-4 w-4" /> Configure
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Active MCPs */}
        <TabsContent value="active" className="space-y-4">
          {activeMCPs.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-gray-500">No MCPs configured yet. Click "Configure" on any MCP.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMCPs.map((mcp) => (
                <Card key={mcp.id} className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      {mcp.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Tier:</strong> {mcp.tier}</p>
                      <p className="text-sm"><strong>Cost:</strong> {mcp.cost}</p>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {mcp.features.map((f, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Available MCPs */}
        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allMCPs
              .filter((mcp) => !mcp.configured)
              .map((mcp) => (
                <Card key={mcp.id}>
                  <CardHeader>
                    <CardTitle>{mcp.name}</CardTitle>
                    <CardDescription>{mcp.cost}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold mb-2">Features:</p>
                      <div className="flex flex-wrap gap-1">
                        {mcp.features.map((f, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={() => setSelectedMCP(mcp)}
                      className="w-full gap-2"
                    >
                      <Settings className="h-4 w-4" /> Configure
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Configuration Modal */}
      {selectedMCP && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Configure {selectedMCP.name}</CardTitle>
              <CardDescription>
                Enter your {selectedMCP.name} API key to enable integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">API Key</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter ${selectedMCP.name} API key`}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Your API key is stored securely and never shared.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMCP(null);
                    setApiKey("");
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleConfigureMCP(selectedMCP)}
                  disabled={loading || !apiKey}
                  className="gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
