import { useMemo, useState } from "react";
import type { ComponentLibraryItem } from "@/services/DesignSystemManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Layers3, Search, Star } from "lucide-react";

interface ComponentLibraryPanelProps {
  components: ComponentLibraryItem[];
  onTogglePublish: (component: ComponentLibraryItem) => void;
}

export default function ComponentLibraryPanel({
  components,
  onTogglePublish,
}: ComponentLibraryPanelProps) {
  const [query, setQuery] = useState("");

  const filteredComponents = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return components;
    return components.filter(
      (component) =>
        component.name.toLowerCase().includes(search) ||
        component.category.toLowerCase().includes(search) ||
        component.description.toLowerCase().includes(search),
    );
  }, [components, query]);

  return (
    <Card className="border-primary/10 bg-background/70 h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-2">
          <Layers3 className="w-3.5 h-3.5" />
          Component Library
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden pt-0 flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components..."
            className="h-8 pl-7 text-xs"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{filteredComponents.length} components</span>
          <span>{components.filter((component) => component.published).length} published</span>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-2">
            {filteredComponents.length === 0 ? (
              <div className="rounded-md border border-dashed border-primary/10 p-4 text-xs text-muted-foreground">
                No components match your search.
              </div>
            ) : (
              filteredComponents.map((component) => (
                <div
                  key={component.id}
                  className="rounded-md border border-primary/10 bg-background/60 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{component.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {component.description}
                      </p>
                    </div>
                    <Badge variant={component.published ? "default" : "secondary"} className="text-[10px]">
                      {component.published ? "Published" : "Draft"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {component.category}
                    </Badge>
                    <span>{component.variants.length} variants</span>
                    <span>{component.usage} uses</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onTogglePublish(component)}>
                      <Star className="w-3.5 h-3.5 mr-2" />
                      {component.published ? "Unpublish" : "Publish"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
