import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  ResponsiveGrid,
  useBreakpoint,
} from "@/components/layout";
import { useI18n } from "@/i18n";
import {
  Clock,
  Code,
  FileText,
  BarChart3,
  Trash2,
  RefreshCw,
  Plus,
  Play,
  Save,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Memory {
  id: string;
  type: "generation" | "note" | "session";
  title: string;
  description: string;
  timestamp: number;
  content?: string;
  metadata?: Record<string, any>;
}

export default function Sandbox() {
  const { t } = useI18n();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("dev_memories");
      if (stored) {
        const parsed = JSON.parse(stored);
        setMemories(Array.isArray(parsed) ? parsed : []);
      } else {
        setMemories([]);
      }
    } catch (error) {
      console.error("Error loading memories:", error);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  const saveMemory = (memory: Memory) => {
    const updated = [memory, ...memories];
    setMemories(updated);
    localStorage.setItem("dev_memories", JSON.stringify(updated));
    toast({
      title: "Success",
      description: "Memory saved",
    });
  };

  const deleteMemory = (id: string) => {
    const updated = memories.filter((m) => m.id !== id);
    setMemories(updated);
    localStorage.setItem("dev_memories", JSON.stringify(updated));
    toast({
      title: "Success",
      description: "Memory deleted",
    });
  };

  const clearAllMemories = () => {
    if (window.confirm("Are you sure? This cannot be undone.")) {
      setMemories([]);
      localStorage.removeItem("dev_memories");
      toast({
        title: "Success",
        description: "All memories cleared",
      });
    }
  };

  const filteredMemories =
    activeTab === "all"
      ? memories
      : memories.filter((m) => m.type === activeTab);

  const getIconForType = (type: string) => {
    switch (type) {
      case "generation":
        return Code;
      case "note":
        return FileText;
      case "session":
        return BarChart3;
      default:
        return Clock;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "generation":
        return "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100";
      case "note":
        return "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100";
      case "session":
        return "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100";
      default:
        return "bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  return (
    <ResponsiveContainer className="py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
              <span>Development Sandbox</span>
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-2">
              Test code and save your development memories
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={loadMemories}
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={clearAllMemories}
              variant="destructive"
              size={isMobile ? "sm" : "default"}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
              disabled={memories.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Clear All</span>
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full gap-1 ${
            isMobile ? "grid-cols-2" : "grid-cols-4"
          }`}>
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All ({memories.length})
            </TabsTrigger>
            <TabsTrigger value="generation" className="text-xs sm:text-sm">
              Generated
            </TabsTrigger>
            <TabsTrigger value="note" className="text-xs sm:text-sm">
              Notes
            </TabsTrigger>
            <TabsTrigger value="session" className="text-xs sm:text-sm">
              Sessions
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Memories Grid */}
        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Loading memories...</p>
          </Card>
        ) : filteredMemories.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm sm:text-base font-medium">No memories yet</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Create your first memory to get started
            </p>
            <Button
              onClick={() => {
                const newMemory: Memory = {
                  id: Date.now().toString(),
                  type: "note",
                  title: "New Note",
                  description: "Add your note here",
                  timestamp: Date.now(),
                  content: "Sample content",
                };
                saveMemory(newMemory);
              }}
              className="mt-4 text-xs sm:text-sm"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Memory
            </Button>
          </Card>
        ) : (
          <ResponsiveGrid
            cols={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
            gap="lg"
          >
            {filteredMemories.map((memory) => {
              const Icon = getIconForType(memory.type);
              return (
                <Card
                  key={memory.id}
                  className="hover:border-primary/50 transition hover:shadow-lg flex flex-col"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg line-clamp-1">
                          {memory.title}
                        </CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                          {memory.description}
                        </p>
                      </div>
                      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1 flex flex-col">
                    {/* Type Badge */}
                    <div className={`px-2 py-1 rounded text-xs font-medium capitalize w-fit ${getTypeColor(memory.type)}`}>
                      {memory.type}
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground">
                      {new Date(memory.timestamp).toLocaleString()}
                    </p>

                    {/* Content Preview */}
                    {memory.content && (
                      <div className="p-2 sm:p-3 bg-muted rounded text-xs font-mono line-clamp-3 overflow-hidden">
                        {memory.content}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(memory.content || "");
                          toast({
                            title: "Success",
                            description: "Content copied",
                          });
                        }}
                        className="flex-1 text-xs h-8"
                      >
                        <FileText className="h-3 w-3" />
                        <span className="hidden sm:inline ml-1">Copy</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMemory(memory.id)}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </ResponsiveGrid>
        )}

        {/* Sandbox Code Area (Bottom) */}
        {!isMobile && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Code className="h-5 w-5" />
                Test Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="w-full h-40 font-mono text-xs bg-muted border rounded p-3 resize-none"
                placeholder="Write test code here..."
                defaultValue="// Test your code here\nconst hello = () => {\n  console.log('Hello, Sandbox!');\n};"
              />
              <div className="flex gap-2">
                <Button className="flex-1 text-xs" size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Run Code
                </Button>
                <Button variant="outline" className="flex-1 text-xs" size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save as Memory
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ResponsiveContainer>
  );
}
