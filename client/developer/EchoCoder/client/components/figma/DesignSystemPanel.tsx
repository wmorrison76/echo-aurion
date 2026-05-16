import { useEffect, useMemo, useState } from "react";
import { designSystemManager, type ComponentLibraryItem, type DesignToken, type DesignSystemVersion } from "@/services/DesignSystemManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Download, FileText, Layers3, History, Palette, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ComponentLibraryPanel from "./ComponentLibraryPanel";

const tokenCategories: DesignToken["category"][] = [
  "color",
  "typography",
  "spacing",
  "sizing",
  "border-radius",
  "shadow",
  "opacity",
];

const numericCategories = new Set<DesignToken["category"]>([
  "spacing",
  "sizing",
  "border-radius",
  "opacity",
]);

export default function DesignSystemPanel() {
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [components, setComponents] = useState<ComponentLibraryItem[]>([]);
  const [versions, setVersions] = useState<DesignSystemVersion[]>([]);
  const [stats, setStats] = useState(designSystemManager.getStatistics());
  const [tokenName, setTokenName] = useState("");
  const [tokenCategory, setTokenCategory] = useState<DesignToken["category"]>("color");
  const [tokenValue, setTokenValue] = useState("#3b82f6");
  const [tokenGroup, setTokenGroup] = useState("core");
  const [tokenDescription, setTokenDescription] = useState("");
  const [componentName, setComponentName] = useState("");
  const [componentDescription, setComponentDescription] = useState("");
  const [componentCategory, setComponentCategory] = useState("controls");
  const [releaseNotes, setReleaseNotes] = useState("Captured current design system state");

  const refresh = () => {
    setTokens(designSystemManager.getTokens());
    setComponents(designSystemManager.getComponents());
    setVersions(designSystemManager.getVersionHistory());
    setStats(designSystemManager.getStatistics());
  };

  useEffect(() => {
    refresh();

    const events = [
      "token-added",
      "token-updated",
      "token-deleted",
      "component-added",
      "component-updated",
      "component-deleted",
      "component-published",
      "component-unpublished",
      "version-created",
      "reverted-to-version",
      "imported",
    ];

    events.forEach((event) => designSystemManager.on(event, refresh));
    return () => {
      events.forEach((event) => designSystemManager.off(event, refresh));
    };
  }, []);

  const tokenGroups = useMemo(() => {
    return tokenCategories.map((category) => ({
      category,
      tokens: tokens.filter((token) => token.category === category),
    }));
  }, [tokens]);

  const handleAddToken = () => {
    if (!tokenName.trim() || !tokenValue.trim()) {
      toast({
        title: "Missing information",
        description: "Enter a token name and value",
        variant: "destructive",
      });
      return;
    }

    const parsedValue = numericCategories.has(tokenCategory)
      ? Number(tokenValue)
      : tokenValue.trim();

    designSystemManager.addToken({
      name: tokenName.trim(),
      category: tokenCategory,
      value: Number.isNaN(parsedValue as number) ? tokenValue.trim() : parsedValue,
      description: tokenDescription.trim() || undefined,
      group: tokenGroup.trim() || undefined,
    });

    setTokenName("");
    setTokenValue(tokenCategory === "color" ? "#3b82f6" : "");
    setTokenDescription("");
    toast({ title: "Token created", description: `${tokenName} was added to the design system` });
  };

  const handleAddComponent = () => {
    if (!componentName.trim()) {
      toast({
        title: "Missing information",
        description: "Enter a component name",
        variant: "destructive",
      });
      return;
    }

    designSystemManager.addComponent({
      name: componentName.trim(),
      description: componentDescription.trim() || `${componentName.trim()} component`,
      category: componentCategory.trim() || "general",
      mainComponentId: componentName.trim().toLowerCase().replace(/\s+/g, "-"),
      variants: [],
      documentation: componentDescription.trim() || undefined,
      published: false,
    });

    setComponentName("");
    setComponentDescription("");
    toast({
      title: "Component added",
      description: `${componentName} is now available in the library`,
    });
  };

  const handleCreateVersion = () => {
    const version = designSystemManager.createVersion(releaseNotes.trim() || "Design system snapshot", "EchoCoder");
    setReleaseNotes("Captured current design system state");
    toast({
      title: "Version created",
      description: `Saved design system snapshot ${version.version}`,
    });
  };

  const handleExport = (format: "json" | "css") => {
    const contents = format === "json" ? designSystemManager.exportAsJSON() : designSystemManager.exportTokensAsCSS();
    const blob = new Blob([contents], { type: format === "json" ? "application/json" : "text/css" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = format === "json" ? "design-system.json" : "design-system.css";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: `Design system exported as ${format.toUpperCase()}`,
    });
  };

  const handlePublishToggle = (component: ComponentLibraryItem) => {
    if (component.published) {
      designSystemManager.unpublishComponent(component.id);
      toast({ title: "Component unpublished", description: `${component.name} is now private` });
    } else {
      designSystemManager.publishComponent(component.id);
      toast({ title: "Component published", description: `${component.name} is now available in the library` });
    }
  };

  const handleRevert = (versionId: string) => {
    const success = designSystemManager.revertToVersion(versionId);
    if (!success) {
      toast({ title: "Revert failed", description: "That version could not be restored", variant: "destructive" });
      return;
    }

    toast({ title: "Version restored", description: "Design system was restored from history" });
  };

  return (
    <Card className="border border-primary/20 bg-background/75 backdrop-blur h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Design System
        </CardTitle>
        <CardDescription className="text-xs">
          Manage tokens, component publishing, and version snapshots.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-2 text-xs">
          <Badge variant="secondary" className="justify-center py-2">{stats.totalTokens} Tokens</Badge>
          <Badge variant="secondary" className="justify-center py-2">{stats.totalComponents} Components</Badge>
          <Badge variant="secondary" className="justify-center py-2">{stats.publishedComponents} Published</Badge>
          <Badge variant="secondary" className="justify-center py-2">{stats.versions} Versions</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleExport("json")}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("css")}>
            <FileText className="w-4 h-4 mr-2" />
            Export CSS
          </Button>
          <Button size="sm" variant="outline" onClick={handleCreateVersion}>
            <History className="w-4 h-4 mr-2" />
            Snapshot
          </Button>
        </div>

        <Tabs defaultValue="tokens" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tokens" className="text-xs">Tokens</TabsTrigger>
            <TabsTrigger value="components" className="text-xs">Components</TabsTrigger>
            <TabsTrigger value="versions" className="text-xs">Versions</TabsTrigger>
          </TabsList>

          <TabsContent value="tokens" className="flex-1 overflow-hidden pt-3 space-y-3">
            <div className="grid gap-3 lg:grid-cols-2">
              <Card className="border-primary/10 bg-background/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" />
                    Add Token
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input className="h-8 text-xs" value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="Primary / Body / Radius" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Category</Label>
                      <select
                        value={tokenCategory}
                        onChange={(e) => {
                          const next = e.target.value as DesignToken["category"];
                          setTokenCategory(next);
                          setTokenValue(numericCategories.has(next) ? "8" : next === "color" ? "#3b82f6" : "");
                        }}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {tokenCategories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Group</Label>
                      <Input className="h-8 text-xs" value={tokenGroup} onChange={(e) => setTokenGroup(e.target.value)} placeholder="core" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Value</Label>
                    <Input className="h-8 text-xs font-mono" value={tokenValue} onChange={(e) => setTokenValue(e.target.value)} placeholder={tokenCategory === "color" ? "#3b82f6" : "16"} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea className="min-h-20 text-xs resize-none" value={tokenDescription} onChange={(e) => setTokenDescription(e.target.value)} placeholder="Optional token notes" />
                  </div>
                  <Button className="w-full" onClick={handleAddToken}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Token
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary/10 bg-background/70 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Layers3 className="w-3.5 h-3.5" />
                    Token Library
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[420px] overflow-hidden pt-0">
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                      {tokenGroups.map(({ category, tokens: categoryTokens }) => (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                            <Badge variant="outline" className="text-[10px]">{categoryTokens.length}</Badge>
                          </div>
                          <div className="space-y-2">
                            {categoryTokens.length === 0 ? (
                              <div className="rounded-md border border-dashed border-primary/10 p-3 text-xs text-muted-foreground">
                                No tokens in this category yet.
                              </div>
                            ) : (
                              categoryTokens.map((token) => (
                                <div key={token.id} className="rounded-md border border-primary/10 p-3 text-xs space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium truncate">{token.name}</span>
                                    <Badge variant="secondary" className="text-[10px]">v{token.version}</Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <span className="font-mono truncate">{String(token.value)}</span>
                                    {token.category === "color" && (
                                      <span
                                        className="h-4 w-4 rounded border border-border"
                                        style={{ backgroundColor: String(token.value) }}
                                      />
                                    )}
                                  </div>
                                  {token.description ? <p className="text-[11px] text-muted-foreground">{token.description}</p> : null}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="components" className="flex-1 overflow-hidden pt-3">
            <div className="grid gap-3 lg:grid-cols-3 h-full">
              <Card className="border-primary/10 bg-background/70 lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" />
                    Add Component
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input className="h-8 text-xs" value={componentName} onChange={(e) => setComponentName(e.target.value)} placeholder="Button / Card / Input" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Input className="h-8 text-xs" value={componentCategory} onChange={(e) => setComponentCategory(e.target.value)} placeholder="controls" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea className="min-h-24 text-xs resize-none" value={componentDescription} onChange={(e) => setComponentDescription(e.target.value)} placeholder="Optional component notes" />
                  </div>
                  <Button className="w-full" onClick={handleAddComponent}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Component
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 h-full overflow-hidden">
                <ComponentLibraryPanel components={components} onTogglePublish={handlePublishToggle} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="versions" className="flex-1 overflow-hidden pt-3">
            <Card className="border-primary/10 bg-background/70 h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Version History
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden pt-0">
                <div className="space-y-3 h-full">
                  <div className="space-y-1">
                    <Label className="text-xs">Release Notes</Label>
                    <Textarea className="min-h-20 text-xs resize-none" value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} placeholder="What changed in this snapshot?" />
                  </div>
                  <Separator />
                  <ScrollArea className="h-[280px] pr-4">
                    <div className="space-y-2">
                      {versions.length === 0 ? (
                        <div className="rounded-md border border-dashed border-primary/10 p-4 text-xs text-muted-foreground">
                          No version snapshots yet.
                        </div>
                      ) : (
                        versions.map((version) => (
                          <div key={version.id} className="rounded-md border border-primary/10 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-semibold">{version.version}</p>
                                <p className="text-[11px] text-muted-foreground">{new Date(version.createdAt).toLocaleString()}</p>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">{version.tokens.length} tokens</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{version.releaseNotes}</p>
                            <Button size="sm" variant="outline" onClick={() => handleRevert(version.id)}>
                              Restore Version
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <div className="text-[11px] text-muted-foreground">
                    Last modified: {stats.lastModified ? new Date(stats.lastModified).toLocaleString() : "Never"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
