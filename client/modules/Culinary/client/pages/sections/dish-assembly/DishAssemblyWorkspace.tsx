import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import type { Recipe } from "@shared/recipes";
import { useAppData } from "@/context/AppDataContext";
import { useTranslation } from "@/context/LanguageContext";
import { usePageToolbar } from "@/context/PageToolbarContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  AllergenRow,
  DishComponentRow,
  PairingRow,
  PosMapping,
  RecipeSummary,
  classifyMenuEngineering,
  computeDishCost,
  createId,
  defaultPosMappings,
  estimatePopularityScore,
  formatCurrencyValue,
  generateAllergenRows,
  generateMenuDescription,
  generateMenuTitle,
  generatePairings,
  generateServerNotes,
  generateServiceware,
  mergePosMappings,
  parsePriceString,
  summarizeRecipe,
} from "./utils";
import DishComponentsTable from "./components/DishComponentsTable";
import PosMappingSection from "./components/PosMappingSection";
import RecipePreviewPanel from "./components/RecipePreviewPanel";
import {
  RoutingSelector,
  SelectedRoutingSummary,
  type RoutingOption,
  type RoutingSummaryItem,
} from "./components/RoutingSelector";
import { Sparkles, RefreshCcw, Upload, RotateCcw, Settings } from "lucide-react";

const INITIAL_COMPONENT_ROWS = 6;

const createBlankRow = (): DishComponentRow => ({
  id: createId(),
  quantity: "1 ea",
  recipeId: null,
  label: "",
  notes: "",
});

const createInitialRows = () =>
  Array.from({ length: INITIAL_COMPONENT_ROWS }, () => createBlankRow());

const DishAssemblyWorkspace: React.FC = () => {
  const { recipes, listStations, listPrinters, addImages } = useAppData();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setToolbar, resetToolbar } = usePageToolbar();

  const recipeSummaries = useMemo(() => {
    const map = new Map<string, RecipeSummary>();
    for (const recipe of recipes) {
      map.set(recipe.id, summarizeRecipe(recipe));
    }
    return map;
  }, [recipes]);

  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>();
    for (const recipe of recipes) {
      map.set(recipe.id, recipe);
    }
    return map;
  }, [recipes]);

  const [componentRows, setComponentRows] =
    useState<DishComponentRow[]>(createInitialRows);
  const [menuTitle, setMenuTitle] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [serverNotes, setServerNotes] = useState("");
  const [serviceware, setServiceware] = useState("");
  const [allergenRows, setAllergenRows] = useState<AllergenRow[]>([]);
  const [pairingRows, setPairingRows] = useState<PairingRow[]>([]);
  const [posMappings, setPosMappings] = useState<PosMapping[]>(() =>
    defaultPosMappings(),
  );
  const [posConnectOpen, setPosConnectOpen] = useState(false);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [selectedPrinterIds, setSelectedPrinterIds] = useState<string[]>([]);
  const [activeComponentId, setActiveComponentId] = useState<string | null>(
    null,
  );
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [imageRotationIndex, setImageRotationIndex] = useState(0);
  const [routingTab, setRoutingTab] = useState<"stations" | "printers">("stations");
  const [stationQuery, setStationQuery] = useState("");
  const [printerQuery, setPrinterQuery] = useState("");

  const heroImage = useMemo(() => {
    if (customImage) return customImage;
    const withRecipe = componentRows
      .map((row) => (row.recipeId ? recipeSummaries.get(row.recipeId) : null))
      .filter(Boolean) as RecipeSummary[];
    if (!withRecipe.length) return null;
    const index = imageRotationIndex % withRecipe.length;
    return withRecipe[index]?.image ?? withRecipe[0]?.image ?? null;
  }, [componentRows, customImage, imageRotationIndex, recipeSummaries]);

  const { totalCost, currency } = useMemo(
    () => computeDishCost(componentRows, recipeSummaries),
    [componentRows, recipeSummaries],
  );

  const priceNumber = useMemo(() => parsePriceString(menuPrice), [menuPrice]);

  const foodCostPct = useMemo(() => {
    if (!priceNumber || priceNumber <= 0) return null;
    return Number((totalCost / priceNumber).toFixed(3));
  }, [priceNumber, totalCost]);

  const grossMarginValue = useMemo(() => {
    if (!priceNumber || priceNumber <= 0) return null;
    return Number((priceNumber - totalCost).toFixed(2));
  }, [priceNumber, totalCost]);

  const grossMarginPct = useMemo(() => {
    if (!priceNumber || priceNumber <= 0) return null;
    const margin = priceNumber - totalCost;
    return Number(((margin / priceNumber) * 100).toFixed(1));
  }, [priceNumber, totalCost]);

  const popularityScore = useMemo(
    () => estimatePopularityScore(recipeSummaries, componentRows),
    [componentRows, recipeSummaries],
  );

  const menuEngineering = useMemo(
    () => classifyMenuEngineering(foodCostPct, popularityScore),
    [foodCostPct, popularityScore],
  );
  const popularityDisplay = Number.isFinite(popularityScore)
    ? Math.round(popularityScore)
    : null;

  const stations = useMemo(() => listStations(), [listStations]);
  const printers = useMemo(() => listPrinters(), [listPrinters]);

  const selectedStationDetails = useMemo(
    () => stations.filter((station) => selectedStationIds.includes(station.id)),
    [stations, selectedStationIds],
  );

  const selectedPrinterDetails = useMemo(
    () => printers.filter((printer) => selectedPrinterIds.includes(printer.id)),
    [printers, selectedPrinterIds],
  );

  const recommendedPrinterIds = useMemo(() => {
    const set = new Set<string>();
    selectedStationIds.forEach((stationId) => {
      const station = stations.find((item) => item.id === stationId);
      if (!station) return;
      station.defaultPrinters.forEach((printerId) => set.add(printerId));
    });
    return Array.from(set);
  }, [selectedStationIds, stations]);

  const recommendedPrinterSet = useMemo(
    () => new Set(recommendedPrinterIds),
    [recommendedPrinterIds],
  );

  const filteredStations = useMemo(() => {
    const query = stationQuery.trim().toLowerCase();
    if (!query) return stations;
    return stations.filter(
      (station) =>
        station.name.toLowerCase().includes(query) ||
        station.category.toLowerCase().includes(query),
    );
  }, [stationQuery, stations]);

  const filteredPrinters = useMemo(() => {
    const query = printerQuery.trim().toLowerCase();
    if (!query) return printers;
    return printers.filter((printer) => {
      const haystack = [
        printer.name,
        printer.technology,
        printer.recommendedUse,
        printer.description,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return haystack.some((value) => value.includes(query));
    });
  }, [printerQuery, printers]);

  const stationOptions = useMemo<RoutingOption[]>(() => {
    return filteredStations.map((station) => {
      const suggestedPrinters = station.defaultPrinters
        .map((printerId) => printers.find((printer) => printer.id === printerId)?.name)
        .filter((name): name is string => Boolean(name));
      return {
        id: station.id,
        label: station.name,
        tag: station.category.replace(/-/g, " ").toUpperCase(),
        description: station.description,
        meta: suggestedPrinters.length
          ? `Suggested printers: ${suggestedPrinters.join(", ")}`
          : undefined,
      } satisfies RoutingOption;
    });
  }, [filteredStations, printers]);

  const printerOptions = useMemo<RoutingOption[]>(() => {
    return filteredPrinters.map((printer) => ({
      id: printer.id,
      label: printer.name,
      tag: printer.technology.toUpperCase(),
      description: printer.description,
      meta: printer.recommendedUse,
      recommended: recommendedPrinterSet.has(printer.id),
    } satisfies RoutingOption));
  }, [filteredPrinters, recommendedPrinterSet]);

  const stationSummaryItems = useMemo<RoutingSummaryItem[]>(() => {
    return selectedStationDetails.map((station) => {
      const suggestedPrinters = station.defaultPrinters
        .map((printerId) => printers.find((printer) => printer.id === printerId)?.name)
        .filter((name): name is string => Boolean(name));
      return {
        id: station.id,
        label: station.name,
        tag: station.category.replace(/-/g, " ").toUpperCase(),
        description: station.description,
        meta: suggestedPrinters.length
          ? `Suggested printers: ${suggestedPrinters.join(", ")}`
          : undefined,
      } satisfies RoutingSummaryItem;
    });
  }, [printers, selectedStationDetails]);

  const printerSummaryItems = useMemo<RoutingSummaryItem[]>(() => {
    return selectedPrinterDetails.map((printer) => ({
      id: printer.id,
      label: printer.name,
      tag: printer.technology.toUpperCase(),
      description: printer.description,
      meta: printer.recommendedUse,
    } satisfies RoutingSummaryItem));
  }, [selectedPrinterDetails]);

  const handleRowChange = useCallback(
    (rowId: string, patch: Partial<DishComponentRow>) => {
      setComponentRows((rows) =>
        rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  const handleAssignRecipe = useCallback(
    (rowId: string, recipeId: string | null) => {
      setComponentRows((rows) =>
        rows.map((row) => {
          if (row.id !== rowId) return row;
          if (!recipeId) {
            return {
              ...row,
              recipeId: null,
              label: row.label,
              notes: row.notes,
            };
          }
          const summary = recipeSummaries.get(recipeId);
          const baselineLabel =
            summary?.menuName || summary?.title || row.label;
          return {
            ...row,
            recipeId,
            label: baselineLabel,
            notes: row.notes,
          };
        }),
      );
    },
    [recipeSummaries],
  );

  const addComponentRow = useCallback(() => {
    setComponentRows((rows) => [...rows, createBlankRow()]);
  }, []);

  const removeComponentRow = useCallback((rowId: string) => {
    setComponentRows((rows) => rows.filter((row) => row.id !== rowId));
    setActiveComponentId((current) => (current === rowId ? null : current));
  }, []);

  const handleAutoFill = useCallback(() => {
    const summaryMap = recipeSummaries;
    const hasSelection = componentRows.some((row) => row.recipeId);
    if (!hasSelection) {
      toast({
        title: "Select components first",
        description: "Choose at least one recipe before generating copy.",
      });
      return;
    }

    const generatedTitle = generateMenuTitle(componentRows, summaryMap);
    const description = generateMenuDescription(componentRows, summaryMap);
    const notes = generateServerNotes(componentRows, summaryMap);
    const ware = generateServiceware(componentRows, summaryMap);
    const allergens = generateAllergenRows(componentRows, summaryMap);
    const pairings = generatePairings(summaryMap, componentRows);
    const { totalCost: cost, currency: detectedCurrency } = computeDishCost(
      componentRows,
      summaryMap,
    );
    const targetPrice = cost > 0 ? cost * 3.25 : null;
    const formattedPrice = targetPrice
      ? formatCurrencyValue(targetPrice, detectedCurrency)
      : menuPrice;

    setMenuTitle((prev) => (prev.trim() ? prev : generatedTitle));
    setMenuDescription(description);
    setServerNotes(notes);
    setServiceware(ware);
    setAllergenRows(allergens);
    setPairingRows(pairings);
    if (formattedPrice) {
      setMenuPrice(formattedPrice);
    }
    setPosMappings((current) =>
      mergePosMappings(current, generatedTitle, formattedPrice),
    );

    toast({
      title: "Dish assembly drafted",
      description: "Copy, allergens, pairings, and pricing have been updated.",
    });
  }, [componentRows, menuPrice, recipeSummaries]);

  const resetWorkspace = useCallback(() => {
    setComponentRows(createInitialRows());
    setMenuTitle("");
    setMenuPrice("");
    setMenuDescription("");
    setServerNotes("");
    setServiceware("");
    setAllergenRows([]);
    setPairingRows([]);
    setPosMappings(defaultPosMappings());
    setSelectedStationIds([]);
    setSelectedPrinterIds([]);
    setActiveComponentId(null);
    setCustomImage(null);
    setImageRotationIndex(0);
    lastStationIndexRef.current = null;
    lastPrinterIndexRef.current = null;
  }, []);

  useEffect(() => {
    setToolbar({
      title: "Dish Assembly",
      items: [
        {
          id: "dish-assembly-generate",
          label: "Auto-fill",
          ariaLabel: "Generate dish assembly details",
          onClick: handleAutoFill,
          icon: Sparkles,
          className:
            "rounded-full border border-primary/40 bg-primary/10 text-primary shadow-sm hover:bg-primary/20",
        },
        {
          id: "dish-assembly-pos-connect",
          label: t("dishAssembly.actions.posConnect", "POS Connect"),
          ariaLabel: t(
            "dishAssembly.actions.posConnect",
            "POS Connect",
          ),
          onClick: () => setPosConnectOpen(true),
          icon: Settings,
          className:
            "rounded-full border border-primary/40 bg-background text-primary shadow-sm hover:bg-primary/10",
        },
        {
          id: "dish-assembly-reset",
          label: "Reset",
          ariaLabel: "Reset dish assembly workspace",
          onClick: resetWorkspace,
          icon: RefreshCcw,
          className:
            "rounded-full border border-destructive/30 bg-background text-destructive shadow-sm hover:bg-destructive/10",
        },
      ],
    });
    return () => resetToolbar();
  }, [handleAutoFill, resetToolbar, resetWorkspace, setToolbar, t]);

  const handleImageUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          setCustomImage(result);
          setImageRotationIndex(0);
        }
      };
      reader.readAsDataURL(file);

      try {
        const tags = ["dish-assembly", "upload"];
        const added = await addImages([file], { tags });
        if (added > 0) {
          toast({
            title: "Image stored",
            description: "Uploaded dish imagery is now available in the gallery.",
          });
        } else {
          toast({
            title: "Image already saved",
            description: "This filename already exists in the gallery library.",
          });
        }
      } catch (error) {
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Could not save image to gallery.",
          variant: "destructive",
        });
      }
    },
    [addImages],
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastStationIndexRef = useRef<number | null>(null);
  const lastPrinterIndexRef = useRef<number | null>(null);

  const handleStationToggle = useCallback(
    (stationId: string, shiftKey: boolean) => {
      const index = stations.findIndex((station) => station.id === stationId);
      if (index === -1) return;
      setSelectedStationIds((prev) => {
        const nextSet = new Set(prev);
        if (shiftKey && lastStationIndexRef.current != null) {
          const lastIndex = lastStationIndexRef.current;
          const start = Math.min(lastIndex, index);
          const end = Math.max(lastIndex, index);
          for (let i = start; i <= end; i += 1) {
            const candidate = stations[i];
            if (candidate) nextSet.add(candidate.id);
          }
        } else if (nextSet.has(stationId)) {
          nextSet.delete(stationId);
        } else {
          nextSet.add(stationId);
        }
        lastStationIndexRef.current = index;
        return stations
          .filter((station) => nextSet.has(station.id))
          .map((station) => station.id);
      });
    },
    [stations],
  );

  const handlePrinterToggle = useCallback(
    (printerId: string, shiftKey: boolean) => {
      const index = printers.findIndex((printer) => printer.id === printerId);
      if (index === -1) return;
      setSelectedPrinterIds((prev) => {
        const nextSet = new Set(prev);
        if (shiftKey && lastPrinterIndexRef.current != null) {
          const lastIndex = lastPrinterIndexRef.current;
          const start = Math.min(lastIndex, index);
          const end = Math.max(lastIndex, index);
          for (let i = start; i <= end; i += 1) {
            const candidate = printers[i];
            if (candidate) nextSet.add(candidate.id);
          }
        } else if (nextSet.has(printerId)) {
          nextSet.delete(printerId);
        } else {
          nextSet.add(printerId);
        }
        lastPrinterIndexRef.current = index;
        return printers
          .filter((printer) => nextSet.has(printer.id))
          .map((printer) => printer.id);
      });
    },
    [printers],
  );

  const handleClearStations = useCallback(() => {
    setSelectedStationIds([]);
    lastStationIndexRef.current = null;
  }, []);

  const handleClearPrinters = useCallback(() => {
    setSelectedPrinterIds([]);
    lastPrinterIndexRef.current = null;
  }, []);

  useEffect(() => {
    if (!selectedStationIds.length) {
      setSelectedPrinterIds((prev) => {
        if (!prev.length) return prev;
        return [];
      });
      lastPrinterIndexRef.current = null;
      return;
    }
    setSelectedPrinterIds((prev) => {
      if (prev.length) return prev;
      const auto = recommendedPrinterIds.filter((id) =>
        printers.some((printer) => printer.id === id),
      );
      return auto.length ? auto : prev;
    });
  }, [printers, recommendedPrinterIds, selectedStationIds]);

  const activeRecipe = useMemo(() => {
    if (!activeComponentId) return null;
    const row = componentRows.find((entry) => entry.id === activeComponentId);
    if (!row?.recipeId) return null;
    return recipeSummaries.get(row.recipeId) ?? null;
  }, [activeComponentId, componentRows, recipeSummaries]);

  const focusRecipe = useCallback((rowId: string) => {
    setActiveComponentId(rowId);
  }, []);

  useEffect(() => {
    let incomingId: string | null = null;
    try {
      incomingId = sessionStorage.getItem("dishAssembly:incomingRecipeId");
    } catch {
      incomingId = null;
    }
    if (!incomingId) return;
    const summary = recipeSummaries.get(incomingId);
    if (!summary) return;

    sessionStorage.removeItem("dishAssembly:incomingRecipeId");

    let assignedRowId: string | null = null;
    setComponentRows((rows) => {
      const base = rows.length ? [...rows] : [createBlankRow()];
      let index = base.findIndex((row) => !row.recipeId);
      if (index === -1) {
        base.push(createBlankRow());
        index = base.length - 1;
      } else {
        base[index] = { ...base[index] };
      }
      const target = base[index];
      const resolvedLabel = summary.menuName || summary.title || target.label;
      const updated = {
        ...target,
        recipeId: incomingId,
        label: resolvedLabel,
      };
      assignedRowId = updated.id;
      base[index] = updated;
      return base;
    });

    if (assignedRowId) {
      setActiveComponentId(assignedRowId);
    }

    const resolvedName = summary.menuName || summary.title;
    setMenuTitle((prev) => (prev.trim() ? prev : resolvedName || prev));
    setMenuDescription((prev) =>
      prev.trim() ? prev : summary.description || prev,
    );

    const priceDisplay =
      summary.menuPrice != null
        ? formatCurrencyValue(summary.menuPrice, summary.currency)
        : "";
    if (priceDisplay) {
      setMenuPrice((prev) => (prev.trim() ? prev : priceDisplay));
    }
    setPosMappings((current) =>
      mergePosMappings(current, resolvedName || summary.title, priceDisplay),
    );

    toast({
      title: t("dishAssembly.toasts.recipeImported", "Recipe queued"),
      description: t(
        "dishAssembly.toasts.recipeImportedDetail",
        "{name} is ready in Dish Assembly.",
        { name: resolvedName || summary.title },
      ),
    });
  }, [recipeSummaries, t]);

  const navigateToRecipeSearch = useCallback(
    (recipeId: string) => {
      sessionStorage.setItem("dishAssembly:focusRecipe", recipeId);
      navigate("/?tab=search");
    },
    [navigate],
  );

  return (
    <div className="mx-auto w-full max-w-[1420px] space-y-6 px-4 py-6 sm:px-6 lg:px-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/30 bg-background/95 shadow-lg backdrop-blur">
            <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="space-y-3">
                <div className="relative rounded-xl border border-primary/30 bg-muted/20 p-2">
                  <AspectRatio ratio={4 / 3}>
                    {heroImage ? (
                      <img
                        src={heroImage}
                        alt={menuTitle || "Dish hero"}
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-primary/40 bg-muted/30 text-sm uppercase tracking-[0.35em] text-muted-foreground">
                        Upload or select recipe imagery
                      </div>
                    )}
                  </AspectRatio>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <Upload className="mr-1.5 h-4 w-4" />
                      Upload image
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCustomImage(null)}
                      disabled={!customImage}
                    >
                      <RotateCcw className="mr-1.5 h-4 w-4" />
                      Use recipe media
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setImageRotationIndex((index) => index + 1)
                      }
                      disabled={componentRows.every((row) => !row.recipeId)}
                    >
                      Cycle selections
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void handleImageUpload(file);
                        event.target.value = "";
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-4">
                    <label className="flex-1 min-w-[240px] space-y-1 text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
                      Menu Item Name
                      <Input
                        value={menuTitle}
                        onChange={(event) => setMenuTitle(event.target.value)}
                        placeholder="Generated name"
                        className="rounded-xl border-primary/40 bg-background/80 text-base font-semibold uppercase tracking-[0.35em]"
                      />
                    </label>
                    <label className="flex w-full min-w-[160px] flex-col space-y-1 text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground md:w-48">
                      Sell Price
                      <Input
                        value={menuPrice}
                        onChange={(event) => setMenuPrice(event.target.value)}
                        placeholder={formatCurrencyValue(
                          totalCost * 3.25,
                          currency,
                        )}
                        className="rounded-xl border-primary/40 bg-background/80 text-lg font-semibold"
                      />
                    </label>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-primary/30 bg-background/80 px-3 py-3 text-center shadow-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                        Food Cost
                      </div>
                      <div className="text-base font-semibold text-primary">
                        {foodCostPct != null
                          ? `${Math.round(foodCostPct * 100)}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-primary/30 bg-background/80 px-3 py-3 text-center shadow-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                        Menu Engineering
                      </div>
                      <div className="text-base font-semibold text-primary">
                        {menuEngineering.classification}
                      </div>
                    </div>
                    <div className="rounded-xl border border-primary/30 bg-background/80 px-3 py-3 text-center shadow-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                        Popularity
                      </div>
                      <div className="text-base font-semibold text-primary">
                        {popularityDisplay != null ? `${popularityDisplay}%` : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-primary/30 bg-background/95 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Narrative & Service Brief
              </CardTitle>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                Shape guest-facing language and expo reminders.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  Menu Description
                </div>
                <Textarea
                  value={menuDescription}
                  onChange={(event) => setMenuDescription(event.target.value)}
                  rows={6}
                  placeholder="Elegant marketing copy for the menu listing"
                  className="h-auto min-h-[160px] rounded-xl border border-primary/30 bg-background/80"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  Server Notes
                </div>
                <Textarea
                  value={serverNotes}
                  onChange={(event) => setServerNotes(event.target.value)}
                  rows={6}
                  placeholder="Talking points, plating, or expo reminders"
                  className="h-auto min-h-[160px] rounded-xl border border-primary/30 bg-background/80"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleAutoFill}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Auto-fill narrative
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetWorkspace}
                  className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <RefreshCcw className="mr-1.5 h-4 w-4" />
                  Clear workspace
                </Button>
              </div>
            </CardContent>
          </Card>

          <DishComponentsTable
            rows={componentRows}
            recipeSummaries={recipeSummaries}
            onRowChange={handleRowChange}
            onAssignRecipe={handleAssignRecipe}
            onAddRow={addComponentRow}
            onRemoveRow={removeComponentRow}
            onFocusRow={focusRecipe}
          />
        </div>

        <div className="space-y-6">
          <Card className="border-primary/30 bg-background/95 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Routing & Printers
              </CardTitle>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                Map the dish journey across stations and chit devices.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {selectedStationIds.length} station{selectedStationIds.length === 1 ? "" : "s"}
                </Badge>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {selectedPrinterIds.length} printer{selectedPrinterIds.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <Tabs
                value={routingTab}
                onValueChange={(value) =>
                  setRoutingTab(value as "stations" | "printers")
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-background/80">
                  <TabsTrigger value="stations">
                    Stations
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold">
                      {selectedStationIds.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="printers">
                    Printers
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold">
                      {selectedPrinterIds.length}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="stations" className="space-y-3 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={stationQuery}
                      onChange={(event) => setStationQuery(event.target.value)}
                      placeholder="Search stations"
                      className="h-9 flex-1 rounded-full border-primary/30 bg-background/80 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearStations}
                      disabled={!selectedStationIds.length}
                      className="h-8 rounded-full px-3"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    Shift-click to span selections across stations.
                  </div>
                  <ScrollArea className="max-h-48 rounded-xl border border-primary/30">
                    <RoutingSelector
                      options={stationOptions}
                      selectedIds={selectedStationIds}
                      onToggle={handleStationToggle}
                      emptyMessage="No stations found"
                      className="w-full p-2"
                    />
                  </ScrollArea>
                  <SelectedRoutingSummary
                    items={stationSummaryItems}
                    emptyMessage="Select stations to map the dish workflow."
                  />
                </TabsContent>

                <TabsContent value="printers" className="space-y-3 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={printerQuery}
                      onChange={(event) => setPrinterQuery(event.target.value)}
                      placeholder="Search printers"
                      className="h-9 flex-1 rounded-full border-primary/30 bg-background/80 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearPrinters}
                      disabled={!selectedPrinterIds.length}
                      className="h-8 rounded-full px-3"
                    >
                      Clear
                    </Button>
                  </div>
                  {recommendedPrinterIds.length ? (
                    <div className="text-[10px] uppercase tracking-[0.28em] text-primary">
                      Recommended from stations:{" "}
                      {recommendedPrinterIds
                        .map((id) => printers.find((printer) => printer.id === id)?.name ?? "")
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  ) : (
                    <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                      Shift-click to capture multiple devices in sequence.
                    </div>
                  )}
                  <ScrollArea className="max-h-48 rounded-xl border border-primary/30">
                    <RoutingSelector
                      options={printerOptions}
                      selectedIds={selectedPrinterIds}
                      onToggle={handlePrinterToggle}
                      emptyMessage="No printers found"
                      className="w-full p-2"
                    />
                  </ScrollArea>
                  <SelectedRoutingSummary
                    items={printerSummaryItems}
                    emptyMessage="Choose printers to capture routing instructions for POS setup."
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-background/95 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Serviceware & Allergens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  Serviceware
                </div>
                <Textarea
                  value={serviceware}
                  onChange={(event) => setServiceware(event.target.value)}
                  rows={4}
                  placeholder="Plating vessels, utensils, expo requirements"
                  className="rounded-xl border border-primary/30 bg-background/80"
                />
              </div>
              <Tabs defaultValue="allergens" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-background/80">
                  <TabsTrigger value="allergens">Allergens</TabsTrigger>
                  <TabsTrigger value="pairings">Pairings</TabsTrigger>
                </TabsList>
                <TabsContent value="allergens" className="pt-3">
                  <div className="flex justify-between pb-2 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                    <span>Item / Allergen call-outs</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setAllergenRows(
                          generateAllergenRows(componentRows, recipeSummaries),
                        )
                      }
                      className="h-7 text-xs uppercase tracking-[0.28em]"
                    >
                      Refresh
                    </Button>
                  </div>
                  <ScrollArea className="max-h-60 rounded-xl border border-primary/30">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-left">Allergen</th>
                          <th className="px-3 py-2 text-left">Modify</th>
                          <th className="px-3 py-2 text-left">Alternative</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allergenRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-6 text-center text-xs uppercase tracking-[0.32em] text-muted-foreground"
                            >
                              Generate allergen guidance from components
                            </td>
                          </tr>
                        ) : (
                          allergenRows.map((row) => (
                            <tr
                              key={row.id}
                              className="border-t border-border/60 text-[12px]"
                            >
                              <td className="px-3 py-2 font-medium">
                                {row.itemName}
                              </td>
                              <td className="px-3 py-2">{row.allergen}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {row.modify}
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {row.alternative}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="pairings" className="pt-3">
                  <div className="flex justify-between pb-2 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                    <span>Wine & Beverage Strategy</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setPairingRows(
                          generatePairings(recipeSummaries, componentRows),
                        )
                      }
                      className="h-7 text-xs uppercase tracking-[0.28em]"
                    >
                      Refresh
                    </Button>
                  </div>
                  <ScrollArea className="max-h-60 rounded-xl border border-primary/30">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-left">Year</th>
                          <th className="px-3 py-2 text-left">Location</th>
                          <th className="px-3 py-2 text-left">Country</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pairingRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-6 text-center text-xs uppercase tracking-[0.32em] text-muted-foreground"
                            >
                              Generate beverage pairings from cuisine cues
                            </td>
                          </tr>
                        ) : (
                          pairingRows.map((row) => (
                            <tr
                              key={row.id}
                              className="border-t border-border/60 text-[12px]"
                            >
                              <td className="px-3 py-2 font-medium">
                                {row.itemName}
                              </td>
                              <td className="px-3 py-2">{row.year || "NV"}</td>
                              <td className="px-3 py-2">{row.location}</td>
                              <td className="px-3 py-2">{row.country}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <RecipePreviewPanel
            rows={componentRows}
            recipeSummaries={recipeSummaries}
            recipeMap={recipeMap}
            activeComponentId={activeComponentId}
            onFocusRow={focusRecipe}
            onNavigateToRecipe={navigateToRecipeSearch}
          />

          <Card className="border-primary/30 bg-background/95">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Performance Outlook
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-[0.32em] text-muted-foreground">
                  Estimated cost
                </span>
                <span className="text-base font-semibold">
                  {formatCurrencyValue(totalCost, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-[0.32em] text-muted-foreground">
                  Price
                </span>
                <span className="text-base font-semibold">
                  {menuPrice || formatCurrencyValue(totalCost * 3.25, currency)}
                </span>
              </div>
              <Separator className="bg-primary/20" />
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                  Menu Engineering
                </div>
                <div className="text-base font-semibold text-primary">
                  {menuEngineering.classification}
                </div>
                <p className="text-sm text-muted-foreground">
                  {menuEngineering.narrative}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={posConnectOpen} onOpenChange={setPosConnectOpen}>
        <DialogContent className="max-w-4xl border-primary/40 bg-background/95 shadow-xl">
          <DialogHeader>
            <DialogTitle>
              {t("dishAssembly.actions.posConnect", "POS Connect")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "dishAssembly.actions.posConnectDescription",
                "Map dish codes and pricing across connected POS systems.",
              )}
            </DialogDescription>
          </DialogHeader>
          <PosMappingSection
            mappings={posMappings}
            onChange={setPosMappings}
            menuPrice={menuPrice}
            menuTitle={menuTitle}
            variant="plain"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DishAssemblyWorkspace;
