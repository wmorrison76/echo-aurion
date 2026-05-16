import React, { useMemo, useState } from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StandardFilters } from "@/ui/tables/StandardFilters";
import { StandardTable } from "@/ui/tables/StandardTable";
import { RightTabs } from "@/ui/shell/RightTabs";
import { SidebarSection } from "@/ui/shell/SidebarSection";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";
import {
  languageOptions,
  defaultLanguage,
  type LanguageCode,
} from "../../i18n/config";
import {
  buildMenuPacks,
  generateMenuSummaryPdf,
  generatePackPdf,
} from "../../lib/menu-packs";
import type { Menu, MenuItemBinding, MenuPack } from "@/domains/menu";
import { traceLedgerClient } from "@/lib/trace-ledger-client";
import {
  CheckCircle2,
  Plus,
  RefreshCw,
  FileText,
  ClipboardList,
} from "lucide-react";

type MenuBuilderItem = MenuItemBinding & {
  kind: "dish" | "beverage";
  sourceName: string;
};

const DEFAULT_ORG = "demo-org";

const beverageLibrary = [
  { id: "bev-spritz", name: "Citrus Spritz", courseName: "Beverage" },
  { id: "bev-merlot", name: "Reserve Merlot", courseName: "Beverage" },
  { id: "bev-zero", name: "Sparkling Verjus", courseName: "Beverage" },
];

const createMenuId = () => `menu-${Date.now().toString(36)}`;

export default function MenuBuilder() {
  const { recipes } = useAppData();
  const { user } = useAuth();
  const [menuId] = useState(createMenuId);
  const [menuTitle, setMenuTitle] = useState("Winter Tasting Menu");
  const [season, setSeason] = useState("Winter 2026");
  const [versionId, setVersionId] = useState("v1");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-02-01");
  const [effectiveTo, setEffectiveTo] = useState("2026-03-15");
  const [eventId, setEventId] = useState("");
  const [primaryLanguage, setPrimaryLanguage] =
    useState<LanguageCode>(defaultLanguage);
  const [secondaryLanguage, setSecondaryLanguage] =
    useState<LanguageCode>("fr-FR");
  const [searchValue, setSearchValue] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<
    "all" | "dish" | "beverage"
  >("all");
  const [items, setItems] = useState<MenuBuilderItem[]>([]);
  const [packs, setPacks] = useState<MenuPack[]>([]);

  const libraryItems = useMemo(() => {
    const dishItems = recipes.map((recipe) => ({
      kind: "dish" as const,
      id: recipe.id,
      name: recipe.title,
      courseName: recipe.course || "Dish",
    }));
    const beverageItems = beverageLibrary.map((bev) => ({
      kind: "beverage" as const,
      id: bev.id,
      name: bev.name,
      courseName: bev.courseName,
    }));
    return [...dishItems, ...beverageItems];
  }, [recipes]);

  const filteredLibrary = useMemo(() => {
    return libraryItems.filter((item) => {
      if (libraryFilter !== "all" && item.kind !== libraryFilter) return false;
      if (!searchValue) return true;
      return item.name.toLowerCase().includes(searchValue.toLowerCase());
    });
  }, [libraryFilter, libraryItems, searchValue]);

  const languages = useMemo(() => {
    const list: LanguageCode[] = [primaryLanguage];
    if (secondaryLanguage && secondaryLanguage !== primaryLanguage) {
      list.push(secondaryLanguage);
    }
    return list;
  }, [primaryLanguage, secondaryLanguage]);

  const menu: Menu = useMemo(
    () => ({
      menuId,
      title: menuTitle.trim() || "Menu Builder Draft",
      items,
      eventId: eventId || null,
      createdAtISO: new Date().toISOString(),
      updatedAtISO: new Date().toISOString(),
    }),
    [eventId, items, menuId, menuTitle],
  );

  const handleAddItem = (item: (typeof libraryItems)[number]) => {
    if (items.some((entry) => entry.recipeId === item.id)) return;
    const next: MenuBuilderItem = {
      id: `${menuId}-${item.id}`,
      menuId,
      name: item.name,
      recipeId: item.id,
      recipeName: item.name,
      courseName: item.courseName,
      yieldCount: 80,
      portionSize: item.kind === "beverage" ? "8 oz" : "1 plate",
      productionNote: item.kind === "beverage" ? "Bar station" : "Hot line",
      kind: item.kind,
      sourceName: item.name,
    };
    setItems((prev) => [...prev, next]);
  };

  const handleRemoveItem = (recipeId: string) => {
    setItems((prev) => prev.filter((entry) => entry.recipeId !== recipeId));
  };

  const consumeDemandDeltas = async (traceId?: string) => {
    if (!traceId) {
      // Query all demand-delta entries to find recent ones
      const allDeltaEntries = traceLedgerClient.listByEntityType(
        DEFAULT_ORG,
        "demand-delta",
        100,
      );
      const recentDeltas = allDeltaEntries.filter((entry) => {
        const entryTime = new Date(entry.createdAt).getTime();
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return entryTime > dayAgo && entry.sourceRef;
      });

      if (recentDeltas.length === 0) {
        console.log("No recent demand deltas found");
        return null;
      }

      // Use the most recent traceId (sourceRef)
      const mostRecent = recentDeltas[0];
      traceId = mostRecent.sourceRef || undefined;
    }

    if (!traceId) return null;

    // Get all demand deltas for this traceId
    const deltaEntries = traceLedgerClient.listBySourceRef(
      DEFAULT_ORG,
      traceId,
      100,
    );
    const deltas = deltaEntries
      .filter((entry) => entry.entityType === "demand-delta")
      .map((entry) => {
        const payload = entry.payload as any;
        return {
          date: payload.date,
          delta: payload.delta,
        };
      });

    if (deltas.length === 0) return null;

    // Log consumption to trace ledger
    traceLedgerClient.append({
      orgId: DEFAULT_ORG,
      entityType: "menu",
      entityId: menu.menuId,
      sourceRef: traceId,
      payload: {
        action: "DEMAND_DELTA_CONSUMED",
        deltaCount: deltas.length,
        deltas,
        actor: {
          userId: user?.id,
          role: user?.role,
          system: "menu-builder",
        },
        timestamp: new Date().toISOString(),
      },
    });

    return { traceId, deltas };
  };

  const handlePublish = async () => {
    const nextPacks = buildMenuPacks({
      menu,
      versionId,
      season,
      effectiveFrom,
      effectiveTo,
      languages,
    });
    setPacks(nextPacks);

    // Optionally consume demand deltas
    const deltaResult = await consumeDemandDeltas();

    traceLedgerClient.append({
      orgId: DEFAULT_ORG,
      entityType: "menu",
      entityId: menu.menuId,
      sourceRef: deltaResult?.traceId || versionId,
      payload: {
        action: "MENU_PUBLISHED",
        title: menu.title,
        itemCount: menu.items.length,
        languages,
        publishedBy: user?.id ?? "demo-user",
        consumedDeltas: deltaResult ? deltaResult.deltas.length : 0,
      },
    });
    nextPacks.forEach((pack) => {
      traceLedgerClient.append({
        orgId: DEFAULT_ORG,
        entityType: "menu-pack",
        entityId: pack.id,
        sourceRef: menu.menuId,
        payload: {
          action: "PACK_GENERATED",
          kind: pack.kind,
          language: pack.language,
        },
      });
    });
  };

  const handleRegenerate = () => {
    const nextPacks = buildMenuPacks({
      menu,
      versionId,
      season,
      effectiveFrom,
      effectiveTo,
      languages,
    });
    setPacks(nextPacks);
    traceLedgerClient.append({
      orgId: DEFAULT_ORG,
      entityType: "menu",
      entityId: menu.menuId,
      sourceRef: versionId,
      payload: {
        action: "PACK_REGENERATED",
        packCount: nextPacks.length,
      },
    });
  };

  const handleExportMenu = async () => {
    await generateMenuSummaryPdf(menu, languages, `${menu.title}-menu.pdf`);
    traceLedgerClient.append({
      orgId: DEFAULT_ORG,
      entityType: "menu",
      entityId: menu.menuId,
      sourceRef: versionId,
      payload: {
        action: "MENU_EXPORT_GENERATED",
        languages,
      },
    });
  };

  const handleExportPack = async (pack: MenuPack) => {
    await generatePackPdf(pack, `${pack.title}.pdf`);
    traceLedgerClient.append({
      orgId: DEFAULT_ORG,
      entityType: "menu-pack",
      entityId: pack.id,
      sourceRef: menu.menuId,
      payload: {
        action: "PACK_EXPORTED",
        kind: pack.kind,
        language: pack.language,
      },
    });
  };

  const libraryColumns = [
    {
      key: "name",
      header: "Library Item",
      cell: (row: (typeof libraryItems)[number]) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline">{row.kind}</Badge>
          <span>{row.name}</span>
        </div>
      ),
    },
    {
      key: "course",
      header: "Course",
      cell: (row: (typeof libraryItems)[number]) => row.courseName,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: (typeof libraryItems)[number]) => (
        <Button size="sm" variant="outline" onClick={() => handleAddItem(row)}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      ),
      align: "right" as const,
    },
  ];

  const menuColumns = [
    {
      key: "name",
      header: "Menu Item",
      cell: (row: MenuBuilderItem) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">
            {row.kind.toUpperCase()} • {row.courseName ?? "Course"}
          </div>
        </div>
      ),
    },
    {
      key: "yield",
      header: "Yield",
      cell: (row: MenuBuilderItem) => (
        <Input
          value={row.yieldCount}
          onChange={(event) => {
            const value = Number(event.target.value);
            setItems((prev) =>
              prev.map((entry) =>
                entry.recipeId === row.recipeId
                  ? { ...entry, yieldCount: Number.isFinite(value) ? value : 0 }
                  : entry,
              ),
            );
          }}
          className="h-8 w-20"
        />
      ),
    },
    {
      key: "portion",
      header: "Portion",
      cell: (row: MenuBuilderItem) => (
        <Input
          value={row.portionSize ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setItems((prev) =>
              prev.map((entry) =>
                entry.recipeId === row.recipeId
                  ? { ...entry, portionSize: value }
                  : entry,
              ),
            );
          }}
          className="h-8"
        />
      ),
    },
    {
      key: "notes",
      header: "Notes",
      cell: (row: MenuBuilderItem) => (
        <Input
          value={row.productionNote ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setItems((prev) =>
              prev.map((entry) =>
                entry.recipeId === row.recipeId
                  ? { ...entry, productionNote: value }
                  : entry,
              ),
            );
          }}
          className="h-8"
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: MenuBuilderItem) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRemoveItem(row.recipeId)}
        >
          Remove
        </Button>
      ),
      align: "right" as const,
    },
  ];

  const mainContent = (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Menu Metadata
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
            value={menuTitle}
            onChange={(e) => setMenuTitle(e.target.value)}
            placeholder="Menu title"
          />
          <Input
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="Season"
          />
          <Input
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
            placeholder="Version Id"
          />
          <Input
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Event Id (optional)"
          />
          <Input
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            placeholder="Effective from (YYYY-MM-DD)"
          />
          <Input
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
            placeholder="Effective to (YYYY-MM-DD)"
          />
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Menu Library
          </CardTitle>
          <div className="flex gap-2">
            {(["all", "dish", "beverage"] as const).map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={libraryFilter === filter ? "default" : "outline"}
                onClick={() => setLibraryFilter(filter)}
              >
                {filter.toUpperCase()}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <StandardFilters
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            placeholder="Search dishes or beverages"
          />
          <StandardTable columns={libraryColumns} rows={filteredLibrary} />
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Menu Items ({items.length})
          </CardTitle>
          <Badge variant="secondary">
            {items.length > 0 ? "Ready" : "Add items"}
          </Badge>
        </CardHeader>
        <CardContent>
          <StandardTable
            columns={menuColumns}
            rows={items}
            emptyState="Add items from the library."
          />
        </CardContent>
      </Card>
    </div>
  );

  const summaryTab = (
    <div className="space-y-4">
      <SidebarSection
        title="Languages"
        description="Select bilingual export languages."
      >
        <Select
          value={primaryLanguage}
          onValueChange={(value) => setPrimaryLanguage(value as LanguageCode)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Primary language" />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.flag} {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={secondaryLanguage}
          onValueChange={(value) => setSecondaryLanguage(value as LanguageCode)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Secondary language" />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.flag} {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SidebarSection>

      <SidebarSection
        title="Publish"
        description="Generate FOH/BOH packs with trace events."
      >
        <Button
          onClick={handlePublish}
          disabled={!items.length}
          className="w-full"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Publish Menu & Packs
        </Button>
        <Button
          variant="outline"
          onClick={handleExportMenu}
          disabled={!items.length}
        >
          <FileText className="mr-2 h-4 w-4" />
          Export Bilingual Menu PDF
        </Button>
      </SidebarSection>
    </div>
  );

  const packsTab = (
    <div className="space-y-4">
      <SidebarSection
        title="Pack Status"
        description="Auto-generated FOH/BOH packs."
      >
        <div className="text-sm text-muted-foreground">
          {packs.length
            ? `${packs.length} packs ready`
            : "No packs generated yet."}
        </div>
        <Button
          variant="outline"
          onClick={handleRegenerate}
          disabled={!items.length}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate Packs
        </Button>
      </SidebarSection>
      <SidebarSection title="Exports" description="Download bilingual packs.">
        {packs.map((pack) => (
          <Button
            key={pack.id}
            variant="ghost"
            className="w-full justify-start"
            onClick={() => handleExportPack(pack)}
          >
            {pack.kind === "FOH_SERVER_NOTES" ? (
              <FileText className="mr-2 h-4 w-4" />
            ) : (
              <ClipboardList className="mr-2 h-4 w-4" />
            )}
            {pack.title}
          </Button>
        ))}
      </SidebarSection>
    </div>
  );

  return (
    <PanelFrame
      title="Menu Builder"
      subtitle="Build menus, generate FOH/BOH packs, and export bilingual PDFs"
      status="Active"
      chrome
      className="h-full w-full"
    >
      <div className="h-full p-6">
        <RightTabs
          main={mainContent}
          tabs={[
            { id: "summary", label: "Summary", content: summaryTab },
            {
              id: "packs",
              label: "Packs",
              content: packsTab,
              badge: `${packs.length}`,
            },
          ]}
        />
      </div>
    </PanelFrame>
  );
}
