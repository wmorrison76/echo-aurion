import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import RightSidebar from "./RightSidebar";
import { useAppData } from "@/context/AppDataContext";
import ImageEditorModal from "./ImageEditorModal";
import NutritionLabel from "./NutritionLabel";
import { NutritionAuditPanel } from "@/components/NutritionAuditPanel";
import LanguageMenu from "@/components/LanguageMenu";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { auditRecipeCosts } from "@/lib/ingredient-purchasing-sync";
import { defaultSelection, TaxonomySelection } from "@/lib/taxonomy";
import {
  RDLabProvider,
  type RDLabSnapshot,
  useRDLabStore,
} from "@/stores/rdLabStore";
import { DiscoveryPanel } from "@/components/RDLab/DiscoveryPanel";
import { WorkbenchPanel } from "@/components/RDLab/WorkbenchPanel";
import { InsightsPanel } from "@/components/RDLab/InsightsPanel";
import { RDLabSessionSidebar } from "@/components/RDLab/RDLabSessionSidebar";
import { NewProjectDialog } from "@/components/RDLab/NewProjectDialog";
import { GalleryImagePicker } from "@/components/GalleryImagePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import IngredientsGrid from "@/components/IngredientsGrid";
import SubRecipePicker, {
  type SubRecipeOption,
} from "@/components/SubRecipePicker";
import YieldLabForm from "@/components/YieldLabForm";
import { CulinaryAutocompleteInput } from "@/components/CulinaryAutocompleteInput";
import { useYieldStore } from "@/context/YieldContext";
import { usePageToolbar } from "@/context/PageToolbarContext";
import { useCollaboration } from "@/context/CollaborationContext";
import type { PageToolbarItem } from "@/context/PageToolbarContext";
import {
  combineYields,
  computeBaseYield,
  formatYieldPercent,
} from "@/lib/yield-calculations";
import { makeRecipeGlobal } from "@/lib/global-recipe-manager";
import {
  Save,
  Image as ImageIcon,
  PlusCircle,
  MinusCircle,
  Plus,
  Minus,
  Bold,
  Italic,
  Underline,
  Sun,
  Moon,
  Scale,
  Ruler,
  CircleDollarSign,
  Share2,
  FileDown,
  Printer,
  FlaskConical,
  Atom,
  X,
  ArrowUpRight,
  RotateCcw,
  Check,
  Loader2,
} from "lucide-react";
import { parseCostValue, parseQuantity } from "@/lib/recipe-scaling";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { normalizeRecipe, type RecipeExport } from "@shared/recipes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  IngredientRow,
  IngredientYieldInsight,
} from "@/types/ingredients";
import {
  createIngredientRow,
  createDividerRow,
  generateIngredientRowId,
} from "@/types/ingredients";

const DEFAULT_RND_LAYOUT: [number, number, number] = [32, 36, 32];
const MIN_RND_LAYOUT: [number, number, number] = [20, 26, 20];

const sanitizeRndLayout = (candidate: unknown): [number, number, number] => {
  if (!Array.isArray(candidate) || candidate.length !== 3) {
    return DEFAULT_RND_LAYOUT;
  }

  const sanitized = candidate.map((value, index) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return DEFAULT_RND_LAYOUT[index];
    }
    const upperBound = 80;
    return Math.max(MIN_RND_LAYOUT[index], Math.min(upperBound, numeric));
  }) as [number, number, number];

  const minimumTotal = MIN_RND_LAYOUT.reduce(
    (total, value) => total + value,
    0,
  );
  const sum = sanitized.reduce((total, value) => total + value, 0);

  if (sum < minimumTotal) {
    return DEFAULT_RND_LAYOUT;
  }

  return sanitized;
};

const normalizeString = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const normalizeOptionalString = (value: unknown): string | null => {
  const normalized = normalizeString(value).trim();
  return normalized.length ? normalized : null;
};

const buildRecipeData = (params: {
  title: string;
  ingredients: string[];
  instructions: string[];
  imageDataUrls: string[];
  tags: string[];
  nutrition?: any;
  extra?: any;
  isGlobal?: boolean;
}) => ({
  ...params,
  isGlobal: params.isGlobal ?? false,
  createdBy: "Current User", // TODO: Get from auth context
  lastModifiedBy: "Current User", // TODO: Get from auth context
  lastModifiedAt: Date.now(),
});

type RDLabProjectSession = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  layout: [number, number, number];
  snapshot: RDLabSnapshot;
  vision?: string;
  textureFocus?: string;
  flavorNotes?: string;
  launchTarget?: string;
};

const RDLAB_SESSIONS_STORAGE_KEY = "recipe:rnd:sessions:v1";
const RDLAB_ACTIVE_SESSION_KEY = "recipe:rnd:active-session";
const RDLAB_SAVE_HINT_KEY = "recipe:rnd:save-hint-count";
const AUTO_SAVE_DELAY_MS = 1100;

const sanitizeProjectSession = (value: unknown): RDLabProjectSession | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id =
    typeof record.id === "string" && record.id.trim().length ? record.id : null;
  if (!id) return null;
  const name =
    typeof record.name === "string" && record.name.trim().length
      ? record.name.trim()
      : "Untitled Lab";

  const snapshotRaw = (record.snapshot ?? {}) as Record<string, unknown>;
  const snapshot: RDLabSnapshot = {
    experiments: Array.isArray(snapshotRaw.experiments)
      ? (snapshotRaw.experiments as RDLabSnapshot["experiments"])
      : [],
    focusExperimentId:
      typeof snapshotRaw.focusExperimentId === "string"
        ? snapshotRaw.focusExperimentId
        : "",
    searchQuery:
      typeof snapshotRaw.searchQuery === "string"
        ? snapshotRaw.searchQuery
        : "",
  };

  const fallbackTimestamp = new Date().toISOString();

  return {
    id,
    name,
    createdAt:
      typeof record.createdAt === "string" && record.createdAt.length
        ? record.createdAt
        : fallbackTimestamp,
    updatedAt:
      typeof record.updatedAt === "string" && record.updatedAt.length
        ? record.updatedAt
        : fallbackTimestamp,
    layout: sanitizeRndLayout(record.layout),
    snapshot,
    vision: typeof record.vision === "string" ? record.vision : undefined,
    textureFocus:
      typeof record.textureFocus === "string" ? record.textureFocus : undefined,
    flavorNotes:
      typeof record.flavorNotes === "string" ? record.flavorNotes : undefined,
    launchTarget:
      typeof record.launchTarget === "string" ? record.launchTarget : undefined,
  };
};

const generateSessionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `rd-${crypto.randomUUID()}`;
  }
  return `rd-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
};

const formatProjectTimestamp = (iso: string) => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const ensureIngredientRowId = (
  row: IngredientRow | null | undefined,
): IngredientRow => {
  const source = row ?? createIngredientRow();
  const raw = source as unknown as Partial<IngredientRow> &
    Record<string, unknown>;
  const type: IngredientRow["type"] =
    raw.type === "divider" ? "divider" : "ingredient";
  const rawSubId = raw.subId ?? "";
  const subIdCandidate =
    typeof rawSubId === "string"
      ? rawSubId.trim()
      : String(rawSubId ?? "").trim();
  const base: IngredientRow = {
    ...source,
    type,
    subId: subIdCandidate || generateIngredientRowId(),
    qty: normalizeString(raw.qty ?? source.qty),
    unit: normalizeString(raw.unit ?? source.unit),
    item: normalizeString(raw.item ?? source.item),
    prep: normalizeString(raw.prep ?? source.prep),
    yield: normalizeString(raw.yield ?? source.yield),
    cost: normalizeString(raw.cost ?? source.cost),
    costPerUnit: null,
    supplierId: normalizeOptionalString(raw.supplierId ?? source.supplierId),
    supplierName: normalizeOptionalString(
      raw.supplierName ?? source.supplierName,
    ),
    supplierSku: normalizeOptionalString(raw.supplierSku ?? source.supplierSku),
  };

  if (base.type !== "divider") {
    const qtyValue = parseQuantity(String(base.qty));
    const costValue = parseCostValue(base.cost);
    const derived =
      Number.isFinite(costValue) &&
      Number.isFinite(qtyValue) &&
      Math.abs(qtyValue as number) > Number.EPSILON
        ? Number((costValue / (qtyValue as number)).toFixed(6))
        : null;
    const provided = raw.costPerUnit;
    const fallbackCostPerUnit =
      typeof provided === "number" && Number.isFinite(provided)
        ? Number(provided.toFixed(6))
        : null;
    base.costPerUnit = derived ?? fallbackCostPerUnit;
  }

  return base;
};

const ensureIngredientRowIds = (
  rows: Array<IngredientRow | null | undefined>,
): IngredientRow[] =>
  rows.filter(Boolean).map((row) => ensureIngredientRowId(row));

const formatDurationLabel = (value: string): string => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const cleaned = trimmed.replace(/[^0-9:]/g, "");
  if (!cleaned) return "";
  const parts = cleaned.split(":");
  let hours = 0;
  let minutes = 0;
  if (parts.length === 1) {
    minutes = Number(parts[0] || 0);
    if (!Number.isFinite(minutes)) return "";
  } else {
    hours = Number(parts[0] || 0);
    minutes = Number(parts[1] || 0);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
  }
  hours = Math.max(0, Math.floor(hours));
  minutes = Math.max(0, Math.floor(minutes));
  if (minutes >= 60) {
    hours += Math.floor(minutes / 60);
    minutes %= 60;
  }
  const partsOut: string[] = [];
  if (hours > 0) partsOut.push(`${hours} hr.`);
  if (minutes > 0) partsOut.push(`${minutes} min.`);
  if (!partsOut.length) return "";
  return partsOut.join(" ");
};

const RecipeInputPage = () => {
  const [recipeName, setRecipeName] = useState("");
  const { t } = useTranslation();
  const { findBestMatch } = useYieldStore();
  const { setToolbar, resetToolbar } = usePageToolbar();
  const collaboration = useCollaboration();
  const scaleRecipeRef = useRef<() => void>(() => {});
  const convertUnitsRef = useRef<() => void>(() => {});
  const cycleCurrencyRef = useRef<() => void>(() => {});
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    createIngredientRow(),
  ]);
  const [focusedIngredientRow, setFocusedIngredientRow] = useState<
    number | null
  >(null);
  const historyRef = useRef<any[]>([]);
  const futureRef = useRef<any[]>([]);
  const autoSnapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const autoSnapshotFingerprintRef = useRef<string>("");
  const finalizeResetTimerRef = useRef<number | null>(null);
  const [directions, setDirections] = useState("1. ");
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [finalizeState, setFinalizeState] = useState<
    "idle" | "saving" | "success"
  >("idle");
  const { addRecipe, updateRecipe, addImages, recipes } = useAppData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const recipeIdRef = useRef<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return document.documentElement.classList.contains("dark");
    } catch {
      return false;
    }
  });

  const toolbarButtonBase =
    "group relative flex h-9 w-9 items-center justify-center rounded-full border text-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const toolbarButtonTheme = isDarkMode
    ? "border-[#c8a97e]/25 bg-slate-900/70 text-white/90 hover:bg-slate-900/80 focus-visible:ring-[#c8a97e]/50 focus-visible:ring-offset-slate-950"
    : "border-slate-200 bg-white/85 text-slate-700 hover:bg-white focus-visible:ring-blue-200 focus-visible:ring-offset-white";
  const toolbarClass = `${toolbarButtonBase} ${toolbarButtonTheme}`;
  const handleScaleClick = useCallback(() => {
    scaleRecipeRef.current?.();
  }, []);
  const handleConvertUnitsClick = useCallback(() => {
    convertUnitsRef.current?.();
  }, []);
  const handleCycleCurrencyClick = useCallback(() => {
    cycleCurrencyRef.current?.();
  }, []);

  const [isRndLabsOpen, setIsRndLabsOpen] = useState(false);
  const handleRndLabsClick = useCallback(() => {
    setIsRndLabsOpen(true);
  }, []);
  const [isSubRecipePickerOpen, setIsSubRecipePickerOpen] = useState(false);
  const [rightSidebarMode, setRightSidebarMode] = useState<"recipe" | "rnd">(
    "recipe",
  );
  const [rndLayout, setRndLayout] = useState<[number, number, number]>(() => {
    if (typeof window === "undefined") return DEFAULT_RND_LAYOUT;
    try {
      const stored = window.localStorage.getItem("recipe:rnd-layout");
      if (stored) {
        return sanitizeRndLayout(JSON.parse(stored));
      }
    } catch {}
    return DEFAULT_RND_LAYOUT;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "recipe:rnd-layout",
        JSON.stringify(sanitizeRndLayout(rndLayout)),
      );
    } catch {}
  }, [rndLayout]);
  const handleRndLayoutChange = useCallback((nextLayout: number[]) => {
    if (!Array.isArray(nextLayout) || nextLayout.length !== 3) return;
    setRndLayout((prev) => {
      const next = sanitizeRndLayout(nextLayout);
      return prev.every((value, index) => value === next[index]) ? prev : next;
    });
  }, []);

  useEffect(() => {
    setRightSidebarMode((prev) => {
      const next = isRndLabsOpen ? "rnd" : "recipe";
      return prev === next ? prev : next;
    });
  }, [isRndLabsOpen]);

  useEffect(() => {
    if (!isRndLabsOpen) return;

    setRndLayout((prev) => {
      const next = sanitizeRndLayout(prev);
      return prev.every((value, index) => value === next[index]) ? prev : next;
    });

    if (typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRndLabsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isRndLabsOpen]);

  const [pickerOpen, setPickerOpen] = useState<{ index: number } | null>(null);
  const [pickerQ, setPickerQ] = useState("");
  // Sync with global theme from ThemeToggle
  useEffect(() => {
    const apply = () =>
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    apply();
    const onTheme = (e: any) =>
      setIsDarkMode(String(e?.detail?.theme || "") === "dark");
    window.addEventListener("theme:change", onTheme as any);
    const obs = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const onChef = (e: any) => setChefNotes(String(e?.detail || ""));
    window.addEventListener("recipe:chef-notes", onChef as any);
    return () => {
      window.removeEventListener("theme:change", onTheme as any);
      window.removeEventListener("recipe:chef-notes", onChef as any);
      obs.disconnect();
    };
  }, []);
  const [selectedFont, setSelectedFont] = useState("Arial");
  const [selectedFontSize, setSelectedFontSize] = useState("14px");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const allergenManualRef = React.useRef(false);
  const handleAllergensChange = (a: string[]) => {
    allergenManualRef.current = true;
    setSelectedAllergens(a);
  };
  const [selectedNationality, setSelectedNationality] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedRecipeType, setSelectedRecipeType] = useState<string[]>([]);
  const [selectedPrepMethod, setSelectedPrepMethod] = useState<string[]>([]);
  const [selectedCookingEquipment, setSelectedCookingEquipment] = useState<
    string[]
  >([]);
  const [selectedRecipeAccess, setSelectedRecipeAccess] = useState<string[]>(
    [],
  );
  const [isGlobal, setIsGlobal] = useState(false);
  const [chefNotes, setChefNotes] = useState<string>(() => {
    try {
      return localStorage.getItem("recipe:chef-notes") || "";
    } catch {
      return "";
    }
  });
  const stepImageInputRef = useRef<HTMLInputElement | null>(null);
  const STEP_IMG_MAX_W = 720;
  const [image, setImage] = useState<string | null>(null);
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState("USD");
  const [currentUnits, setCurrentUnits] = useState<"Imperial" | "Metric">(
    "Imperial",
  );
  const [yieldQty, setYieldQty] = useState<number>(6);
  const [yieldUnit, setYieldUnit] = useState<string>("QTS");
  const yieldManualRef = useRef(false);
  const [portionCount, setPortionCount] = useState<number>(6);
  const [portionUnit, setPortionUnit] = useState<string>("OZ");
  const [nutrition, setNutrition] = useState<any | null>(null);
  const [yieldOpen, setYieldOpen] = useState(false);
  const handleYieldClick = useCallback(() => {
    setYieldOpen(true);
  }, []);
  const [taxonomy, setTaxonomy] = useState<TaxonomySelection>({
    ...defaultSelection,
  });
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [nutritionPerServing, setNutritionPerServing] = useState(true);
  const dirRef = React.useRef<HTMLDivElement | null>(null);
  const [cookTime, setCookTime] = useState<string>("");
  const [cookTemp, setCookTemp] = useState<string>("");
  const [prepTime, setPrepTime] = useState<string>("");
  const [portionSize, setPortionSize] = useState<string>("");
  const [portionSizeUnit, setPortionSizeUnit] = useState<string>("OZ");

  const isFormPristine = useMemo(() => {
    const hasName = recipeName.trim().length > 0;
    const hasIngredientContent = ingredients.some((row) => {
      if (!row) return false;
      if ((row as any).type === "divider") {
        return Boolean(row.item?.trim());
      }
      return [row.item, row.qty, row.unit, row.prep, row.cost].some((value) =>
        Boolean((value || "").toString().trim()),
      );
    });
    const normalizedDirections = (directions || "").trim();
    const hasDirections =
      normalizedDirections.length > 0 && normalizedDirections !== "1.";
    const hasImage = Boolean(image);
    const hasAllergens = selectedAllergens.length > 0;
    const hasNotes = chefNotes.trim().length > 0;
    const hasMetaSelections =
      selectedNationality.length > 0 ||
      selectedCourses.length > 0 ||
      selectedRecipeType.length > 0 ||
      selectedPrepMethod.length > 0 ||
      selectedCookingEquipment.length > 0 ||
      selectedRecipeAccess.length > 0;
    const hasTimingAdjustments =
      cookTime.trim().length > 0 ||
      cookTemp.trim().length > 0 ||
      prepTime.trim().length > 0;
    return !(
      hasName ||
      hasIngredientContent ||
      hasDirections ||
      hasImage ||
      hasAllergens ||
      hasNotes ||
      hasMetaSelections ||
      hasTimingAdjustments
    );
  }, [
    recipeName,
    ingredients,
    directions,
    image,
    selectedAllergens,
    chefNotes,
    selectedNationality,
    selectedCourses,
    selectedRecipeType,
    selectedPrepMethod,
    selectedCookingEquipment,
    selectedRecipeAccess,
    cookTime,
    cookTemp,
    prepTime,
  ]);

  const servingsForLabel = useMemo(() => {
    if (!Number.isFinite(portionCount)) {
      return 1;
    }
    const normalized = Number(portionCount) || 1;
    return normalized > 0 ? normalized : 1;
  }, [portionCount]);

  const nutritionDisplay = useMemo(() => {
    if (!nutrition) return null;
    const totals = nutrition.totals;
    if (!totals) {
      return { ...nutrition, yieldQty: servingsForLabel };
    }
    const factor = 1 / servingsForLabel;
    const scaleValue = (value: number | undefined) => {
      const numeric = Number(value ?? 0);
      if (!Number.isFinite(numeric)) return 0;
      return numeric * factor;
    };
    const scaledPerServing = {
      calories: Math.round(scaleValue(totals.calories)),
      fat: Number(scaleValue(totals.fat).toFixed(2)),
      saturatedFat: Number(scaleValue(totals.saturatedFat).toFixed(2)),
      transFat: Number(scaleValue(totals.transFat).toFixed(2)),
      carbs: Number(scaleValue(totals.carbs).toFixed(2)),
      fiber: Number(scaleValue(totals.fiber).toFixed(2)),
      sugars: Number(scaleValue(totals.sugars).toFixed(2)),
      protein: Number(scaleValue(totals.protein).toFixed(2)),
      sodium: Math.round(scaleValue(totals.sodium)),
    };
    return {
      ...nutrition,
      perServing: scaledPerServing,
      yieldQty: servingsForLabel,
    };
  }, [nutrition, servingsForLabel]);

  const clearRecipeWorkspace = useCallback(
    (options?: { preserveSidebar?: boolean }) => {
      try {
        localStorage.removeItem("recipe:draft");
      } catch {}
      try {
        localStorage.removeItem("recipe:add:description");
      } catch {}
      try {
        localStorage.removeItem("recipe:chef-notes");
      } catch {}
      recipeIdRef.current = null;
      historyRef.current = [];
      futureRef.current = [];
      if (autoSnapshotTimerRef.current) {
        clearTimeout(autoSnapshotTimerRef.current);
        autoSnapshotTimerRef.current = null;
      }
      autoSnapshotFingerprintRef.current = "";
      allergenManualRef.current = false;
      yieldManualRef.current = false;
      if (stepImageInputRef.current) {
        stepImageInputRef.current.value = "";
      }
      setRecipeName("");
      setIngredients([createIngredientRow()]);
      setDirections("1. ");
      setImage(null);
      setShowImagePopup(false);
      setShowGalleryPicker(false);
      setSelectedAllergens([]);
      setSelectedNationality([]);
      setSelectedCourses([]);
      setSelectedRecipeType([]);
      setSelectedPrepMethod([]);
      setSelectedCookingEquipment([]);
      setSelectedRecipeAccess([]);
      setTaxonomy({ ...defaultSelection });
      setCurrentCurrency("USD");
      setCurrentUnits("Imperial");
      setYieldQty(6);
      setYieldUnit("QTS");
      setPortionCount(6);
      setPortionUnit("OZ");
      setCookTime("");
      setCookTemp("");
      setPrepTime("");
      setNutrition(null);
      setNutritionLoading(false);
      setNutritionError(null);
      setNutritionPerServing(true);
      setChefNotes("");
      setYieldOpen(false);
      if (!options?.preserveSidebar) {
        setIsRightSidebarCollapsed(false);
      }
    },
    [
      setRecipeName,
      setIngredients,
      setDirections,
      setImage,
      setShowImagePopup,
      setShowGalleryPicker,
      setSelectedAllergens,
      setSelectedNationality,
      setSelectedCourses,
      setSelectedRecipeType,
      setSelectedPrepMethod,
      setSelectedCookingEquipment,
      setSelectedRecipeAccess,
      setTaxonomy,
      setCurrentCurrency,
      setCurrentUnits,
      setYieldQty,
      setYieldUnit,
      setPortionCount,
      setPortionUnit,
      setCookTime,
      setCookTemp,
      setPrepTime,
      setNutrition,
      setNutritionLoading,
      setNutritionError,
      setNutritionPerServing,
      setChefNotes,
      setYieldOpen,
      setIsRightSidebarCollapsed,
      createIngredientRow,
    ],
  );

  useEffect(() => {
    return () => {
      if (finalizeResetTimerRef.current !== null) {
        window.clearTimeout(finalizeResetTimerRef.current);
        finalizeResetTimerRef.current = null;
      }
    };
  }, []);

  const finalizeRecipe = useCallback(() => {
    if (finalizeState === "saving") {
      return;
    }
    if (isFormPristine) {
      toast({
        title: t("recipe.actions.finalizeEmptyTitle", "Nothing to finalize"),
        description: t(
          "recipe.actions.finalizeEmptyDescription",
          "Add details before finalizing the recipe.",
        ),
        variant: "destructive",
      });
      return;
    }
    let succeeded = false;
    setFinalizeState("saving");
    try {
      const title = (recipeName || "").trim() || "Untitled Recipe";
      const menuDescription = (() => {
        try {
          return localStorage.getItem("recipe:add:description") || "";
        } catch {
          return "";
        }
      })();
      const ingLines = ingredients
        .map((r) =>
          [r.qty, r.unit, r.item, r.prep].filter(Boolean).join(" ").trim(),
        )
        .filter(Boolean);
      const insLines = String(directions || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const cover = image && image.startsWith("data:") ? [image] : undefined;
      const perServingMacros = nutritionDisplay?.perServing ?? null;
      const nutritionSnapshot = nutritionDisplay
        ? { ...nutritionDisplay, savedAt: Date.now() }
        : nutrition
          ? { ...nutrition, savedAt: Date.now() }
          : null;
      const recipeNutrition = perServingMacros
        ? {
            calories: perServingMacros.calories,
            fat: perServingMacros.fat,
            carbs: perServingMacros.carbs,
            protein: perServingMacros.protein,
            fiber: perServingMacros.fiber,
            sugars: perServingMacros.sugars,
            sodium: perServingMacros.sodium,
            cholesterol: undefined,
          }
        : null;
      const metadata = {
        source: "manual",
        taxonomy,
        published: true,
        description: menuDescription,
        yield: { quantity: yieldQty, unit: yieldUnit },
        portion: { count: portionCount, unit: portionUnit },
        times: { cook: cookTime, temp: cookTemp, prep: prepTime },
        access: [...selectedRecipeAccess],
        allergens: [...selectedAllergens],
        nationality: [...selectedNationality],
        courses: [...selectedCourses],
        recipeType: [...selectedRecipeType],
        prepMethod: [...selectedPrepMethod],
        cookingEquipment: [...selectedCookingEquipment],
        nutritionSnapshot,
      };
      const recipeData = {
        title,
        ingredients: ingLines,
        instructions: insLines,
        imageDataUrls: cover,
        tags: [],
        nutrition: recipeNutrition,
        extra: metadata,
        isGlobal,
        createdBy: "Current User", // TODO: Get from auth context
        lastModifiedBy: "Current User", // TODO: Get from auth context
        lastModifiedAt: Date.now(),
      };

      if (!recipeIdRef.current) {
        recipeIdRef.current = addRecipe(recipeData);
      } else {
        updateRecipe(recipeIdRef.current, recipeData);
      }
      succeeded = true;
      toast({
        title: t("recipe.actions.finalizedTitle", "Recipe finalized"),
        description: t(
          "recipe.actions.finalizedDescription",
          "Saved to your library and cleared for the next entry.",
        ),
      });
    } catch (error: any) {
      const message =
        typeof error?.message === "string" && error.message.trim().length
          ? error.message
          : t("recipe.actions.finalizedErrorFallback", "Unexpected error");
      console.error("Finalize recipe failed", error);
      toast({
        title: t("recipe.actions.finalizedError", "Unable to finalize recipe"),
        description: message,
        variant: "destructive",
      });
    } finally {
      if (succeeded) {
        setFinalizeState("success");
        clearRecipeWorkspace({ preserveSidebar: true });
        if (finalizeResetTimerRef.current !== null) {
          window.clearTimeout(finalizeResetTimerRef.current);
        }
        finalizeResetTimerRef.current = window.setTimeout(() => {
          setFinalizeState("idle");
          finalizeResetTimerRef.current = null;
        }, 2250);
      } else {
        setFinalizeState("idle");
      }
    }
  }, [
    addRecipe,
    updateRecipe,
    taxonomy,
    recipeName,
    ingredients,
    directions,
    image,
    clearRecipeWorkspace,
    toast,
    t,
    isFormPristine,
    finalizeState,
    yieldQty,
    yieldUnit,
    portionCount,
    portionUnit,
    cookTime,
    cookTemp,
    prepTime,
    selectedRecipeAccess,
    selectedAllergens,
    selectedNationality,
    selectedCourses,
    selectedRecipeType,
    selectedPrepMethod,
    selectedCookingEquipment,
    nutritionDisplay,
    nutrition,
  ]);

  const handleClearForm = useCallback(() => {
    if (isFormPristine) return;
    const confirmMessage = t(
      "recipe.actions.clearConfirm",
      "Clear all fields? This can't be undone.",
    );
    if (!window.confirm(confirmMessage)) return;
    clearRecipeWorkspace();
    toast({
      title: t("recipe.actions.clearedTitle", "Workspace cleared"),
      description: t(
        "recipe.actions.clearedDescription",
        "Start fresh with a blank recipe draft.",
      ),
    });
  }, [clearRecipeWorkspace, isFormPristine, t, toast]);

  const subRecipeOptions = useMemo<SubRecipeOption[]>(() => {
    if (!recipes || recipes.length === 0) return [];
    return [...recipes]
      .map((recipe) => {
        const serverNotes = recipe.extra?.serverNotes as
          | RecipeExport
          | undefined;
        const costValue =
          typeof serverNotes?.totals?.fullRecipeCost === "number"
            ? serverNotes.totals.fullRecipeCost
            : null;
        const yieldQtyValue =
          typeof serverNotes?.yieldQty === "number"
            ? serverNotes.yieldQty
            : null;
        return {
          id: recipe.id,
          title: recipe.title,
          course: recipe.course ?? null,
          cuisine: recipe.cuisine ?? null,
          tags: recipe.tags ?? [],
          cost: costValue,
          currency: serverNotes?.currency ?? null,
          yieldQty: yieldQtyValue,
          yieldUnit: serverNotes?.yieldUnit ?? null,
        } satisfies SubRecipeOption;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [recipes]);

  const getCurrencySymbol = (c: string) =>
    c === "EUR" ? "€" : c === "GBP" ? "£" : c === "JPY" ? "¥" : "$";
  const formatRecipeCost = useCallback(
    (value: number | null | undefined, currency?: string | null) => {
      if (typeof value !== "number" || Number.isNaN(value)) return "—";
      const symbol = getCurrencySymbol(currency || currentCurrency);
      return `${symbol}${value.toFixed(2)}`;
    },
    [currentCurrency],
  );
  const calculateTotalCost = () =>
    ingredients.reduce((sum, row) => {
      if (row.type === "divider") return sum;
      const parsed = parseCostValue(row.cost);
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
  const calculatePortionCost = () => {
    const t = calculateTotalCost();
    const n = portionCount > 0 ? portionCount : 1;
    return t / n;
  };

  const actionButtonBase =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";
  const finalizeButtonTone =
    finalizeState === "success"
      ? isDarkMode
        ? "bg-emerald-400 text-[#04060d] hover:bg-emerald-300 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-slate-950 disabled:opacity-100 disabled:pointer-events-none"
        : "bg-emerald-500 text-white hover:bg-emerald-500/90 focus-visible:ring-emerald-400 focus-visible:ring-offset-white disabled:opacity-100 disabled:pointer-events-none"
      : isDarkMode
        ? "bg-[#c8a97e] text-[#04060d] hover:bg-[#c8a97e] focus-visible:ring-[#c8a97e]/50 focus-visible:ring-offset-slate-950"
        : "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400 focus-visible:ring-offset-white";
  const finalizeButtonClasses = `${actionButtonBase} ${finalizeButtonTone}`;
  const clearButtonClasses = `${actionButtonBase} ${isDarkMode ? "border border-[#c8a97e]/50 text-[#c8a97e]/80 hover:bg-[#c8a97e]/10 focus-visible:ring-[#c8a97e]/30 focus-visible:ring-offset-slate-950" : "border border-slate-400 text-slate-700 hover:bg-slate-900/5 focus-visible:ring-slate-400/50 focus-visible:ring-offset-white"}`;
  const actionBarClasses = isDarkMode
    ? "border-[#c8a97e]/30 bg-slate-950/60 shadow-[0_0_32px_rgba(56,189,248,0.15)]"
    : "border-slate-200 bg-white/80 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.25)]";
  const actionCaptionTone = isDarkMode ? "text-[#c8a97e]/80/90" : "text-slate-600";
  const actionDescriptionTone = isDarkMode
    ? "text-[#c8a97e]/80/70"
    : "text-slate-500";

  const insertSubRecipeRows = (selected: SubRecipeOption[]) => {
    if (!selected.length) return;
    setIngredients((prev) => {
      const next = ensureIngredientRowIds(prev.slice());
      const isRowEmpty = (row: IngredientRow) =>
        [row.qty, row.unit, row.item, row.prep, row.cost]
          .map((value) => String(value ?? "").trim())
          .every((value) => value.length === 0);
      selected.forEach((option) => {
        const blankIndex = next.findIndex((row) => isRowEmpty(row));
        const parsedCost =
          typeof option.cost === "number" && Number.isFinite(option.cost)
            ? option.cost
            : null;
        const newRow = createIngredientRow({
          item: `Recipe - ${option.title}`,
          qty: "1",
          unit: option.yieldUnit ?? "",
          prep: "",
          yield: "100",
          cost: parsedCost != null ? parsedCost.toFixed(2) : "",
          costPerUnit: parsedCost ?? null,
        });
        if (blankIndex >= 0) next[blankIndex] = newRow;
        else next.push(newRow);
      });
      return ensureIngredientRowIds(next);
    });
    setTimeout(() => pushHistory({ ...serialize(), ts: Date.now() }), 0);
  };

  const detectAllergensFromIngredients = (rows: IngredientRow[]) => {
    const text = rows
      .filter((row) => row.type !== "divider")
      .map((row) => row.item)
      .join(" ")
      .toLowerCase();
    const s = new Set<string>();
    if (
      /(milk|cream|butter|cheese|half-?and-?half|yogurt|whey|ricotta|mozzarella|parmesan|parmigiano|pecorino|cheddar|gouda|feta)/.test(
        text,
      )
    )
      s.add("Dairy");
    if (/flour|wheat|barley|rye|bread|pasta|cracker/.test(text))
      s.add("Gluten");
    if (/egg\b|eggs\b|egg yolk|egg white/.test(text)) s.add("Eggs");
    if (/peanut/.test(text)) s.add("Peanuts");
    if (/almond|walnut|pecan|cashew|pistachio|hazelnut|macadamia/.test(text))
      s.add("Nuts");
    if (/sesame/.test(text)) s.add("Sesame");
    if (/soy\b|soybean|soy sauce|tofu|edamame/.test(text)) s.add("Soy");
    if (/clam|shrimp|crab|lobster|scallop|oyster/.test(text))
      s.add("Shellfish");
    if (/cod|salmon|tuna|anchov|trout|halibut|haddock|sardine/.test(text))
      s.add("Fish");
    if (/onion|shallot|leek|scallion|chive/.test(text)) s.add("Onion/Allium");
    if (/garlic/.test(text)) s.add("Garlic");
    return Array.from(s);
  };
  useEffect(() => {
    if (!allergenManualRef.current)
      setSelectedAllergens(detectAllergensFromIngredients(ingredients));
  }, [ingredients]);

  const inputClass = `border p-2.5 rounded-lg text-sm transition-all focus:shadow-md focus:ring-2 ${isDarkMode ? "bg-black/50 border-[#c8a97e]/40 text-[#c8a97e] focus:ring-[#c8a97e]/25 shadow-none" : "bg-white border-gray-300 text-black focus:ring-blue-400/30 focus:border-blue-500 shadow-lg"}`;
  const infoInputClass = useMemo(
    () =>
      `rounded-lg border px-1.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-1 ${
        isDarkMode
          ? "bg-black/40 border-[#c8a97e]/30 text-[#c8a97e]/80 focus:border-[#c8a97e] focus:ring-[#c8a97e]/30"
          : "bg-white border-slate-300 text-slate-800 focus:border-slate-500 focus:ring-slate-300/70"
      }`,
    [isDarkMode],
  );
  const infoLabelClass = useMemo(
    () =>
      `font-bold uppercase tracking-[0.22em] text-[10px] text-center ${
        isDarkMode ? "text-[#c8a97e]" : "text-slate-700"
      }`,
    [isDarkMode],
  );
  const infoHelperClass = useMemo(
    () => (isDarkMode ? "text-[#c8a97e]/70" : "text-slate-500"),
    [isDarkMode],
  );
  const infoValuePillClass = useMemo(
    () =>
      `inline-flex w-full items-center justify-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-semibold leading-tight ${
        isDarkMode
          ? "border-[#c8a97e]/30 bg-black/40 text-white/80"
          : "border-slate-300 bg-white text-slate-800"
      }`,
    [isDarkMode],
  );
  const cookTimeDisplay = useMemo(
    () => formatDurationLabel(cookTime),
    [cookTime],
  );
  const prepTimeDisplay = useMemo(
    () => formatDurationLabel(prepTime),
    [prepTime],
  );

  // Normalize US volumes to best unit (e.g., 3072 1/4 tsp -> 4 gal)
  const normalizeImperialVolume = (
    qty: number,
    unit: string,
  ): { qty: number; unit: string } => {
    const U = unit.toUpperCase();
    const tspPer: Record<string, number> = {
      TSP: 1,
      TEASPOON: 1,
      TEASPOONS: 1,
      TBSP: 3,
      TABLESPOON: 3,
      TABLESPOONS: 3,
      FLOZ: 6,
      "FL OZ": 6,
      OZFL: 6,
      CUP: 48,
      CUPS: 48,
      PINT: 96,
      PT: 96,
      QUART: 192,
      QT: 192,
      QTS: 192,
      QUARTS: 192,
      GALLON: 768,
      GAL: 768,
      GALLONS: 768,
    };
    const toKey = (u: string) =>
      u.replace(/\./g, "").replace(/\s+/g, "").toUpperCase();
    const k = toKey(U);
    const per = tspPer[k];
    if (!per || !Number.isFinite(qty)) return { qty, unit: U };
    let totalTsp = qty * per;
    const order: [string, number][] = [
      ["GALLON", 768],
      ["QUART", 192],
      ["PINT", 96],
      ["CUP", 48],
      ["FLOZ", 6],
      ["TBSP", 3],
      ["TSP", 1],
    ];
    for (const [name, mul] of order) {
      if (totalTsp >= mul) {
        const q = totalTsp / mul;
        return {
          qty: Number(q.toFixed(2)),
          unit: name === "FLOZ" ? "FL OZ" : name,
        };
      }
    }
    return { qty, unit: U };
  };

  // Normalize imperial weights OZ -> LBS when appropriate
  const normalizeImperialWeight = (
    qty: number,
    unit: string,
  ): { qty: number; unit: string } => {
    const U = unit.toUpperCase();
    if (U === "OZ" || U === "OUNCE" || U === "OUNCES") {
      if (qty >= 16) return { qty: Number((qty / 16).toFixed(2)), unit: "LBS" };
      return { qty, unit: "OZ" };
    }
    return { qty, unit: U };
  };

  React.useEffect(() => {
    const el = dirRef.current;
    if (!el) return;
    if (document.activeElement !== el && el.textContent !== directions)
      el.textContent = directions;
  }, [directions]);

  // Autosave + simple versions
  const serialize = () => ({
    recipeName,
    ingredients,
    directions,
    isDarkMode,
    yieldQty,
    yieldUnit,
    portionCount,
    portionUnit,
    cookTime,
    cookTemp,
    prepTime,
    selectedAllergens,
    selectedNationality,
    selectedCourses,
    selectedRecipeType,
    selectedPrepMethod,
    selectedCookingEquipment,
    selectedRecipeAccess,
    taxonomy,
    image,
  });

  useEffect(() => {
    const fingerprint = JSON.stringify({
      recipeName,
      ingredients,
      directions,
      yieldQty,
      yieldUnit,
    });
    if (autoSnapshotFingerprintRef.current === fingerprint) return;
    autoSnapshotFingerprintRef.current = fingerprint;

    if (autoSnapshotTimerRef.current) {
      clearTimeout(autoSnapshotTimerRef.current);
    }

    autoSnapshotTimerRef.current = setTimeout(() => {
      const payload = serialize();
      const activeIngredients = ingredients.filter(
        (row) => row.type !== "divider",
      ).length;
      const summaryParts = [recipeName.trim() || "Untitled recipe"];
      summaryParts.push(
        `${activeIngredients} ingredient${activeIngredients === 1 ? "" : "s"}`,
      );
      if (yieldQty)
        summaryParts.push(`yield ${yieldQty} ${yieldUnit || ""}`.trim());
      collaboration.recordVersionSnapshot({
        summary: summaryParts.join(" · "),
        payload,
        auto: true,
        createdBy: "Auto capture",
      });
      autoSnapshotTimerRef.current = null;
    }, 90000);

    return () => {
      if (autoSnapshotTimerRef.current) {
        clearTimeout(autoSnapshotTimerRef.current);
        autoSnapshotTimerRef.current = null;
      }
    };
  }, [recipeName, ingredients, directions, yieldQty, yieldUnit, collaboration]);

  const restore = (s: any) => {
    if (!s) return;
    setRecipeName(s.recipeName || "");
    const baseRows = s.ingredients || [createIngredientRow()];
    // Auto-parse any row whose item starts with qty/unit (e.g., "24 oz marinara")
    const fixedRows = baseRows.map((r: any) => {
      if (r.qty && r.unit) return r;
      const txt = String(r.item || "");
      if (!txt) return r;
      if (!/^(\s*[0-9¼½¾⅓⅔⅛⅜⅝⅞]|\s*\/\d+|.*,)/i.test(txt)) return r;
      const p = parseIngredientInline(txt.replace(/^\s*\/(\d+)/, "1/$1"));
      if (!p) return r;
      return {
        ...r,
        qty: p.qty ?? r.qty,
        unit: ((p.unit ?? r.unit) || "").toUpperCase(),
        item: p.item ?? r.item,
        prep: p.prep ?? r.prep,
      };
    });
    setIngredients(ensureIngredientRowIds(fixedRows));
    setDirections(s.directions || "1. ");
    setIsDarkMode(!!s.isDarkMode);
    setYieldQty(s.yieldQty || 0);
    setYieldUnit(s.yieldUnit || "QTS");
    setPortionCount(s.portionCount || 1);
    setPortionUnit(s.portionUnit || "OZ");
    setCookTime(s.cookTime || "");
    setCookTemp(s.cookTemp || "");
    setPrepTime(s.prepTime || "");
    setSelectedAllergens(s.selectedAllergens || []);
    setSelectedNationality(s.selectedNationality || []);
    setSelectedCourses(s.selectedCourses || []);
    setSelectedRecipeType(s.selectedRecipeType || []);
    setSelectedPrepMethod(s.selectedPrepMethod || []);
    setSelectedCookingEquipment(s.selectedCookingEquipment || []);
    setSelectedRecipeAccess(s.selectedRecipeAccess || []);
    if (s.taxonomy) setTaxonomy({ ...defaultSelection, ...s.taxonomy });
    setImage(s.image || null);

    const meta = (s.extra ?? {}) as any;
    if (meta && typeof meta === "object") {
      if (meta.yield) {
        const qty = Number(meta.yield.quantity);
        if (Number.isFinite(qty) && qty >= 0) {
          setYieldQty(qty);
        }
        if (meta.yield.unit) {
          setYieldUnit(String(meta.yield.unit).toUpperCase());
        }
      }
      if (meta.portion) {
        const count = Number(meta.portion.count);
        if (Number.isFinite(count) && count > 0) {
          setPortionCount(count);
        }
        if (meta.portion.unit) {
          setPortionUnit(String(meta.portion.unit).toUpperCase());
        }
      }
      if (meta.times) {
        if (meta.times.cook != null) setCookTime(String(meta.times.cook));
        if (meta.times.temp != null) setCookTemp(String(meta.times.temp));
        if (meta.times.prep != null) setPrepTime(String(meta.times.prep));
      }
      if (Array.isArray(meta.access)) {
        setSelectedRecipeAccess(
          meta.access.map((value: unknown) => String(value)),
        );
      }
      if (Array.isArray(meta.allergens) && meta.allergens.length) {
        setSelectedAllergens(
          meta.allergens.map((value: unknown) => String(value)),
        );
      }
      if (Array.isArray(meta.nationality) && meta.nationality.length) {
        setSelectedNationality(
          meta.nationality.map((value: unknown) => String(value)),
        );
      }
      if (Array.isArray(meta.courses) && meta.courses.length) {
        setSelectedCourses(meta.courses.map((value: unknown) => String(value)));
      }
      if (Array.isArray(meta.recipeType) && meta.recipeType.length) {
        setSelectedRecipeType(
          meta.recipeType.map((value: unknown) => String(value)),
        );
      }
      if (Array.isArray(meta.prepMethod) && meta.prepMethod.length) {
        setSelectedPrepMethod(
          meta.prepMethod.map((value: unknown) => String(value)),
        );
      }
      if (
        Array.isArray(meta.cookingEquipment) &&
        meta.cookingEquipment.length
      ) {
        setSelectedCookingEquipment(
          meta.cookingEquipment.map((value: unknown) => String(value)),
        );
      }
      if (meta.nutritionSnapshot) {
        setNutrition(meta.nutritionSnapshot);
      }
    }
  };
  const pushHistory = (snap: any) => {
    historyRef.current.push(snap);
    if (historyRef.current.length > 50) historyRef.current.shift();
    localStorage.setItem("recipe:versions", JSON.stringify(historyRef.current));
  };
  useEffect(() => {
    const saved = localStorage.getItem("recipe:draft");
    if (saved)
      try {
        restore(JSON.parse(saved));
      } catch {}
    const versions = localStorage.getItem("recipe:versions");
    if (versions)
      try {
        historyRef.current = JSON.parse(versions) || [];
      } catch {}
    // URL share restore
    if (location.hash.startsWith("#r="))
      try {
        const data = JSON.parse(
          atob(decodeURIComponent(location.hash.slice(3))),
        );
        restore(data);
      } catch {}
  }, []);
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.image) setImage(e.detail.image);
      setShowImagePopup(true);
    };
    window.addEventListener("openImageEditor", handler as any);
    return () => window.removeEventListener("openImageEditor", handler as any);
  }, []);
  // Sync with global ThemeToggle (listens to html.dark)
  useEffect(() => {
    const el = document.documentElement;
    const apply = () => setIsDarkMode(el.classList.contains("dark"));
    apply();
    const obs = new MutationObserver(apply);
    try {
      obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    } catch {}
    return () => {
      try {
        obs.disconnect();
      } catch {}
    };
  }, []);
  useEffect(() => {
    const seeded = localStorage.getItem("kb:culinary:seeded:v1");
    if (seeded) return;
    (async () => {
      try {
        const res = await fetch(
          "https://cdn.builder.io/o/assets%2Faccc7891edf04665961a321335d9540b%2F9770e28941e54ac1984842723ff5ddfa?alt=media&token=echo-ai-framework&apiKey=accc7891edf04665961a321335d9540b",
        );
        const data = await res.json();
        const counts: Record<string, number> = {};
        const add = (k: string, v: number = 1) => {
          const key = String(k || "")
            .toLowerCase()
            .trim();
          if (!key) return;
          counts[key] = (counts[key] || 0) + v;
        };
        if (Array.isArray(data)) data.forEach((t: any) => add(String(t)));
        if (data && typeof data === "object") {
          if (Array.isArray(data.terms))
            data.terms.forEach((t: any) => add(String(t)));
          if (
            data.terms &&
            typeof data.terms === "object" &&
            !Array.isArray(data.terms)
          ) {
            for (const [k, v] of Object.entries(data.terms))
              add(k, Number(v as any) || 1);
          }
          if (Array.isArray(data.aliases))
            data.aliases.forEach((t: any) => add(String(t)));
        }
        const kbRaw = localStorage.getItem("kb:cook") || "{}";
        const kb = JSON.parse(kbRaw || "{}");
        kb.terms = { ...(kb.terms || {}) };
        for (const [k, v] of Object.entries(counts))
          kb.terms[k] = (kb.terms[k] || 0) + (v as number);
        localStorage.setItem("kb:cook", JSON.stringify(kb));
        localStorage.setItem("kb:culinary:seeded:v1", "1");
      } catch {}
    })();
  }, []);
  useEffect(() => {
    const onAction = (ev: any) => {
      const t = ev?.detail?.type;
      if (!t) return;
      if (t === "convertUnits") convertUnits();
      if (t === "cycleCurrency") cycleCurrency();
      if (t === "scale") scaleRecipe();
      if (t === "saveVersion") pushHistory({ ...serialize(), ts: Date.now() });
      if (t === "openYieldLab") setYieldOpen(true);
      if (t === "finalizeImport") {
        finalizeRecipe();
      }
    };
    window.addEventListener("recipe:action", onAction as any);
    return () => window.removeEventListener("recipe:action", onAction as any);
  }, [
    ingredients,
    portionCount,
    currentUnits,
    currentCurrency,
    finalizeRecipe,
  ]);
  useEffect(() => {
    const toolbarItems: PageToolbarItem[] = [
      {
        id: "scale",
        label: t("recipe.actions.scale", "Scale Recipe"),
        ariaLabel: t("recipe.actions.scale", "Scale Recipe"),
        icon: Scale,
        onClick: handleScaleClick,
        className: toolbarClass,
        title: t("recipe.actions.scale", "Scale Recipe"),
      },
      {
        id: "language",
        type: "custom",
        element: (
          <LanguageMenu
            variant="compact"
            isDark={isDarkMode}
            className={toolbarClass}
            align="end"
          />
        ),
      },
      {
        id: "convert",
        label: t("recipe.actions.convertUnits", "Convert Units"),
        ariaLabel: t("recipe.actions.convertUnits", "Convert Units"),
        icon: Ruler,
        onClick: handleConvertUnitsClick,
        className: toolbarClass,
        title: t("recipe.actions.convertUnits", "Convert Units"),
      },
      {
        id: "currency",
        label: t("recipe.actions.currency", "Change Currency"),
        ariaLabel: t("recipe.actions.currency", "Change Currency"),
        icon: CircleDollarSign,
        onClick: handleCycleCurrencyClick,
        className: toolbarClass,
        title: t("recipe.actions.currency", "Change Currency"),
      },
      {
        id: "yield",
        label: "Yield Lab",
        ariaLabel: "Yield Lab",
        icon: FlaskConical,
        onClick: handleYieldClick,
        className: toolbarClass,
        title: "Yield Lab",
      },
      {
        id: "rnd",
        label: "R&D Labs",
        ariaLabel: "R&D Labs",
        icon: Atom,
        onClick: handleRndLabsClick,
        className: toolbarClass,
        title: "R&D Labs",
      },
    ];
    setToolbar({
      title: t("nav.addRecipe", "Add Recipe"),
      items: toolbarItems,
    });
    return () => {
      resetToolbar();
    };
  }, [
    setToolbar,
    resetToolbar,
    toolbarClass,
    handleScaleClick,
    handleConvertUnitsClick,
    handleCycleCurrencyClick,
    handleYieldClick,
    handleRndLabsClick,
    isDarkMode,
    t,
  ]);
  useEffect(() => {
    const id = setTimeout(() => {
      const s = serialize();
      localStorage.setItem("recipe:draft", JSON.stringify(s));
      const title = (recipeName || "").trim();
      const ingLines = ingredients
        .map((r) =>
          [r.qty, r.unit, r.item, r.prep].filter(Boolean).join(" ").trim(),
        )
        .filter(Boolean);
      const insLines = (directions || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (title) {
        const recipeUpdateData = {
          title,
          ingredients: ingLines,
          instructions: insLines,
          extra: { taxonomy },
          isGlobal,
          lastModifiedBy: "Current User",
          lastModifiedAt: Date.now(),
        };

        if (!recipeIdRef.current) {
          recipeIdRef.current = addRecipe({
            ...recipeUpdateData,
            tags: [],
            extra: { source: "manual", taxonomy },
          });
        } else {
          updateRecipe(recipeIdRef.current, recipeUpdateData);
        }
      }
    }, 600);
    return () => clearTimeout(id);
  }, [
    recipeName,
    ingredients,
    directions,
    isDarkMode,
    yieldQty,
    yieldUnit,
    portionCount,
    portionUnit,
    cookTime,
    cookTemp,
    prepTime,
    selectedAllergens,
    selectedNationality,
    selectedCourses,
    selectedRecipeType,
    selectedPrepMethod,
    selectedCookingEquipment,
    selectedRecipeAccess,
    image,
  ]);
  useEffect(() => {
    const t = setTimeout(() => setIsRightSidebarCollapsed(true), 450);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const s = serialize();
        pushHistory({ ...s, ts: Date.now() });
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        const prev = historyRef.current.pop();
        if (prev) {
          futureRef.current.push(serialize());
          restore(prev);
        }
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        const next = futureRef.current.pop();
        if (next) {
          historyRef.current.push(serialize());
          restore(next);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Ingredient grid helpers + keyboard nav
  const focusIngredientCell = useCallback(
    (rowIndex: number, colIndex: number = 0) => {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLInputElement>(
          `input[data-row="${rowIndex}"][data-col="${colIndex}"]`,
        );
        if (el) {
          el.focus();
          el.select();
        }
      });
    },
    [],
  );

  const updateIngredientRow = useCallback(
    (index: number, patch: Partial<IngredientRow>) => {
      setIngredients((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const next = prev.slice();
        const current = ensureIngredientRowId(next[index]);
        next[index] = ensureIngredientRowId({ ...current, ...patch });
        return next;
      });
    },
    [setIngredients],
  );

  const addIngredientRow = useCallback(
    (index?: number) => {
      const targetRow =
        typeof index === "number" && index >= 0
          ? index + 1
          : ingredients.length;
      setIngredients((prev) => {
        const next = ensureIngredientRowIds(prev.slice());
        const insertAt =
          typeof index === "number" && index >= 0 && index < prev.length
            ? index + 1
            : prev.length;
        next.splice(insertAt, 0, createIngredientRow());
        return ensureIngredientRowIds(next);
      });
      focusIngredientCell(targetRow, 0);
    },
    [focusIngredientCell, ingredients.length, setIngredients],
  );

  const removeIngredientRow = useCallback(
    (index: number) => {
      setIngredients((prev) => {
        if (prev.length === 1) return [createIngredientRow()];
        const next = prev.slice();
        if (index >= 0 && index < next.length) next.splice(index, 1);
        const ensured = ensureIngredientRowIds(
          next.length ? next : [createIngredientRow()],
        );
        return ensured;
      });
      focusIngredientCell(Math.max(0, index - 1), 0);
    },
    [focusIngredientCell, setIngredients],
  );

  const reorderIngredientRows = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      setIngredients((prev) => {
        if (from < 0 || from >= prev.length) return prev;
        const next = ensureIngredientRowIds(prev.slice());
        const [moved] = next.splice(from, 1);
        const clampedTarget = Math.max(0, Math.min(to, next.length));
        next.splice(clampedTarget, 0, moved);
        return ensureIngredientRowIds(next);
      });
      focusIngredientCell(Math.max(0, Math.min(to, ingredients.length - 1)), 0);
    },
    [focusIngredientCell, ingredients.length, setIngredients],
  );

  const handleAddIngredientWithContext = useCallback(() => {
    if (focusedIngredientRow !== null && focusedIngredientRow >= 0) {
      addIngredientRow(focusedIngredientRow);
    } else {
      addIngredientRow();
    }
  }, [addIngredientRow, focusedIngredientRow]);

  const addDividerRow = useCallback(() => {
    let insertedIndex = 0;
    setIngredients((prev) => {
      const next = ensureIngredientRowIds(prev.slice());
      const existingDividers = next.filter(
        (row) => row.type === "divider",
      ).length;
      const label = `Step ${existingDividers + 1}`;
      next.push(createDividerRow(label));
      insertedIndex = next.length - 1;
      return ensureIngredientRowIds(next);
    });
    setTimeout(() => focusIngredientCell(insertedIndex, 2), 0);
  }, [focusIngredientCell, setIngredients]);

  const handleIngredientFieldChange = useCallback(
    (index: number, field: keyof IngredientRow) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const raw = event.target.value;
        setFocusedIngredientRow(index);
        setIngredients((prev) => {
          if (index < 0 || index >= prev.length) return prev;
          const next = prev.slice();
          const current = ensureIngredientRowId(next[index]);
          if (current.type === "divider" && field !== "item") return prev;
          let value = raw;
          if (field === "unit") value = value.toUpperCase();
          if (field === "yield") value = value.replace(/[^0-9.,]/g, "");
          if (field === "cost") value = value.replace(/[^0-9.,-]/g, "");
          const updated = ensureIngredientRowId({ ...current, [field]: value });
          if (field === "qty" && updated.type === "ingredient") {
            const qtyValue = parseQuantity(value);
            if (
              Number.isFinite(qtyValue) &&
              Math.abs(qtyValue) > Number.EPSILON &&
              updated.costPerUnit != null
            ) {
              const newCost = qtyValue * updated.costPerUnit;
              updated.cost = newCost.toFixed(2);
            }
          }
          next[index] = updated;
          return ensureIngredientRowIds(next);
        });
      },
    [setIngredients],
  );

  const handleIngredientBlur = useCallback(
    (index: number, field: "yield" | "cost") =>
      (event: React.FocusEvent<HTMLInputElement>) => {
        const raw = event.target.value;
        if (!raw) return;
        const numeric = Number(
          raw.replace(/[^0-9.,-]/g, "").replace(/,/g, "."),
        );
        if (!Number.isFinite(numeric)) return;
        setIngredients((prev) => {
          if (index < 0 || index >= prev.length) return prev;
          const next = prev.slice();
          const current = ensureIngredientRowId(next[index]);
          if (current.type === "divider") return prev;
          if (field === "yield") {
            const normalized = Math.max(0, Math.min(999, numeric));
            const formatted =
              normalized % 1 === 0
                ? String(Math.round(normalized))
                : normalized.toFixed(2);
            next[index] = ensureIngredientRowId({
              ...current,
              yield: formatted,
            });
          } else {
            const normalized = Math.max(-999999, Math.min(999999, numeric));
            const formattedCost = normalized.toFixed(2);
            const qtyValue = parseQuantity(current.qty);
            const nextCostPerUnit =
              Number.isFinite(qtyValue) && Math.abs(qtyValue) > Number.EPSILON
                ? normalized / qtyValue
                : current.costPerUnit;
            const sanitizedCostPerUnit =
              typeof nextCostPerUnit === "number" &&
              Number.isFinite(nextCostPerUnit)
                ? Number(nextCostPerUnit.toFixed(6))
                : null;
            next[index] = ensureIngredientRowId({
              ...current,
              cost: formattedCost,
              costPerUnit: sanitizedCostPerUnit,
            });
          }
          return ensureIngredientRowIds(next);
        });
      },
    [setIngredients],
  );

  const handleIngredientSelected = useCallback(
    (index: number, inventoryId: string, inventoryItem: any) => {
      // Import here to avoid circular dependency
      const { getCurrentCostPerUnit } = require("@/data/inventoryItems");

      setIngredients((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const next = prev.slice();
        const current = ensureIngredientRowId(next[index]);
        if (current.type === "divider") return prev;

        const costPerUnit = getCurrentCostPerUnit(inventoryItem);

        // Update the row with inventory linking info
        const updated = ensureIngredientRowId({
          ...current,
          inventoryId,
          inventoryName: inventoryItem.canonicalName || inventoryItem.name,
          costPerUnit: costPerUnit,
          mappingConfidence: 1.0, // Direct selection = perfect match
        });

        next[index] = updated;
        return ensureIngredientRowIds(next);
      });
    },
    [setIngredients],
  );

  const ingredientYieldInsights = useMemo<
    (IngredientYieldInsight | null)[]
  >(() => {
    return ingredients.map((row) => {
      if (row.type === "divider") return null;
      const item = row.item.trim();
      if (!item) return null;
      const prep = row.prep.trim();
      const base = computeBaseYield(item, prep);
      const chef = findBestMatch({
        item,
        prep: prep || undefined,
        method: prep || undefined,
      });
      const combined = combineYields(
        base.percent,
        chef?.percent != null ? chef.percent : null,
      );
      const insight: IngredientYieldInsight = {
        basePercent: base.percent,
        baseReason: base.reason,
        baseRuleId: base.ruleId,
        chefPercent: chef?.percent ?? null,
        chefMethod: chef?.method,
        chefNote: chef?.note,
        chefRecordId: chef?.recordId,
        combinedPercent: combined.percent,
        source: combined.source,
      };
      if (insight.basePercent == null && insight.chefPercent == null)
        return null;
      return insight;
    });
  }, [ingredients, findBestMatch]);

  const autoFilledYieldRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    setIngredients((prev) => {
      let changed = false;
      const next = prev.map((row, index) => {
        const ensured = ensureIngredientRowId(row);
        const subId = ensured.subId;
        if (ensured.type === "divider") {
          autoFilledYieldRef.current.delete(subId);
          return row;
        }
        const insight = ingredientYieldInsights[index];
        const suggestion =
          insight?.combinedPercent ??
          insight?.chefPercent ??
          insight?.basePercent;
        if (suggestion == null) {
          autoFilledYieldRef.current.delete(subId);
          return row;
        }
        const formatted = formatYieldPercent(suggestion);
        const trimmed = ensured.yield.trim();
        const previousAuto = autoFilledYieldRef.current.get(subId) ?? "";
        if (trimmed && trimmed !== formatted && trimmed !== previousAuto) {
          autoFilledYieldRef.current.delete(subId);
          return row;
        }
        autoFilledYieldRef.current.set(subId, formatted);
        if (trimmed === formatted) return row;
        changed = true;
        return ensureIngredientRowId({ ...ensured, yield: formatted });
      });
      return changed ? ensureIngredientRowIds(next) : prev;
    });
  }, [ingredientYieldInsights]);

  const methodOptionsId = useMemo(
    () => `prep-method-options-${Math.random().toString(36).slice(2)}`,
    [],
  );

  const knownPrepMethods = useMemo(() => {
    const sidebarMethods = selectedPrepMethod
      .map((value) => value.trim())
      .filter(Boolean);
    const techniqueMethods = Array.from(taxonomy.technique ?? [])
      .map((value) => String(value).trim())
      .filter(Boolean);
    return Array.from(new Set([...sidebarMethods, ...techniqueMethods]));
  }, [selectedPrepMethod, taxonomy.technique]);

  const { activeIngredientCount, averageIngredientYield } = useMemo(() => {
    let active = 0;
    let sum = 0;
    let count = 0;
    for (const row of ingredients) {
      if (row.type === "divider") continue;
      const hasContent = [row.qty, row.unit, row.item, row.prep, row.cost].some(
        (part) => String(part || "").trim().length > 0,
      );
      if (hasContent) active += 1;

      // Only count yield for rows that have actual ingredient content
      if (hasContent) {
        const value = Number(String(row.yield || "").replace(/[^0-9.]/g, ""));
        if (Number.isFinite(value) && value > 0) {
          sum += value;
          count += 1;
        }
      }
    }
    return {
      activeIngredientCount: active,
      averageIngredientYield: count ? sum / count : null,
    };
  }, [ingredients]);

  const totalIngredientCost = useMemo(
    () => calculateTotalCost(),
    [ingredients],
  );

  const lastIngredientColumnIndex = 5;

  // Keyboard nav in grid
  const onGridKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);
    if (Number.isNaN(row) || Number.isNaN(col)) return;

    setFocusedIngredientRow(row);

    const move = (r: number, c: number) => {
      const next = document.querySelector<HTMLInputElement>(
        `input[data-row="${r}"][data-col="${c}"]`,
      );
      next?.focus();
      next?.select();
    };
    if (
      e.key === "Tab" &&
      !e.shiftKey &&
      col === lastIngredientColumnIndex &&
      row === ingredients.length - 1
    ) {
      e.preventDefault();
      addIngredientRow(row);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(row, col + 1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(row, col - 1);
    }
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      move(row + 1, col);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      move(row - 1, col);
    }
  };

  // Unit + currency conversions (with mixed fraction support)
  const convertUnits = () => {
    const alias = (u: string) => {
      const k = (u || "").toUpperCase().trim();
      if (k.startsWith("TABLESPO")) return "TBSP";
      if (k.startsWith("TEASPO")) return "TSP";
      if (k === "TSP" || k === "TEASPOON" || k === "TEASPOONS") return "TSP";
      if (k === "TBSP" || k === "TABLESPOON" || k === "TABLESPOONS")
        return "TBSP";
      if (k === "QT" || k === "QTS" || k === "QUART" || k === "QUARTS")
        return "QTS";
      if (k === "PT") return "PINT";
      if (k === "LB" || k === "POUND" || k === "POUNDS") return "LBS";
      if (k === "FLOZ" || k === "FL OZ") return "FL OZ";
      if (k === "GAL") return "GALLON";
      if (k === "CUPS") return "CUP";
      return k;
    };

    // Normalize within Imperial before toggling systems for better readability
    const normalizedImperial = ingredients.map((r) => {
      const base = ensureIngredientRowId(r);
      const n = parseQuantity(base.qty);
      const u = alias(base.unit || "");
      if (!Number.isFinite(n)) return base;
      // Volume normalize
      const volUnits = [
        "TSP",
        "TBSP",
        "FL OZ",
        "CUP",
        "PINT",
        "QTS",
        "QUART",
        "QUARTS",
        "GAL",
        "GALLON",
      ];
      if (volUnits.includes(u)) {
        const norm = normalizeImperialVolume(n, u);
        return { ...base, qty: String(norm.qty), unit: norm.unit };
      }
      // Weight normalize
      if (u === "OZ" || u === "OUNCE" || u === "OUNCES") {
        const norm = normalizeImperialWeight(n, u);
        return { ...base, qty: String(norm.qty), unit: norm.unit };
      }
      return base;
    });

    const map: Record<string, { unit: string; f: (n: number) => number }> = {
      OZ: { unit: "G", f: (n) => n * 28.3495 },
      LBS: { unit: "KG", f: (n) => n * 0.453592 },
      QTS: { unit: "L", f: (n) => n * 0.946353 },
      TSP: { unit: "ML", f: (n) => n * 4.92892 },
      TBSP: { unit: "ML", f: (n) => n * 14.7868 },
      "FL OZ": { unit: "ML", f: (n) => n * 29.5735 },
      CUP: { unit: "ML", f: (n) => n * 236.588 },
      PINT: { unit: "ML", f: (n) => n * 473.176 },
      GALLON: { unit: "L", f: (n) => n * 3.78541 },
    };
    const back: Record<string, { unit: string; f: (n: number) => number }> = {
      G: { unit: "OZ", f: (n) => n / 28.3495 },
      KG: { unit: "LBS", f: (n) => n / 0.453592 },
      L: { unit: "QTS", f: (n) => n / 0.946353 },
      ML: { unit: "TSP", f: (n) => n / 4.92892 },
    };

    const convertTempsInText = (text: string, toMetric: boolean) => {
      if (!text) return text;
      let out = text;
      if (toMetric) {
        out = out.replace(
          /(\d{2,3})\s*(?:°\s*)?(?:f|fahrenheit|degf|degrees\s*f)\b/gi,
          (_m, a) => {
            const f = parseInt(a, 10);
            const c = Math.round(((f - 32) * 5) / 9);
            return `${c}°C`;
          },
        );
      } else {
        out = out.replace(
          /(\d{2,3})\s*(?:°\s*)?(?:c|celsius|degc|degrees\s*c)\b/gi,
          (_m, a) => {
            const c = parseInt(a, 10);
            const f = Math.round((c * 9) / 5 + 32);
            return `${f}°F`;
          },
        );
      }
      return out;
    };
    const convertCookTemp = (s: string, toMetric: boolean) => {
      const t = String(s || "").trim();
      if (!t) return t;
      const num = parseInt(t.match(/(\d{2,3})/)?.[1] || "", 10);
      if (!Number.isFinite(num)) return t;
      if (toMetric) {
        // Treat numeric/no-unit as Fahrenheit when switching to Metric
        if (
          /(?:°?\s*F\b|fahrenheit)/i.test(t) ||
          /^(?:\d{2,3})$/.test(t.replace(/[^0-9]/g, ""))
        ) {
          const c = Math.round(((num - 32) * 5) / 9);
          return `${c}°C`;
        }
      } else {
        // Treat numeric/no-unit as Celsius when switching to Imperial
        if (
          /(?:°?\s*C\b|celsius)/i.test(t) ||
          /^(?:\d{2,3})$/.test(t.replace(/[^0-9]/g, ""))
        ) {
          const f = Math.round((num * 9) / 5 + 32);
          return `${f}°F`;
        }
      }
      return t;
    };

    if (currentUnits === "Imperial") {
      setIngredients(
        ensureIngredientRowIds(
          normalizedImperial.map((r) => {
            const base = ensureIngredientRowId(r);
            const n = parseQuantity(base.qty);
            const key = alias(base.unit);
            const cv = map[key];
            if (Number.isFinite(n) && cv) {
              return {
                ...base,
                qty: String(Number(cv.f(n)).toFixed(2)),
                unit: cv.unit,
              };
            }
            return base;
          }),
        ),
      );
      // convert header units
      if (
        [
          "QTS",
          "QT",
          "QUART",
          "QUARTS",
          "GALLON",
          "GAL",
          "CUP",
          "PINT",
          "FL OZ",
          "FLOZ",
          "TSP",
          "TBSP",
        ].includes(yieldUnit.toUpperCase())
      ) {
        const cv = map[alias(yieldUnit)];
        if (cv) {
          setYieldQty(Number(cv.f(yieldQty).toFixed(2)));
          setYieldUnit(cv.unit);
        }
      }
      if (
        [
          "QTS",
          "QT",
          "QUART",
          "QUARTS",
          "GALLON",
          "GAL",
          "CUP",
          "PINT",
          "FL OZ",
          "FLOZ",
          "TSP",
          "TBSP",
        ].includes(portionUnit.toUpperCase())
      ) {
        const cv = map[alias(portionUnit)];
        if (cv) {
          setPortionUnit(cv.unit);
        }
      }
      setCookTemp((prev) => convertCookTemp(prev, true));
      setDirections((prev) => convertTempsInText(prev, true));
      setCurrentUnits("Metric");
    } else {
      setIngredients(
        ensureIngredientRowIds(
          ingredients.map((r) => {
            const base = ensureIngredientRowId(r);
            const n = parseQuantity(base.qty);
            const key = alias(base.unit);
            const cv = back[key];
            if (Number.isFinite(n) && cv) {
              return {
                ...base,
                qty: String(Number(cv.f(n)).toFixed(2)),
                unit: cv.unit,
              };
            }
            return base;
          }),
        ),
      );
      if (["L", "ML", "G", "KG"].includes(yieldUnit.toUpperCase())) {
        const cv = back[alias(yieldUnit)];
        if (cv) {
          setYieldQty(Number(cv.f(yieldQty).toFixed(2)));
          setYieldUnit(cv.unit);
        }
      }
      if (["L", "ML", "G", "KG"].includes(portionUnit.toUpperCase())) {
        const cv = back[alias(portionUnit)];
        if (cv) {
          setPortionUnit(cv.unit);
        }
      }
      setCookTemp((prev) => convertCookTemp(prev, false));
      setDirections((prev) => convertTempsInText(prev, false));
      setCurrentUnits("Imperial");
    }
  };
  const cycleCurrency = () => {
    const order = ["USD", "EUR", "GBP", "JPY"];
    const rates: Record<string, number> = {
      USD: 1,
      EUR: 0.93,
      GBP: 0.82,
      JPY: 155,
    };
    const i = order.indexOf(currentCurrency);
    const next = order[(i + 1) % order.length];
    const from = rates[currentCurrency];
    const to = rates[next];
    const fx = to / from;
    setIngredients(
      ensureIngredientRowIds(
        ingredients.map((r) => {
          const base = ensureIngredientRowId(r);
          const n = parseFloat(String(base.cost).replace(/[$€£¥,\s]/g, ""));
          if (Number.isNaN(n)) return base;
          return { ...base, cost: (n * fx).toFixed(2) };
        }),
      ),
    );
    setCurrentCurrency(next);
  };
  const scaleRecipe = () => {
    const target = Number(
      prompt("Scale to how many portions?", String(portionCount)) ||
        portionCount,
    );
    if (!target || target <= 0) return;
    const factor = target / (portionCount || 1);
    setIngredients(
      ensureIngredientRowIds(
        ingredients.map((r) => {
          const base = ensureIngredientRowId(r);
          if (base.type === "divider") return base;
          const qtyValue = parseQuantity(base.qty);
          if (!Number.isFinite(qtyValue)) return base;
          const newQty = (qtyValue as number) * factor;
          const costValue = parseCostValue(base.cost);
          const scaledCost = Number.isFinite(costValue)
            ? Number(costValue) * factor
            : null;
          return {
            ...base,
            qty: newQty.toFixed(2),
            cost: scaledCost != null ? scaledCost.toFixed(2) : base.cost,
          };
        }),
      ),
    );
    setPortionCount(target);
  };

  useEffect(() => {
    convertUnitsRef.current = convertUnits;
  }, [convertUnits]);
  useEffect(() => {
    cycleCurrencyRef.current = cycleCurrency;
  }, [cycleCurrency]);
  useEffect(() => {
    scaleRecipeRef.current = scaleRecipe;
  }, [scaleRecipe]);

  const exportCSV = () => {
    const header = ["qty", "unit", "item", "prep", "yield", "cost"];
    const rows = [
      header,
      ...ingredients.map((r) => [
        r.qty,
        r.unit,
        r.item,
        r.prep,
        r.yield,
        r.cost,
      ]),
      [""],
      ["Directions"],
      ...String(directions || "")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line, i) => [`${i + 1}. ${line}`]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(recipeName || "recipe").replace(/[^a-z0-9-_]+/gi, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const shareLink = () => {
    const data = serialize();
    const url = `${location.origin}${location.pathname}#r=${encodeURIComponent(btoa(JSON.stringify(data)))}`;
    const title = recipeName || "Recipe";
    const ing = ingredients
      .map((r) => [r.qty, r.unit, r.item, r.prep].filter(Boolean).join(" "))
      .filter(Boolean)
      .join("\n");
    const ins = String(directions || "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n");
    const text = `${title}\n\nIngredients:\n${ing || "-"}\n\nDirections:\n${ins || "-"}\n\nLink: ${url}`;
    navigator.clipboard.writeText(text);
    alert(`${title} copied to clipboard`);
  };

  const persistRecipeForDishAssembly = () => {
    const title = (recipeName || "").trim();
    if (!title) {
      toast({
        title: t("recipe.validation.nameRequired", "Add a recipe name"),
        description: t(
          "recipe.validation.nameRequiredDetail",
          "Enter a name before sending to Dish Assembly.",
        ),
      });
      return null;
    }

    const ensuredRows = ensureIngredientRowIds(ingredients);
    const ingLines = ensuredRows
      .map((row) =>
        [row.qty, row.unit, row.item, row.prep]
          .filter(Boolean)
          .join(" ")
          .trim(),
      )
      .filter(Boolean);
    const insLines = String(directions || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const cover = image && image.startsWith("data:") ? [image] : undefined;
    let description = "";
    try {
      description = localStorage.getItem("recipe:add:description") || "";
    } catch {}

    const recipeExport = normalizeRecipe({
      recipeName: title,
      ingredients: ensuredRows
        .filter((row) => row.type !== "divider")
        .map((row) => ({
          qty: row.qty,
          unit: row.unit,
          item: row.item,
          prep: row.prep,
          yield: row.yield,
          cost: row.cost,
        })),
      directions: directions || "",
      selectedAllergens,
      selectedNationality,
      selectedCourses,
      selectedRecipeType,
      selectedPrepMethod,
      selectedCookingEquipment,
      image,
      yieldQty,
      yieldUnit,
      portionCount,
      portionUnit,
      currentCurrency,
      nutrition,
      fullRecipeCost: calculateTotalCost(),
      portionCost: calculatePortionCost(),
      cookTime,
      cookTemp,
      access: selectedRecipeAccess,
    });

    const existingRecipe =
      recipeIdRef.current != null
        ? (recipes.find((item) => item.id === recipeIdRef.current) ?? null)
        : null;
    const baseExtra =
      existingRecipe &&
      existingRecipe.extra &&
      typeof existingRecipe.extra === "object"
        ? { ...(existingRecipe.extra as Record<string, unknown>) }
        : {};

    const extra: Record<string, unknown> = {
      ...baseExtra,
      source: "manual",
      taxonomy,
      chefNotes,
      portionSize: portionSize
        ? { value: portionSize, unit: portionSizeUnit }
        : undefined,
      serverNotes: recipeExport,
    };

    if (!recipeIdRef.current) {
      recipeIdRef.current = addRecipe({
        title,
        description,
        ingredients: ingLines,
        instructions: insLines,
        imageDataUrls: cover,
        tags: [],
        extra,
      });
    } else {
      updateRecipe(recipeIdRef.current, {
        title,
        description,
        ingredients: ingLines,
        instructions: insLines,
        imageDataUrls: cover,
        extra,
      });
    }

    pushHistory({ ...serialize(), ts: Date.now() });
    return recipeIdRef.current;
  };

  const handleSendToDishAssembly = () => {
    const recipeId = persistRecipeForDishAssembly();
    if (!recipeId) return;
    try {
      sessionStorage.setItem("dishAssembly:incomingRecipeId", recipeId);
    } catch {}
    navigate("/?tab=dish-assembly");
  };

  // Auto-calc batch yield from volume units if not set manually
  useEffect(() => {
    if (yieldManualRef.current) return;
    const tspPer: Record<string, number> = {
      TSP: 1,
      TEASPOON: 1,
      TEASPOONS: 1,
      TBSP: 3,
      TABLESPOON: 3,
      TABLESPOONS: 3,
      FLOZ: 6,
      "FL OZ": 6,
      OZFL: 6,
      CUP: 48,
      CUPS: 48,
      PINT: 96,
      PT: 96,
      QUART: 192,
      QT: 192,
      QTS: 192,
      QUARTS: 192,
      GALLON: 768,
      GAL: 768,
      GALLONS: 768,
    };
    const toKey = (u: string) =>
      (u || "").replace(/\./g, "").replace(/\s+/g, "").toUpperCase();
    let totalTsp = 0;
    for (const r of ingredients) {
      const n = parseQuantity(String(r.qty || ""));
      const per = tspPer[toKey(r.unit || "")];
      if (Number.isFinite(n) && per) {
        const y = Number(String(r.yield || "").replace(/[^0-9.\-]/g, ""));
        const factor =
          Number.isFinite(y) && y > 0 ? Math.max(0, Math.min(1, y / 100)) : 1;
        totalTsp += n * per * factor;
      }
    }
    if (totalTsp > 0) {
      const order: [string, number][] = [
        ["GALLON", 768],
        ["QUART", 192],
        ["PINT", 96],
        ["CUP", 48],
        ["FLOZ", 6],
        ["TBSP", 3],
        ["TSP", 1],
      ];
      for (const [name, mul] of order) {
        if (totalTsp >= mul) {
          const q = totalTsp / mul;
          setYieldQty(Number(q.toFixed(2)));
          setYieldUnit(
            name === "FLOZ" ? "FL OZ" : name === "QUART" ? "QTS" : name,
          );
          break;
        }
      }
    }
  }, [ingredients]);

  function parseIngredientInline(
    s: string,
  ): { qty?: string; unit?: string; item?: string; prep?: string } | null {
    if (!s) return null;
    const map: Record<string, string> = {
      "¼": "1/4",
      "½": "1/2",
      "¾": "3/4",
      "⅓": "1/3",
      "⅔": "2/3",
      "��": "1/8",
      "⅜": "3/8",
      "⅝": "5/8",
      "⅞": "7/8",
    };
    let t = s.trim().replace(/[¼��¾⅓⅔⅛⅜⅝���]/g, (ch) => map[ch] || ch);
    t = t.replace(/^(?:\s*)\/(\d+)/, "1/$1");
    t = t.replace(/(\d)(\s*)(\d\/\d)/, "$1 $3");
    const m = t.match(
      /^\s*([0-9]+(?:\.[0-9]+)?(?:\s+[0-9]+\/[0-9]+)?|[0-9]+\/[0-9]+)\s*([a-zA-Z\.]+)?\s*(.*)$/,
    );
    const knownUnits = new Set([
      "LBS",
      "LB",
      "OZ",
      "TSP",
      "TBSP",
      "FL OZ",
      "FLOZ",
      "CUP",
      "CUPS",
      "PINT",
      "PT",
      "QTS",
      "QT",
      "QUART",
      "QUARTS",
      "GAL",
      "GALLON",
      "GALLONS",
      "ML",
      "L",
      "G",
      "KG",
      "GRAM",
      "GRAMS",
      "LITER",
      "LITERS",
      "LITRES",
      "EACH",
      "EA",
    ]);
    const normalizeUnit = (u: string) => {
      const k = (u || "").replace(/\./g, "").toUpperCase();
      if (!k) return "EACH";
      if (k === "POUND" || k === "POUNDS" || k === "LB") return "LBS";
      if (k === "OUNCE" || k === "OUNCES" || k === "OZS") return "OZ";
      if (k === "TEASPOON" || k === "TEASPOONS") return "TSP";
      if (k === "TABLESPOON" || k === "TABLESPOONS") return "TBSP";
      if (k === "QUART" || k === "QUARTS" || k === "QT") return "QTS";
      if (k === "FLOZ") return "FL OZ";
      if (k === "CUPS") return "CUP";
      return k;
    };
    const finalize = (rest: string) => {
      let item = rest.trim();
      let prep = "";
      const ci = item.indexOf(",");
      if (ci >= 0) {
        prep = item
          .slice(ci + 1)
          .trim()
          .toLowerCase();
        item = item.slice(0, ci).trim();
      }
      const lead = item.match(
        /^(chopped|diced|minced|sliced|grated|crushed|pureed|melted|softened|cubed|julienned|shredded)\s+(.*)$/i,
      );
      if (lead) {
        prep = prep || lead[1].toLowerCase();
        item = lead[2].trim();
      }
      return { item, prep };
    };
    if (m) {
      const rawQty = m[1];
      const rawUnit = m[2] || "";
      let rest = m[3] || "";
      let qty = rawQty;
      const parts = rawQty.split(" ");
      if (parts.length === 2 && /\d+\/\d+/.test(parts[1])) {
        const [n, d] = parts[1].split("/").map(Number);
        qty = String(Number(parts[0]) + (d ? n / d : 0));
      } else if (/^\d+\/\d+$/.test(rawQty)) {
        const [n, d] = rawQty.split("/").map(Number);
        qty = String(d ? n / d : Number(rawQty));
      }
      let unit = normalizeUnit(rawUnit);
      if (!knownUnits.has(unit)) {
        rest = `${rawUnit} ${rest}`.trim();
        unit = "EACH";
      }
      const { item, prep } = finalize(rest);
      return { qty, unit: unit || "EACH", item, prep };
    }
    if (/,/.test(t)) {
      const ci = t.indexOf(",");
      const item = t.slice(0, ci).trim();
      const prep = t
        .slice(ci + 1)
        .trim()
        .toLowerCase();
      return { item, prep };
    }
    return null;
  }

  // Auto-parse any rows that have inline qty/unit in the item field on initial load or paste
  useEffect(() => {
    let changed = false;
    const next = ingredients.map((r) => {
      if ((r.qty && r.unit) || !r.item) return r;
      if (!/^(\s*[0-9¼½¾⅓⅔⅛⅜⅝⅞]|\s*\/\d+|.*,)\b/i.test(String(r.item)))
        return r;
      const p = parseIngredientInline(String(r.item));
      if (!p) return r;
      const updated = {
        ...r,
        qty: p.qty ?? r.qty,
        unit: ((p.unit ?? r.unit) || "").toUpperCase(),
        item: p.item ?? r.item,
        prep: p.prep ?? r.prep,
      };
      if (JSON.stringify(updated) !== JSON.stringify(r)) changed = true;
      return updated;
    });
    if (changed) setIngredients(next);
  }, [ingredients]);

  // Compute theoretical volume (ml) from ingredient rows
  const theoreticalVolumeMl = React.useMemo(() => {
    const U: Record<string, number> = {
      ML: 1,
      L: 1000,
      TSP: 4.92892,
      TBSP: 14.7868,
      OZ: 29.5735,
      "FL OZ": 29.5735,
      CUP: 240,
      PT: 473.176,
      PINT: 473.176,
      QTS: 946.353,
      QT: 946.353,
      GAL: 3785.41,
      GALLON: 3785.41,
    };
    let ml = 0;
    for (const r of ingredients) {
      const q = Number((r.qty || "").toString().replace(/[^0-9.]/g, ""));
      const u = (r.unit || "").toUpperCase();
      if (!Number.isFinite(q) || q <= 0) continue;
      if (U[u]) ml += q * U[u];
      else if (
        u === "LBS" ||
        u === "LB" ||
        u === "G" ||
        u === "GRAM" ||
        u === "GRAMS" ||
        u === "KG"
      ) {
        const massG =
          u === "LBS" || u === "LB" ? q * 453.592 : u === "KG" ? q * 1000 : q;
        ml += massG; // ~1g per ml
      }
    }
    return ml;
  }, [ingredients]);
  const formatMl = (ml: number) => {
    if (!ml || ml <= 0) return "—";
    if (ml >= 3785.41) return `${(ml / 3785.41).toFixed(2)} GALLON`;
    if (ml >= 946.353) return `${(ml / 946.353).toFixed(2)} QTS`;
    if (ml >= 473.176) return `${(ml / 473.176).toFixed(2)} PINT`;
    if (ml >= 240) return `${(ml / 240).toFixed(2)} CUP`;
    if (ml >= 29.5735) return `${(ml / 29.5735).toFixed(1)} FL OZ`;
    return `${Math.round(ml)} ML`;
  };

  const analyzeNutrition = async () => {
    try {
      setNutritionLoading(true);
      setNutritionError(null);
      const rows = ingredients.filter((r) => r.qty || r.item);
      const isConvertible = (u: string) =>
        [
          "TSP",
          "TEASPOON",
          "TEASPOONS",
          "TBSP",
          "TABLESPOON",
          "TABLESPOONS",
          "FLOZ",
          "FL OZ",
          "CUP",
          "CUPS",
          "PINT",
          "PT",
          "QUART",
          "QUARTS",
          "QT",
          "QTS",
          "GAL",
          "GALLON",
          "GALLONS",
          "OZ",
          "OUNCE",
          "OUNCES",
          "LB",
          "LBS",
          "POUND",
          "POUNDS",
          "G",
          "GRAM",
          "GRAMS",
          "KG",
          "ML",
          "L",
          "LITER",
          "LITERS",
          "LITRES",
          "EACH",
          "EA",
        ].includes((u || "").toUpperCase());
      const ingr = rows.map((r) => {
        const u = (r.unit || "").toUpperCase();
        if (isConvertible(u))
          return [r.qty, r.unit, r.item, r.prep].filter(Boolean).join(" ");
        return [r.item, r.prep].filter(Boolean).join(", ");
      });
      const yields = rows.map((r) => {
        const y = Number(String(r.yield).replace(/[^0-9.\-]/g, ""));
        return Number.isFinite(y) ? y : null;
      });
      const res = await fetch("/api/nutrition/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipeName || "Recipe",
          ingr,
          yields,
          yieldQty,
          yieldUnit,
          prepMethod: selectedPrepMethod.join(", "),
        }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => ({})))?.error ||
            `Request failed: ${res.status}`,
        );
      const data = await res.json();
      setNutrition(data);
    } catch (e: any) {
      setNutritionError(e.message || "Unable to analyze nutrition");
    } finally {
      setNutritionLoading(false);
    }
  };

  // Auto-recompute nutrition when ingredients change. Fires only after the
  // user has at least one ingredient with both an item name and a quantity,
  // and is debounced so rapid edits collapse into a single request. If the
  // chef goes back and adds/removes/edits a row, the label refreshes silently.
  const nutritionInFlightRef = useRef(false);
  const ingredientSignature = useMemo(() => {
    return ingredients
      .filter((r) => r.type !== "divider")
      .map((r) => `${(r.item || "").trim().toLowerCase()}|${(r.qty || "").trim()}|${(r.unit || "").trim().toLowerCase()}|${(r.yield || "").trim()}`)
      .join("§");
  }, [ingredients]);

  useEffect(() => {
    const populated = ingredients.some(
      (r) => r.type !== "divider" && (r.item || "").trim() && (r.qty || "").toString().trim(),
    );
    if (!populated) return;
    const handle = setTimeout(() => {
      if (nutritionInFlightRef.current) return;
      nutritionInFlightRef.current = true;
      analyzeNutrition().finally(() => {
        nutritionInFlightRef.current = false;
      });
    }, 1200);
    return () => clearTimeout(handle);
    // analyzeNutrition closes over current state; we intentionally only
    // re-run when the meaningful ingredient signature or yield changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredientSignature, yieldQty, yieldUnit]);

  return (
    <RDLabProvider>
      <div
        className={`relative w-full min-h-screen transition-all duration-300 text-foreground`}
        data-echo-key="page:recipes:add"
      >
        <div className="pt-4 h-full overflow-y-auto">
          <div className="w-full px-3 sm:px-4 space-y-3 pb-5">
            {/* Removed old hamburger toggle button */}
            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${actionBarClasses}`}
              data-echo-key="section:add:actions"
            >
              <div className="max-w-xl space-y-1">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-[0.4em] ${actionCaptionTone}`}
                >
                  {t("recipe.actions.finalizeHeading", "Finalize workflow")}
                </span>
                <p
                  className={`text-xs leading-relaxed ${actionDescriptionTone}`}
                >
                  {t(
                    "recipe.actions.finalizeHint",
                    "Autosave is always on. Finalize stores this version and resets the workspace for your next dish.",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={finalizeButtonClasses}
                  onClick={finalizeRecipe}
                  disabled={isFormPristine || finalizeState === "saving"}
                >
                  {finalizeState === "success" ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : finalizeState === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden />
                  )}
                  {finalizeState === "success"
                    ? t("recipe.actions.finalizedCTA", "Saved")
                    : finalizeState === "saving"
                      ? t("recipe.actions.finalizing", "Saving...")
                      : t("recipe.actions.finalize", "Finalize & Clear")}
                </button>
                <button
                  type="button"
                  className={clearButtonClasses}
                  onClick={handleClearForm}
                  disabled={isFormPristine}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  {t("recipe.actions.clearForm", "Clear Form")}
                </button>
              </div>
            </div>
            <div
              className="flex flex-wrap items-start gap-2.5"
              data-echo-key="section:add:basics"
            >
              <div
                className={`flex-1 min-w-0 border p-3 rounded-xl shadow-lg ${isDarkMode ? "border-[#c8a97e]/25 bg-black/50 shadow-[#c8a97e]/20" : "border-gray-200 bg-white shadow-gray-200/50"} backdrop-blur-sm`}
              >
                <CulinaryAutocompleteInput
                  value={recipeName}
                  onChange={setRecipeName}
                  placeholder={t("recipe.fields.recipeName", "RECIPE NAME")}
                  isDarkMode={isDarkMode}
                  showSpellCheck={true}
                  className={`text-lg font-semibold uppercase ${isDarkMode ? "text-[#c8a97e] placeholder-[#c8a97e]/50" : "text-gray-900 placeholder-gray-500"}`}
                />
                <textarea
                  placeholder={t("recipe.fields.description", "Description")}
                  className={`mt-2 w-full border rounded-lg p-2.5 text-sm ${isDarkMode ? "bg-black/50 border-[#c8a97e]/40 text-[#c8a97e]" : "bg-white border-gray-300"}`}
                  rows={3}
                  onChange={(e) =>
                    localStorage.setItem(
                      "recipe:add:description",
                      e.target.value,
                    )
                  }
                  defaultValue={(() => {
                    try {
                      return (
                        localStorage.getItem("recipe:add:description") || ""
                      );
                    } catch {
                      return "";
                    }
                  })()}
                  data-echo-key="field:add:description"
                />

                <div
                  className="mt-4 p-3 border rounded-lg"
                  style={{
                    backgroundColor: isDarkMode
                      ? "rgba(0,0,0,0.3)"
                      : "rgba(100,150,200,0.05)",
                  }}
                >
                  <label
                    className={`text-xs font-semibold uppercase ${isDarkMode ? "text-[#c8a97e]" : "text-slate-600"} block mb-2`}
                  >
                    {t("recipe.labels.portionSize", "PORTION SIZE")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={portionSize}
                      onChange={(e) => setPortionSize(e.target.value)}
                      placeholder="e.g. 1"
                      className={`flex-1 border rounded px-2 py-1.5 text-sm ${isDarkMode ? "bg-black/50 border-[#c8a97e]/40 text-[#c8a97e]" : "bg-white border-gray-300"}`}
                      data-echo-key="field:add:portion-size"
                    />
                    <Select
                      value={portionSizeUnit}
                      onValueChange={setPortionSizeUnit}
                    >
                      <SelectTrigger className="w-24 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OZ">OZ</SelectItem>
                        <SelectItem value="LB">LB</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                        <SelectItem value="KG">KG</SelectItem>
                        <SelectItem value="ML">ML</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="CUP">CUP</SelectItem>
                        <SelectItem value="TSP">TSP</SelectItem>
                        <SelectItem value="TBSP">TBSP</SelectItem>
                        <SelectItem value="GAL">GAL</SelectItem>
                        <SelectItem value="QT">QT</SelectItem>
                        <SelectItem value="PT">PT</SelectItem>
                        <SelectItem value="EACH">EACH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p
                    className={`text-xs mt-1 ${isDarkMode ? "text-[#c8a97e]/50" : "text-slate-500"}`}
                  >
                    {t(
                      "recipe.hints.portionSize",
                      "The standard portion size used for labeling (e.g., 1 gallon, 6 oz). Multiplied by prep count for total yield.",
                    )}
                  </p>
                </div>

                <div className="mt-4">
                  <div
                    className={`grid grid-cols-4 md:grid-cols-12 gap-1.5 text-[10px] sm:text-[11px] leading-tight ${
                      isDarkMode ? "text-[#c8a97e]/80" : "text-slate-700"
                    }`}
                  >
                    <div className="col-span-2 flex flex-col items-center gap-0.5 md:col-span-2">
                      <span className={infoLabelClass}>
                        {t("recipe.labels.cookTime", "COOK TIME")}
                      </span>
                      <div className="flex items-center justify-center gap-1">
                        <input
                          value={cookTime}
                          onChange={(e) => setCookTime(e.target.value)}
                          placeholder="2:30"
                          className={`${infoInputClass} w-full text-center`}
                          data-echo-key="field:add:time"
                        />
                        {cookTimeDisplay && (
                          <span
                            className={`text-[9px] font-medium uppercase ${infoHelperClass}`}
                          >
                            {cookTimeDisplay}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 flex flex-col items-center gap-0.5 md:col-span-2">
                      <span className={infoLabelClass}>
                        {t("recipe.labels.cookTemp", "COOK TEMP")}
                      </span>
                      <input
                        value={cookTemp}
                        onChange={(e) => {
                          const digits = e.target.value
                            .replace(/[^0-9]/g, "")
                            .slice(0, 3);
                          const suffix =
                            currentUnits === "Imperial" ? "°F" : "°C";
                          setCookTemp(
                            digits ? `${parseInt(digits, 10)}${suffix}` : "",
                          );
                        }}
                        placeholder="350°F"
                        className={`${infoInputClass} w-full text-center`}
                      />
                    </div>

                    <div className="col-span-2 flex flex-col items-center gap-0.5 md:col-span-2">
                      <span className={infoLabelClass}>
                        {t("recipe.labels.prepTime", "PREP TIME")}
                      </span>
                      <div className="flex items-center justify-center gap-1">
                        <input
                          value={prepTime}
                          onChange={(e) => setPrepTime(e.target.value)}
                          placeholder="0:20"
                          className={`${infoInputClass} w-full text-center`}
                        />
                        {prepTimeDisplay && (
                          <span
                            className={`text-[9px] font-medium uppercase ${infoHelperClass}`}
                          >
                            {prepTimeDisplay}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 flex flex-col items-center gap-0.5 md:col-span-2">
                      <span className={infoLabelClass}>FULL RECIPE</span>
                      <span className={infoValuePillClass}>
                        {`${getCurrencySymbol(currentCurrency)}${calculateTotalCost().toFixed(2)}`}
                      </span>
                    </div>

                    <div className="col-span-2 flex flex-col items-center gap-0.5 md:col-span-2">
                      <span className={infoLabelClass}>
                        {t("recipe.labels.portionCost", "PORTION COST")}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={infoValuePillClass}>
                          {`${getCurrencySymbol(currentCurrency)}${calculatePortionCost().toFixed(2)}`}
                        </span>
                        {(() => {
                          const costAudit = auditRecipeCosts(ingredients);
                          return costAudit.hasWarnings ? (
                            <button
                              type="button"
                              title={`Missing costs for: ${costAudit.missingItems.join(", ")}`}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              ⚠
                            </button>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    <div className="col-span-2 flex flex-col items-center gap-0.5 md:col-span-2">
                      <span className={infoLabelClass}>
                        {t("recipe.labels.recipeType", "RECIPE")}
                      </span>
                      <span className={infoValuePillClass}>
                        {selectedRecipeType.includes("Full Recipe")
                          ? t("recipe.labels.full", "FULL")
                          : selectedRecipeType.includes("Sub Recipe")
                            ? t("recipe.labels.sub", "SUB")
                            : t("recipe.labels.unspecified", "UNSPECIFIED")}
                      </span>
                    </div>

                    <div className="col-span-2 flex flex-col items-center gap-0.5 md:col-span-3">
                      <span className={infoLabelClass}>
                        {t("recipe.labels.recipeAccess", "RECIPE ACCESS")}
                      </span>
                      <span className={infoValuePillClass}>
                        {selectedRecipeAccess.length
                          ? selectedRecipeAccess.join(", ").toUpperCase()
                          : t("recipe.labels.none", "NONE")}
                      </span>
                    </div>

                    <div className="col-span-4 flex flex-col items-center gap-0.5 md:col-span-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={infoLabelClass}>YIELD</span>
                        <button
                          type="button"
                          title={t("recipe.tools.yield", "Yield Lab")}
                          className={`rounded-lg border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] ${
                            isDarkMode
                              ? "border-[#c8a97e]/40 text-[#c8a97e]/80"
                              : "border-slate-400 text-slate-700"
                          }`}
                          onClick={() => setYieldOpen(true)}
                        >
                          {t("recipe.tools.yield", "Yield Lab")}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        <input
                          type="number"
                          value={yieldQty}
                          onChange={(e) => {
                            yieldManualRef.current = true;
                            setYieldQty(Math.max(0, Number(e.target.value)));
                          }}
                          className={`${infoInputClass} w-16 flex-1 text-center`}
                          data-echo-key="field:add:yield"
                        />
                        <input
                          value={yieldUnit}
                          onChange={(e) => {
                            yieldManualRef.current = true;
                            setYieldUnit(e.target.value.toUpperCase());
                          }}
                          className={`${infoInputClass} w-14 flex-1 text-center uppercase`}
                        />
                      </div>
                    </div>

                    <div className="col-span-4 flex flex-col items-center gap-0.5 md:col-span-4">
                      <span className={infoLabelClass}>
                        {t("recipe.labels.portion", "PORTION")}
                      </span>
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={portionCount}
                          onChange={(e) =>
                            setPortionCount(Math.max(1, Number(e.target.value)))
                          }
                          className={`${infoInputClass} w-16 flex-1 text-center`}
                        />
                        <input
                          value={portionUnit}
                          onChange={(e) =>
                            setPortionUnit(e.target.value.toUpperCase())
                          }
                          className={`${infoInputClass} w-14 flex-1 text-center uppercase`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={`mt-3 rounded-lg border p-2.5 ${
                    isDarkMode
                      ? "bg-blue-900/15 border-blue-400/30"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div
                    className={`mb-1 text-sm font-semibold ${
                      isDarkMode ? "text-blue-300" : "text-blue-700"
                    }`}
                  >
                    {t("recipe.labels.modifiers", "Modifiers")}
                  </div>
                  <div
                    className={`${
                      isDarkMode
                        ? "bg-blue-900/20 border-blue-400/30"
                        : "bg-blue-50 border-blue-200"
                    } border rounded-md p-1 text-xs`}
                  >
                    {(() => {
                      const diet = new Set(taxonomy.diets);
                      const txt = ingredients
                        .map((r) => `${r.qty} ${r.unit} ${r.item}`)
                        .join(" ")
                        .toLowerCase();
                      const meatRe =
                        /(beef|pork|chicken|lamb|fish|shrimp|gelatin)/;
                      const issues: string[] = [];
                      const dir = (directions || "").toLowerCase();
                      const tempMatch =
                        dir.match(
                          /(\d{2,3})\s*(?:°\s*)?(?:f|fahrenheit|degf)/i,
                        ) || dir.match(/(\d{2,3})\s*degrees?\s*f/i);
                      const cookT = String(cookTemp || "").match(
                        /\d{2,3}/,
                      )?.[0];
                      if (tempMatch && cookT && tempMatch[1] !== cookT)
                        issues.push(
                          `Cook temp mismatch: directions ${tempMatch[1]}F vs field ${cookT}F`,
                        );
                      if (
                        (diet.has("vegetarian") || diet.has("vegan")) &&
                        meatRe.test(txt)
                      )
                        issues.push(
                          "Selected diet conflicts with ingredients.",
                        );
                      return issues.length ? (
                        <div className="mb-1.5 text-red-600">
                          {issues.map((s, i) => (
                            <div key={i}>{s}</div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    <div className="grid grid-cols-8 gap-0.5">
                      {taxonomy.cuisine && (
                        <div className="col-span-2">
                          <div className="font-semibold">
                            {t("recipe.labels.cuisineLabel", "Cuisine")}
                          </div>
                          <div>{taxonomy.cuisine}</div>
                        </div>
                      )}
                      {taxonomy.difficulty && (
                        <div className="col-span-2">
                          <div className="font-semibold">
                            {t("recipe.labels.difficultyLabel", "Difficulty")}
                          </div>
                          <div>{taxonomy.difficulty}</div>
                        </div>
                      )}
                      {taxonomy.mealPeriod && (
                        <div className="col-span-2">
                          <div className="font-semibold">
                            {t("recipe.labels.mealLabel", "Meal")}
                          </div>
                          <div>{taxonomy.mealPeriod}</div>
                        </div>
                      )}
                      {taxonomy.serviceStyle && (
                        <div className="col-span-2">
                          <div className="font-semibold">
                            {t("recipe.labels.serviceLabel", "Service")}
                          </div>
                          <div>{taxonomy.serviceStyle}</div>
                        </div>
                      )}
                      {taxonomy.course.length > 0 && (
                        <div className="col-span-4">
                          <div className="font-semibold">
                            {t("recipe.labels.courseLabel", "Course")}
                          </div>
                          <div className="flex flex-wrap gap-0.5">
                            {[...taxonomy.course].sort().map((v) => (
                              <span
                                key={v}
                                className="rounded border px-1 py-0.5"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {taxonomy.pastry.length > 0 && (
                        <div className="col-span-4">
                          <div className="font-semibold">
                            {t("recipe.labels.pastryLabel", "Pastry")}
                          </div>
                          <div className="flex flex-wrap gap-0.5">
                            {[...taxonomy.pastry].sort().map((v) => (
                              <span
                                key={v}
                                className="rounded border px-1 py-0.5"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {taxonomy.technique.length > 0 && (
                        <div className="col-span-4">
                          <div className="font-semibold">
                            {t("recipe.labels.techniqueLabel", "Technique")}
                          </div>
                          <div className="flex flex-wrap gap-0.5">
                            {[...taxonomy.technique].sort().map((v) => (
                              <span
                                key={v}
                                className="rounded border px-1 py-0.5"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {taxonomy.components.length > 0 && (
                        <div className="col-span-4">
                          <div className="font-semibold">
                            {t("recipe.labels.componentsLabel", "Components")}
                          </div>
                          <div className="flex flex-wrap gap-0.5">
                            {[...taxonomy.components].sort().map((v) => (
                              <span
                                key={v}
                                className="rounded border px-1 py-0.5"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {taxonomy.equipment.length > 0 && (
                        <div className="col-span-4">
                          <div className="font-semibold">Equipment</div>
                          <div className="flex flex-wrap gap-0.5">
                            {[...taxonomy.equipment].sort().map((v) => (
                              <span
                                key={v}
                                className="rounded border px-1 py-0.5"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {taxonomy.diets.length > 0 && (
                        <div className="col-span-4">
                          <div className="font-semibold">Diets</div>
                          <div className="flex flex-wrap gap-0.5">
                            {[...taxonomy.diets].sort().map((v) => (
                              <span
                                key={v}
                                className="rounded border px-1 py-0.5"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-72 lg:w-80 xl:flex-shrink-0">
                <div
                  className={`border rounded-xl flex flex-col justify-end shadow-lg backdrop-blur-sm ${isDarkMode ? "bg-black/50 border-[#c8a97e]/25 shadow-[0_0_24px_rgba(34,211,238,0.25)]" : "bg-white border-gray-200 shadow-gray-200/50"}`}
                  style={{ minHeight: "3rem" }}
                >
                  <div
                    className="p-2.5 flex flex-col gap-1.5"
                    data-echo-key="section:add:allergens"
                  >
                    <div
                      className={`font-semibold text-xs mb-1.5 ${isDarkMode ? "text-[#c8a97e]" : "text-gray-700"}`}
                    >
                      {t("recipe.labels.allergens", "ALLERGENS")}
                    </div>
                    {selectedAllergens.length ? (
                      <div
                        className={`grid grid-cols-6 gap-1 text-xs ${isDarkMode ? "text-[#c8a97e]" : "text-gray-700"}`}
                      >
                        {selectedAllergens.map((a) => (
                          <div key={a}>{a}</div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`text-xs italic ${isDarkMode ? "text-[#c8a97e]" : "text-gray-500"}`}
                      >
                        {t(
                          "recipe.labels.noAllergens",
                          "No allergens selected",
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={`rounded-2xl border p-2 shadow-lg backdrop-blur-sm ${
                    isDarkMode
                      ? "bg-black/50 border-[#c8a97e]/25 shadow-[0_0_18px_rgba(34,211,238,0.25)]"
                      : "bg-white border-gray-200 shadow-gray-200/40"
                  }`}
                  data-echo-key="section:add:photos"
                >
                  <div
                    className={`mb-1.5 text-xs font-semibold uppercase tracking-[0.22em] ${
                      isDarkMode ? "text-[#c8a97e]" : "text-gray-700"
                    }`}
                  >
                    {t("recipe.labels.photo", "RECIPE IMAGE")}
                  </div>
                  <div className="flex justify-center">
                    <div className="flex-shrink-0 w-44 h-44 md:w-52 md:h-52">
                      {image ? (
                        <img
                          src={image}
                          alt="Recipe"
                          className="h-full w-full rounded-md bg-white object-contain"
                          style={{
                            border: "0.5px solid #000",
                            boxShadow:
                              "0 6px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)",
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-gray-400/70 bg-gray-100 p-4">
                          <label
                            className="cursor-pointer text-xs text-gray-600"
                            data-echo-key="cta:add:upload"
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                try {
                                  const reader = new FileReader();
                                  reader.onload = () =>
                                    setImage(String(reader.result));
                                  reader.readAsDataURL(f);
                                } catch {}
                              }}
                            />
                            Upload Photo
                          </label>
                          <span className="text-xs text-gray-500">or</span>
                          <button
                            type="button"
                            onClick={() => setShowGalleryPicker(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Select from Gallery
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 space-y-3">
              <IngredientsGrid
                isDarkMode={isDarkMode}
                ingredients={ingredients}
                currencySymbol={getCurrencySymbol(currentCurrency)}
                totalCost={totalIngredientCost}
                theoreticalVolumeLabel={formatMl(theoreticalVolumeMl)}
                activeCount={activeIngredientCount}
                averageYield={averageIngredientYield}
                methodOptions={knownPrepMethods}
                methodOptionsId={methodOptionsId}
                onFieldChange={handleIngredientFieldChange}
                onFieldBlur={handleIngredientBlur}
                onAddRow={handleAddIngredientWithContext}
                onRemoveRow={removeIngredientRow}
                onReorderRow={reorderIngredientRows}
                onGridKeyDown={onGridKeyDown}
                onAddSubRecipe={() => setIsSubRecipePickerOpen(true)}
                onAddDivider={addDividerRow}
                onIngredientSelected={handleIngredientSelected}
              />

              <SubRecipePicker
                open={isSubRecipePickerOpen}
                onOpenChange={setIsSubRecipePickerOpen}
                options={subRecipeOptions}
                onConfirm={insertSubRecipeRows}
                isDarkMode={isDarkMode}
                formatCurrency={formatRecipeCost}
              />

              <Dialog open={yieldOpen} onOpenChange={setYieldOpen}>
                <DialogContent
                  className={`w-full max-w-[min(960px,95vw)] border p-5 transition-shadow backdrop-blur-xl ${
                    isDarkMode
                      ? "border-[#c8a97e]/30 bg-slate-950/92 shadow-[0_45px_140px_-25px_rgba(34,211,238,0.65)]"
                      : "border-slate-200/80 bg-white/97 shadow-[0_45px_140px_-25px_rgba(79,70,229,0.35)]"
                  }`}
                >
                  <DialogHeader>
                    <DialogTitle>Yield Lab</DialogTitle>
                  </DialogHeader>
                  <YieldLabForm
                    defaultInputQty={yieldQty}
                    defaultInputUnit={yieldUnit}
                    recipeName={recipeName}
                    defaultMethod={selectedPrepMethod[0] || ""}
                    methodOptions={knownPrepMethods}
                    item={
                      ingredients.find(
                        (row) => row.type !== "divider" && row.item.trim(),
                      )?.item
                    }
                    onClose={() => setYieldOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              {/* ARCHIVED: RDLabsPortal moved to dedicated RDLabsWorkspace tab
              <RDLabsPortal
                isOpen={isRndLabsOpen}
                onClose={() => setIsRndLabsOpen(false)}
                isDarkMode={isDarkMode}
                layout={rndLayout}
                onLayoutChange={handleRndLayoutChange}
                applyLayout={(nextLayout) => setRndLayout(nextLayout)}
                defaultLayout={DEFAULT_RND_LAYOUT}
              />
              */}
            </div>

            <div
              className={`rounded-2xl p-6 border ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className={`font-bold text-xl ${isDarkMode ? "text-[#c8a97e]" : "text-gray-900"}`}
                >
                  DIRECTIONS
                </h3>
                <div className="flex gap-3">
                  <input
                    ref={stepImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      for (const f of files) {
                        try {
                          const img = await new Promise<HTMLImageElement>(
                            (res, rej) => {
                              const r = new FileReader();
                              r.onload = () => {
                                const im = new Image();
                                im.onload = () => res(im);
                                im.onerror = rej;
                                im.src = String(r.result);
                              };
                              r.onerror = rej;
                              r.readAsDataURL(f);
                            },
                          );
                          const scale = Math.min(
                            1,
                            STEP_IMG_MAX_W / (img.width || STEP_IMG_MAX_W),
                          );
                          const w = Math.round(
                            (img.width || STEP_IMG_MAX_W) * scale,
                          );
                          const h = Math.round(
                            (img.height || STEP_IMG_MAX_W) * scale,
                          );
                          const c = document.createElement("canvas");
                          c.width = w;
                          c.height = h;
                          const ctx = c.getContext("2d");
                          if (ctx) {
                            ctx.drawImage(img, 0, 0, w, h);
                          }
                          const data = c.toDataURL("image/jpeg", 0.85);
                          setDirections(
                            (d) => (d ? d + "\n" : "") + `IMG:${data}`,
                          );
                        } catch {}
                      }
                      (e.target as HTMLInputElement).value = "";
                    }}
                  />
                  <button
                    title="Insert Step Photo"
                    className={`p-2 rounded-lg transition-all hover:bg-gray-100 ${isDarkMode ? "hover:bg-gray-700" : ""}`}
                    onClick={() => stepImageInputRef.current?.click()}
                  >
                    <ImageIcon
                      className={`w-5 h-5 ${isDarkMode ? "text-[#c8a97e]" : "text-gray-600"}`}
                    />
                  </button>
                  <button
                    title="Bold"
                    className={`p-2 rounded-lg transition-all hover:bg-gray-100 ${isDarkMode ? "hover:bg-gray-700" : ""}`}
                    onClick={() => document.execCommand("bold", false)}
                  >
                    <Bold
                      className={`w-5 h-5 ${isDarkMode ? "text-[#c8a97e]" : "text-gray-600"}`}
                    />
                  </button>
                  <button
                    title="Italic"
                    className={`p-2 rounded-lg transition-all hover:bg-gray-100 ${isDarkMode ? "hover:bg-gray-700" : ""}`}
                    onClick={() => document.execCommand("italic", false)}
                  >
                    <Italic
                      className={`w-5 h-5 ${isDarkMode ? "text-[#c8a97e]" : "text-gray-600"}`}
                    />
                  </button>
                  <button
                    title="Underline"
                    className={`p-2 rounded-lg transition-all hover:bg-gray-100 ${isDarkMode ? "hover:bg-gray-700" : ""}`}
                    onClick={() => document.execCommand("underline", false)}
                  >
                    <Underline
                      className={`w-5 h-5 ${isDarkMode ? "text-[#c8a97e]" : "text-gray-600"}`}
                    />
                  </button>
                  <select
                    className={`px-3 py-2 text-sm border rounded-lg ${isDarkMode ? "bg-black/50 border-[#c8a97e]/40 text-[#c8a97e]" : "bg-white border-gray-200 text-gray-900"}`}
                    value={selectedFont}
                    onChange={(e) => {
                      setSelectedFont(e.target.value);
                    }}
                  >
                    <option>Arial</option>
                    <option>Times</option>
                    <option>Helvetica</option>
                    <option>Georgia</option>
                  </select>
                  <select
                    className={`px-3 py-2 text-sm border rounded-lg ${isDarkMode ? "bg-black/50 border-[#c8a97e]/40 text-[#c8a97e]" : "bg-white border-gray-200 text-gray-900"}`}
                    value={selectedFontSize}
                    onChange={(e) => setSelectedFontSize(e.target.value)}
                  >
                    {["12px", "14px", "16px", "18px", "20px"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div
                id="directions-textarea"
                contentEditable
                suppressContentEditableWarning
                ref={dirRef}
                spellCheck
                onDragOver={(e) => {
                  if (e.dataTransfer?.types?.includes("Files")) {
                    e.preventDefault();
                  }
                }}
                onDrop={async (e) => {
                  try {
                    e.preventDefault();
                    const files = Array.from(
                      e.dataTransfer?.files || [],
                    ).filter((f) => f.type.startsWith("image/"));
                    for (const f of files) {
                      const img = await new Promise<HTMLImageElement>(
                        (res, rej) => {
                          const r = new FileReader();
                          r.onload = () => {
                            const im = new Image();
                            im.onload = () => res(im);
                            im.onerror = rej;
                            im.src = String(r.result);
                          };
                          r.onerror = rej;
                          r.readAsDataURL(f);
                        },
                      );
                      const scale = Math.min(
                        1,
                        STEP_IMG_MAX_W / (img.width || STEP_IMG_MAX_W),
                      );
                      const w = Math.round(
                        (img.width || STEP_IMG_MAX_W) * scale,
                      );
                      const h = Math.round(
                        (img.height || STEP_IMG_MAX_W) * scale,
                      );
                      const c = document.createElement("canvas");
                      c.width = w;
                      c.height = h;
                      const ctx = c.getContext("2d");
                      if (ctx) {
                        ctx.drawImage(img, 0, 0, w, h);
                      }
                      const data = c.toDataURL("image/jpeg", 0.85);
                      setDirections((d) => (d ? d + "\n" : "") + `IMG:${data}`);
                    }
                  } catch {}
                }}
                data-echo-key="field:add:steps"
                className={`prose prose-sm max-w-none w-full border p-3 rounded-xl shadow-sm transition-all focus:shadow-md focus:ring-2 resize-none min-h-[160px] overflow-y-auto ${isDarkMode ? "bg-black/50 border-[#c8a97e]/40 text-[#c8a97e] focus:ring-[#c8a97e]/25" : "bg-white border-gray-200 text-gray-900 focus:ring-blue-400/30 focus:border-blue-400"}`}
                style={{
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                  fontFamily: selectedFont,
                  fontSize: selectedFontSize,
                }}
                onKeyDown={(e) => {
                  const el = dirRef.current;
                  if (!el) return;
                  const sel = window.getSelection();
                  if (!sel || !sel.anchorNode) return;
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const text = el.textContent || "";
                    let offset = 0;
                    const range = sel.getRangeAt(0);
                    const preRange = range.cloneRange();
                    preRange.selectNodeContents(el);
                    preRange.setEnd(range.endContainer, range.endOffset);
                    const containerText = preRange.toString();
                    offset = containerText.length;
                    const before = text.slice(0, offset);
                    const after = text.slice(offset);
                    const lineStart = before.lastIndexOf("\n") + 1;
                    const currentLine = before.slice(lineStart);
                    const m = currentLine.match(/^\s*(\d+)[\.)]?\s*/);
                    const nextNum = m ? String(Number(m[1]) + 1) + ". " : "• ";
                    const newText = before + "\n" + nextNum + after;
                    el.textContent = newText;
                    const newOffset = offset + 1 + nextNum.length;
                    const r = document.createRange();
                    const walker = document.createTreeWalker(
                      el,
                      NodeFilter.SHOW_TEXT,
                    );
                    let seen = 0;
                    let node: Node | null = walker.nextNode();
                    while (node) {
                      const len = (node.textContent || "").length;
                      if (seen + len >= newOffset) {
                        r.setStart(node, newOffset - seen);
                        r.collapse(true);
                        break;
                      }
                      seen += len;
                      node = walker.nextNode();
                    }
                    sel.removeAllRanges();
                    sel.addRange(r);
                    setDirections(newText);
                  }
                }}
                onInput={(e) => {
                  let t = (e.target as HTMLDivElement).textContent || "";
                  const fixes: Record<string, string> = {
                    "fist ": "first ",
                    "teh ": "the ",
                    "mized ": "mixed ",
                    "choped ": "chopped ",
                    "whiskd ": "whisked ",
                  };
                  let changed = t;
                  for (const [k, v] of Object.entries(fixes)) {
                    changed = changed.replace(
                      new RegExp("(^|\\s)" + k, "gi"),
                      (s) =>
                        s.toLowerCase().endsWith(k)
                          ? s.slice(0, -k.length) + v
                          : s,
                    );
                  }
                  if (changed !== t) {
                    (e.target as HTMLDivElement).textContent = changed;
                    const sel = window.getSelection();
                    if (sel) {
                      const r = document.createRange();
                      const el = dirRef.current!;
                      r.selectNodeContents(el);
                      r.collapse(false);
                      sel.removeAllRanges();
                      sel.addRange(r);
                    }
                  }
                  setDirections(changed);
                }}
              ></div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="ml-auto">
                <button
                  data-echo-key="cta:add:publish"
                  onClick={() => {
                    const title =
                      (recipeName || "").trim() || "Untitled Recipe";
                    const ingLines = ingredients
                      .map((r) =>
                        [r.qty, r.unit, r.item, r.prep]
                          .filter(Boolean)
                          .join(" ")
                          .trim(),
                      )
                      .filter(Boolean);
                    const insLines = String(directions || "")
                      .split(/\r?\n/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    const cover =
                      image && image.startsWith("data:") ? [image] : undefined;
                    if (!recipeIdRef.current) {
                      recipeIdRef.current = addRecipe({
                        title,
                        ingredients: ingLines,
                        instructions: insLines,
                        imageDataUrls: cover,
                        tags: [],
                        extra: { source: "manual", taxonomy, published: true },
                      });
                    } else {
                      updateRecipe(recipeIdRef.current, {
                        title,
                        ingredients: ingLines,
                        instructions: insLines,
                        imageDataUrls: cover,
                        extra: { taxonomy, published: true },
                      });
                    }
                    alert(`Published ${title}`);
                  }}
                  className={`px-3 py-2 text-sm rounded border ${isDarkMode ? "border-[#c8a97e]/40 text-[#c8a97e]" : "border-gray-400 text-gray-800"}`}
                >
                  Publish
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  data-echo-key="cta:add:save"
                  onClick={() => {
                    const title =
                      (recipeName || "").trim() || "Untitled Recipe";
                    const ingLines = ingredients
                      .map((r) =>
                        [r.qty, r.unit, r.item, r.prep]
                          .filter(Boolean)
                          .join(" ")
                          .trim(),
                      )
                      .filter(Boolean);
                    const insLines = String(directions || "")
                      .split(/\r?\n/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    const cover =
                      image && image.startsWith("data:") ? [image] : undefined;
                    if (!recipeIdRef.current) {
                      recipeIdRef.current = addRecipe({
                        title,
                        ingredients: ingLines,
                        instructions: insLines,
                        imageDataUrls: cover,
                        tags: [],
                        extra: { source: "manual", taxonomy },
                      });
                    } else {
                      updateRecipe(recipeIdRef.current, {
                        title,
                        ingredients: ingLines,
                        instructions: insLines,
                        imageDataUrls: cover,
                        extra: { taxonomy },
                      });
                    }
                    pushHistory({ ...serialize(), ts: Date.now() });
                    alert(`Saved ${title}`);
                  }}
                  className="flex items-center gap-2 text-gray-700 hover:text-black"
                >
                  <Save className="w-5 h-5" />
                  Save
                </button>
                <button
                  onClick={handleSendToDishAssembly}
                  className="flex items-center gap-2 text-primary hover:text-primary/80"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  {t(
                    "recipe.actions.sendToDishAssembly",
                    "Send to Dish Assembly",
                  )}
                </button>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1 text-gray-700 hover:text-black"
                >
                  <FileDown className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 text-gray-700 hover:text-black"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={shareLink}
                  className="flex items-center gap-1 text-gray-700 hover:text-black"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={() => {
                    const title = recipeName || "Recipe";
                    const ing = ingredients
                      .map((r) =>
                        [r.qty, r.unit, r.item, r.prep]
                          .filter(Boolean)
                          .join(" "),
                      )
                      .filter(Boolean)
                      .join("\n");
                    const ins = String(directions || "")
                      .split(/\r?\n/)
                      .filter(Boolean)
                      .map((s, i) => `${i + 1}. ${s}`)
                      .join("\n");
                    const bodyText = `${title}\n\nIngredients:\n${ing || "-"}\n\nDirections:\n${ins || "-"}`;
                    const body = encodeURIComponent(bodyText);
                    location.href = `sms:?&body=${body}`;
                  }}
                  className="flex items-center gap-1 text-gray-700 hover:text-black"
                >
                  <Share2 className="w-4 h-4" />
                  SMS
                </button>
                <button
                  onClick={() => {
                    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>${recipeName || "Recipe"}</title></head><body><h1>${recipeName || "Recipe"}</h1><h3>Ingredients</h3><ul>${ingredients.map((r) => `<li>${[r.qty, r.unit, r.item, r.prep].filter(Boolean).join(" ")}</li>`).join("")}</ul><h3>Directions</h3><pre style="white-space:pre-wrap;font-family:Arial, sans-serif;">${directions}</pre></body></html>`;
                    const blob = new Blob([html], {
                      type: "application/msword",
                    });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${(recipeName || "recipe").replace(/[^a-z0-9-_]+/gi, "_")}.doc`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  className="flex items-center gap-1 text-gray-700 hover:text-black"
                >
                  <FileDown className="w-4 h-4" />
                  Word
                </button>
              </div>
              <button
                onClick={analyzeNutrition}
                disabled={nutritionLoading}
                className={`text-xs px-3 py-2 rounded ${isDarkMode ? "border border-[#c8a97e]/40 hover:bg-[#c8a97e]/10 text-[#c8a97e]" : "border border-gray-400 hover:bg-gray-100 text-gray-800"}`}
              >
                {nutritionLoading ? "Analyzing…" : "Generate Nutrition Label"}
              </button>
            </div>

            <div
              className={`mt-3 rounded-2xl p-6 border ${isDarkMode ? "bg-gray-900/50 border-[#c8a97e]/25" : "bg-white/80 border-gray-200 shadow-sm"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3
                  className={`font-bold text-xl ${isDarkMode ? "text-[#c8a97e]" : "text-gray-900"}`}
                >
                  NUTRITION
                </h3>
                {nutritionDisplay && (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setNutritionPerServing(true)}
                        className={`px-3 py-1 rounded-md border uppercase tracking-[0.18em] transition ${
                          nutritionPerServing
                            ? isDarkMode
                              ? "border-[#c8a97e] bg-[#c8a97e]/20 text-white/80"
                              : "border-blue-500 bg-blue-600 text-white"
                            : isDarkMode
                              ? "border-[#c8a97e]/25 text-[#c8a97e]/80 hover:bg-[#c8a97e]/10"
                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Per Serving
                      </button>
                      <button
                        type="button"
                        onClick={() => setNutritionPerServing(false)}
                        className={`px-3 py-1 rounded-md border uppercase tracking-[0.18em] transition ${
                          !nutritionPerServing
                            ? isDarkMode
                              ? "border-[#c8a97e] bg-[#c8a97e]/20 text-white/80"
                              : "border-blue-500 bg-blue-600 text-white"
                            : isDarkMode
                              ? "border-[#c8a97e]/25 text-[#c8a97e]/80 hover:bg-[#c8a97e]/10"
                              : "border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Whole Recipe
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="uppercase tracking-[0.28em] text-muted-foreground">
                        Servings
                      </span>
                      <div
                        className={`flex items-center gap-1 rounded-lg border px-1 py-0.5 ${
                          isDarkMode
                            ? "border-[#c8a97e]/30 bg-[#c8a97e]/10"
                            : "border-slate-300 bg-white/70"
                        }`}
                      >
                        <button
                          type="button"
                          className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                            isDarkMode
                              ? "text-white/80 hover:bg-[#c8a97e]/10"
                              : "text-slate-700 hover:bg-slate-200"
                          }`}
                          onClick={() =>
                            setPortionCount(Math.max(1, servingsForLabel - 1))
                          }
                          aria-label="Decrease servings"
                        >
                          <Minus className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <input
                          type="number"
                          min={1}
                          step="0.25"
                          value={servingsForLabel}
                          onChange={(event) => {
                            const next = Math.max(
                              1,
                              Number(event.target.value),
                            );
                            setPortionCount(next);
                          }}
                          className={`w-16 border-0 bg-transparent text-center text-sm font-semibold outline-none ${
                            isDarkMode ? "text-white/80" : "text-slate-800"
                          }`}
                        />
                        <button
                          type="button"
                          className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                            isDarkMode
                              ? "text-white/80 hover:bg-[#c8a97e]/10"
                              : "text-slate-700 hover:bg-slate-200"
                          }`}
                          onClick={() =>
                            setPortionCount(Math.max(1, servingsForLabel + 1))
                          }
                          aria-label="Increase servings"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!nutrition && !nutritionLoading && !nutritionError && (
                <div
                  className={`${isDarkMode ? "text-[#c8a97e]/70" : "text-gray-500"}`}
                >
                  Click "Generate Nutrition Label" to analyze this recipe.
                </div>
              )}
              {nutritionError && (
                <div className="text-red-500 text-sm">{nutritionError}</div>
              )}
              {nutritionDisplay && (
                <div className="space-y-4">
                  <NutritionAuditPanel
                    nutrition={
                      nutritionPerServing
                        ? nutritionDisplay.perServing
                        : nutritionDisplay
                    }
                    servingSize={nutritionDisplay.servingSize}
                    servingsPerContainer={servingsForLabel}
                    recipeName={recipeName}
                  />
                  <div className="flex flex-col md:flex-row gap-3">
                    <NutritionLabel
                      data={nutritionDisplay}
                      servings={servingsForLabel}
                      perServing={nutritionPerServing}
                    />
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm self-start">
                      <div>
                        <span className="font-semibold">Yield:</span> {yieldQty}{" "}
                        {yieldUnit}
                      </div>
                      <div>
                        <span className="font-semibold">Servings:</span>{" "}
                        {servingsForLabel}
                      </div>
                      <div>
                        <span className="font-semibold">Unit:</span>{" "}
                        {portionUnit}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {chefNotes && (
                <div
                  className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-gray-700 text-[#c8a97e]/80" : "border-gray-200 text-gray-800 bg-gradient-to-b from-white to-slate-50"}`}
                >
                  <div className="font-semibold mb-1">Chef Notes</div>
                  <div className="whitespace-pre-wrap text-sm">{chefNotes}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <RightSidebar
          mode={rightSidebarMode}
          isCollapsed={isRightSidebarCollapsed}
          onToggle={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
          onOpenLabs={() => setIsRndLabsOpen(true)}
          onCloseLabs={() => setIsRndLabsOpen(false)}
          selectedAllergens={selectedAllergens}
          onAllergensChange={handleAllergensChange}
          selectedNationality={selectedNationality}
          onNationalityChange={setSelectedNationality}
          selectedCourses={selectedCourses}
          onCoursesChange={setSelectedCourses}
          selectedRecipeType={selectedRecipeType}
          onRecipeTypeChange={setSelectedRecipeType}
          selectedPrepMethod={selectedPrepMethod}
          onPrepMethodChange={setSelectedPrepMethod}
          selectedCookingEquipment={selectedCookingEquipment}
          onCookingEquipmentChange={setSelectedCookingEquipment}
          selectedRecipeAccess={selectedRecipeAccess}
          onRecipeAccessChange={setSelectedRecipeAccess}
          image={image}
          onImageChange={setImage}
          taxonomy={taxonomy}
          onTaxonomyChange={setTaxonomy}
          isGlobal={isGlobal}
          onGlobalChange={setIsGlobal}
          onRecipeImport={async (data) => {
            const decode = (s: string) =>
              s
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">");
            if (data?.title)
              setRecipeName(decode(String(data.title)).toUpperCase());
            if (data?.ingredients?.length) {
              const rows = (data.ingredients as string[]).map((s: string) => {
                s = decode(s);
                const fracMap: Record<string, string> = {
                  "¼": "1/4",
                  "½": "1/2",
                  "¾": "3/4",
                  "⅐": "1/7",
                  "⅑": "1/9",
                  "⅒": "1/10",
                  "⅓": "1/3",
                  "��": "2/3",
                  "⅕": "1/5",
                  "⅖": "2/5",
                  "⅗": "3/5",
                  "⅘": "4/5",
                  "⅙": "1/6",
                  "⅚": "5/6",
                  "⅛": "1/8",
                  "⅜": "3/8",
                  "⅝": "5/8",
                  "⅞": "7/8",
                };
                s = s.replace(
                  /[���½¾⅐⅑��⅓⅔⅕⅖⅗���⅙⅚⅛⅜⅝⅞]/g,
                  (ch) => fracMap[ch] || ch,
                );
                const m = s.match(
                  /^\s*([0-9]+(?:\.[0-9]+)?(?:\s+[0-9]+\/[0-9]+)?)?\s*([a-zA-Z\.]+)?\s*(.*)$/,
                );
                const qty = m?.[1] ? m[1] : "";
                const unit = m?.[2] ? m[2].toUpperCase() : "";
                const rest = (m?.[3] || "").trim();
                const [item, ...prep] = rest.split(",");
                return createIngredientRow({
                  qty,
                  unit,
                  item: item.trim(),
                  prep: prep.join(",").trim(),
                  yield: "",
                  cost: "",
                });
              });
              setIngredients(rows.length ? rows : [createIngredientRow()]);
            }
            if (data?.instructions) {
              const txt = decode(String(data.instructions));
              setDirections(txt);
              if (/recipe\s+follows|see\s+.+?\s+recipe/i.test(txt)) {
                setChefNotes(
                  (prev) =>
                    (prev ? prev + "\n" : "") +
                    "Note: This recipe references a sub‑recipe (e.g., buttercream). Import or add the sub‑recipe and link it here.",
                );
              }
            }
            if (data?.image) {
              const urlStr = String(data.image);
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort("Image fetch timeout"), 15000);

                fetch(urlStr, { signal: controller.signal })
                  .then((res) => {
                    clearTimeout(timeoutId);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.blob();
                  })
                  .then(async (blob) => {
                    const ext = blob.type.includes("png") ? "png" : "jpg";
                    const fname = `${(data.title || "cover")
                      .toString()
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")}.${ext}`;

                    // Add image to library
                    const fileObj = new File([blob], fname, {
                      type: blob.type || "image/jpeg",
                    });

                    await addImages([fileObj], {
                      tags: ["import", "web"],
                    });

                    // Set preview as data URL
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImage(String(reader.result || urlStr));
                    };
                    reader.readAsDataURL(blob);
                  })
                  .catch((error) => {
                    clearTimeout(timeoutId);
                    console.warn(
                      "[onRecipeImport] Image fetch failed:",
                      error?.message,
                    );
                    // Fallback: use original URL if we can't download
                    setImage(urlStr);
                  });
              } catch (error) {
                console.warn("[onRecipeImport] Image import error:", error);
                setImage(urlStr);
              }
            }
            // Top info
            if (data?.yield) {
              const y = String(data.yield);
              const ym = y.match(/([0-9]+(?:\.[0-9]+)?)/);
              const um = y.match(
                /(cups?|quarts?|pints?|gallons?|oz|ounces?|lb|lbs|servings?|qt|qts|gal)/i,
              );
              if (ym && um) {
                setYieldQty(Number(ym[1]));
                setYieldUnit(
                  um[1]
                    .toUpperCase()
                    .replace("QUARTS", "QTS")
                    .replace("QUART", "QTS")
                    .replace("QT", "QTS")
                    .replace("GAL", "GALLON")
                    .replace("OUNCES", "OZ")
                    .replace("OUNCE", "OZ")
                    .replace("LBS", "LBS")
                    .replace("LB", "LBS")
                    .replace("CUPS", "CUP"),
                );
              }
            }
            if (data?.cookTime) setCookTime(String(data.cookTime));
            if (data?.prepTime) setPrepTime(String(data.prepTime));
          }}
        />

        <ImageEditorModal
          isOpen={showImagePopup}
          image={image}
          onClose={() => setShowImagePopup(false)}
          onApply={(d) => setImage(d)}
          isDarkMode={isDarkMode}
        />

        <GalleryImagePicker
          open={showGalleryPicker}
          onOpenChange={setShowGalleryPicker}
          onSelectImage={setImage}
          isDarkMode={isDarkMode}
        />
      </div>
    </RDLabProvider>
  );
};

type RDLabsPortalProps = {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  layout: [number, number, number];
  onLayoutChange: (next: number[]) => void;
  applyLayout: (next: [number, number, number]) => void;
  defaultLayout: [number, number, number];
};

function RDLabsPortal({
  isOpen,
  onClose,
  isDarkMode,
  layout,
  onLayoutChange,
  applyLayout,
  defaultLayout,
}: RDLabsPortalProps) {
  const {
    experiments,
    focusExperimentId,
    searchQuery,
    backlog,
    insights,
    serializeState,
    hydrateState,
  } = useRDLabStore();

  const isBrowser = typeof window !== "undefined";

  const [sessions, setSessions] = useState<RDLabProjectSession[]>([]);
  const [activeSessionId, setActiveSessionIdState] = useState<string>("");
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string>("");
  const [savePulseKey, setSavePulseKey] = useState(0);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const hintTimeoutRef = useRef<number | null>(null);

  const accentMuted = isDarkMode ? "text-[#c8a97e]/80/80" : "text-slate-200/80";
  const rndPanelBaseClasses =
    "chalk-panel relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border p-5 shadow-[inset_0_1px_0_rgba(15,23,42,0.08)] backdrop-blur-lg transition-colors duration-300";
  const rndPanelToneClasses = isDarkMode
    ? "border-[#c8a97e]/25 text-white/90"
    : "border-slate-200/40 text-slate-100";
  const rndPanelThemes = useMemo(
    () =>
      isDarkMode
        ? [
            "bg-gradient-to-br from-slate-950/85 via-slate-900/65 to-teal-900/45 shadow-[0_0_42px_rgba(56,189,248,0.15)]",
            "bg-gradient-to-br from-slate-950/80 via-[#c8a97e]/20 to-slate-950/45 shadow-[0_0_40px_rgba(56,189,248,0.12)]",
            "bg-gradient-to-br from-slate-950/78 via-slate-900/55 to-indigo-900/45 shadow-[0_0_38px_rgba(99,102,241,0.18)]",
          ]
        : [
            "bg-gradient-to-br from-slate-900/80 via-slate-800/55 to-teal-900/40 shadow-[0_0_36px_rgba(15,118,110,0.24)]",
            "bg-gradient-to-br from-slate-900/75 via-teal-800/50 to-slate-900/40 shadow-[0_0_32px_rgba(34,197,94,0.18)]",
            "bg-gradient-to-br from-slate-900/78 via-indigo-800/50 to-slate-900/40 shadow-[0_0_34px_rgba(79,70,229,0.18)]",
          ],
    [isDarkMode],
  );
  const rndPanelHeadingClasses =
    "text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80/80 drop-shadow-[0_0_6px_rgba(56,189,248,0.35)]";
  const rndHandleClasses = isDarkMode
    ? "group relative flex w-8 items-center justify-center rounded-full border border-[#c8a97e]/25 bg-white/10 text-white/80 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a97e]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    : "group relative flex w-8 items-center justify-center rounded-full border border-slate-600/40 bg-white/10 text-slate-100 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-100/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

  const setActiveSession = useCallback(
    (id: string) => {
      setActiveSessionIdState(id);
      if (isBrowser) {
        try {
          window.localStorage.setItem(RDLAB_ACTIVE_SESSION_KEY, id);
        } catch {
          /* ignore storage errors */
        }
      }
    },
    [isBrowser],
  );

  const persistSessions = useCallback(
    (next: RDLabProjectSession[]) => {
      if (!isBrowser) return;
      try {
        window.localStorage.setItem(
          RDLAB_SESSIONS_STORAGE_KEY,
          JSON.stringify(next),
        );
      } catch {
        /* ignore storage errors */
      }
    },
    [isBrowser],
  );

  const updateSessions = useCallback(
    (updater: (prev: RDLabProjectSession[]) => RDLabProjectSession[]) => {
      setSessions((prev) => {
        const next = updater(prev);
        if (!Object.is(next, prev)) {
          persistSessions(next);
        }
        return next;
      });
    },
    [persistSessions],
  );

  const triggerHint = useCallback(() => {
    if (!isBrowser || !isOpen || hintCount >= 5) return;
    setHintCount((prev) => {
      if (prev >= 5) return prev;
      const next = prev + 1;
      try {
        window.localStorage.setItem(RDLAB_SAVE_HINT_KEY, String(next));
      } catch {
        /* ignore storage errors */
      }
      setHintVisible(true);
      if (hintTimeoutRef.current) {
        window.clearTimeout(hintTimeoutRef.current);
      }
      hintTimeoutRef.current = window.setTimeout(() => {
        setHintVisible(false);
        hintTimeoutRef.current = null;
      }, 3600);
      return next;
    });
  }, [isBrowser, isOpen, hintCount]);

  useEffect(() => {
    if (isOpen) return;
    setHintVisible(false);
    if (hintTimeoutRef.current) {
      window.clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) {
        window.clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isBrowser || sessionsLoaded) return;

    let storedSessions: RDLabProjectSession[] = [];
    try {
      const raw = window.localStorage.getItem(RDLAB_SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          storedSessions = parsed
            .map((session) => sanitizeProjectSession(session))
            .filter(
              (session): session is RDLabProjectSession => session != null,
            );
        }
      }
    } catch {
      storedSessions = [];
    }

    if (!storedSessions.length) {
      const now = new Date().toISOString();
      const snapshot = serializeState();
      const defaultSession: RDLabProjectSession = {
        id: "rd-preloaded",
        name: "Preloaded Lab",
        createdAt: now,
        updatedAt: now,
        layout: sanitizeRndLayout(layout),
        snapshot,
        vision:
          "Preserve the seeded experimentation environment with its original texture, flavor, and future-of-food scaffolding.",
        textureFocus:
          "Smoked custards, carbonated citrus pearls, velvet emulsions",
        flavorNotes:
          "Koji smoke layered with maple brine and electric citrus aromatics.",
        launchTarget: "Evergreen innovation baseline",
      };
      storedSessions = [defaultSession];
      persistSessions(storedSessions);
      try {
        window.localStorage.setItem(
          RDLAB_ACTIVE_SESSION_KEY,
          defaultSession.id,
        );
      } catch {
        /* ignore */
      }
    }

    const storedActiveId = (() => {
      try {
        return window.localStorage.getItem(RDLAB_ACTIVE_SESSION_KEY);
      } catch {
        return null;
      }
    })();

    const activeId = storedSessions.some(
      (session) => session.id === storedActiveId,
    )
      ? (storedActiveId as string)
      : (storedSessions[0]?.id ?? "");

    const activeSession =
      storedSessions.find((session) => session.id === activeId) ??
      storedSessions[0];

    if (activeId) {
      setActiveSession(activeId);
    }
    setSessions(storedSessions);
    if (activeSession) {
      hydrateState(activeSession.snapshot);
      applyLayout(sanitizeRndLayout(activeSession.layout));
      setLastSavedAt(activeSession.updatedAt);
    }

    const storedHint = (() => {
      try {
        return Number(window.localStorage.getItem(RDLAB_SAVE_HINT_KEY) ?? "0");
      } catch {
        return 0;
      }
    })();
    setHintCount(Number.isFinite(storedHint) ? storedHint : 0);

    setSessionsLoaded(true);
  }, [
    isOpen,
    isBrowser,
    sessionsLoaded,
    serializeState,
    hydrateState,
    applyLayout,
    layout,
    persistSessions,
    setActiveSession,
  ]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const projectName = activeSession?.name ?? "Untitled Lab";

  const focusExperiment = useMemo(
    () =>
      experiments.find((item) => item.id === focusExperimentId) ??
      experiments[0],
    [experiments, focusExperimentId],
  );

  const discoveryQueue = useMemo(() => {
    if (!experiments.length) return [];
    const currentId = focusExperiment?.id ?? focusExperimentId;
    const queue = experiments.filter((exp) => exp.id !== currentId);
    const source = queue.length ? queue : experiments;
    return source.slice(0, 4);
  }, [experiments, focusExperiment?.id, focusExperimentId]);

  const performSave = useCallback(
    (reason: "auto" | "manual") => {
      if (!sessionsLoaded || !activeSessionId) return null;
      const timestamp = new Date().toISOString();
      const snapshot = serializeState();
      let didPersist = false;

      updateSessions((prev) => {
        let mutated = false;
        const mapped = prev.map((session) => {
          if (session.id !== activeSessionId) return session;
          mutated = true;
          return {
            ...session,
            snapshot,
            layout: sanitizeRndLayout(layout),
            updatedAt: timestamp,
          };
        });

        if (!mutated) {
          return prev;
        }

        didPersist = true;
        const sorted = [...mapped].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        return sorted;
      });

      if (!didPersist) {
        if (reason === "manual") {
          setAutoSaveState("idle");
        }
        return null;
      }

      setLastSavedAt(timestamp);
      setAutoSaveState("saved");
      setSavePulseKey((key) => key + 1);
      triggerHint();
      return timestamp;
    },
    [
      sessionsLoaded,
      activeSessionId,
      serializeState,
      updateSessions,
      layout,
      triggerHint,
    ],
  );

  const handleSessionChange = useCallback(
    (nextId: string) => {
      if (!nextId || nextId === activeSessionId) return;
      performSave("manual");
      const target = sessions.find((session) => session.id === nextId);
      if (!target) return;
      hydrateState(target.snapshot);
      applyLayout(sanitizeRndLayout(target.layout));
      setActiveSession(nextId);
      setLastSavedAt(target.updatedAt);
      setAutoSaveState("idle");
      setSavePulseKey((key) => key + 1);
      setHintVisible(false);
    },
    [
      activeSessionId,
      sessions,
      performSave,
      hydrateState,
      applyLayout,
      setActiveSession,
    ],
  );

  const handleProjectCreate = useCallback(
    (payload: {
      name: string;
      vision: string;
      textureFocus: string;
      flavorNotes: string;
      launchTarget: string;
    }) => {
      const timestamp = new Date().toISOString();
      const id = generateSessionId();
      const snapshot: RDLabSnapshot = {
        experiments: [],
        focusExperimentId: "",
        searchQuery: "",
      };
      hydrateState(snapshot);
      applyLayout(sanitizeRndLayout(defaultLayout));
      const session: RDLabProjectSession = {
        id,
        name: payload.name.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
        layout: sanitizeRndLayout(defaultLayout),
        snapshot,
        vision: payload.vision,
        textureFocus: payload.textureFocus,
        flavorNotes: payload.flavorNotes,
        launchTarget: payload.launchTarget,
      };
      updateSessions((prev) => {
        const filtered = prev.filter((item) => item.id !== id);
        return [session, ...filtered];
      });
      setActiveSession(id);
      setSessionsLoaded(true);
      setLastSavedAt(timestamp);
      setAutoSaveState("saved");
      setSavePulseKey((key) => key + 1);
      triggerHint();
      setNewProjectOpen(false);
    },
    [
      hydrateState,
      applyLayout,
      defaultLayout,
      updateSessions,
      setActiveSession,
      triggerHint,
    ],
  );

  useEffect(() => {
    if (!isOpen || !sessionsLoaded || !activeSessionId) return;
    setAutoSaveState("saving");
    const handle = window.setTimeout(() => {
      performSave("auto");
    }, AUTO_SAVE_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [
    isOpen,
    sessionsLoaded,
    activeSessionId,
    experiments,
    focusExperimentId,
    searchQuery,
    layout,
    performSave,
  ]);

  useEffect(() => {
    if (!isBrowser) return;
    if (autoSaveState !== "saved") return;
    const timeout = window.setTimeout(() => setAutoSaveState("idle"), 2400);
    return () => window.clearTimeout(timeout);
  }, [autoSaveState, isBrowser]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const selectValue = activeSessionId || "";
  const hasSessions = sessions.length > 0;

  const handleOverlayClose = () => {
    performSave("manual");
    onClose();
  };

  const handleSaveAndClose = () => {
    performSave("manual");
    onClose();
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6">
        <div
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl"
          onClick={handleOverlayClose}
        />
        <div className="relative z-10 flex w-full max-w-[min(1240px,95vw)] flex-col">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rd-labs-title"
            className={`chalkboard-labs relative flex max-h-[90vh] min-h-[540px] w-full flex-col overflow-hidden rounded-3xl border bg-[#070d16]/95 text-slate-100 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.65)] ${
              isDarkMode
                ? "border-[#c8a97e]/25 text-white/90"
                : "border-slate-700/35 text-slate-100"
            }`}
          >
            <div className="relative z-10 flex h-full min-h-0 flex-col">
              <header className="relative z-10 flex shrink-0 items-start justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-sm">
                <div className="space-y-1.5">
                  <h2
                    id="rd-labs-title"
                    className="text-lg font-semibold uppercase tracking-[0.35em] text-white/90"
                  >
                    R&amp;D Labs
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.45em] text-white/80/70">
                    <span className="chalk-breath">Texture</span>
                    <span className="chalk-breath">Flavor</span>
                    <span className="chalk-breath">Future</span>
                    <span className="text-white/80/60">
                      Active project • {projectName}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 text-right">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleSaveAndClose}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-white/40 hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a97e]/70"
                    >
                      Save and Close
                    </button>
                    {hintVisible ? (
                      <div className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80 shadow-[0_12px_30px_-18px_rgba(56,189,248,0.65)] dark:border-[#c8a97e]/25 dark:bg-[#c8a97e]/10">
                        Saving will lock in the last state.
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewProjectOpen(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#c8a97e]/25 bg-[#c8a97e]/20 px-3.5 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/80 transition hover:border-[#c8a97e]/50 hover:bg-[#c8a97e]/25 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a97e]/50"
                  >
                    New Project
                  </button>
                  <div className="w-[220px]">
                    <Select
                      value={selectValue}
                      onValueChange={handleSessionChange}
                      disabled={!hasSessions || !selectValue}
                    >
                      <SelectTrigger className="h-9 rounded-full border border-white/25 bg-white/10 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80 backdrop-blur transition hover:border-white/40 focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder="Reopen a saved session" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900/95 text-white/80 backdrop-blur-md">
                        {sessions.map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium">
                                {session.name}
                              </span>
                              <span className="text-xs opacity-70">
                                {formatProjectTimestamp(session.updatedAt)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </header>
              <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-1 min-h-0 flex-col gap-3 px-4 pb-4 pt-4">
                  <p
                    className={`max-w-3xl text-sm leading-relaxed ${accentMuted}`}
                  >
                    Drag the dividers to resize each workspace. Use these
                    surfaces for experiments, documentation, and automation
                    flows. Layout widths persist so your lab reopens exactly how
                    you left it.
                  </p>
                  <PanelGroup
                    key={layout.join("-")}
                    direction="horizontal"
                    onLayout={onLayoutChange}
                    className="relative z-10 flex h-full min-h-0 items-stretch gap-3"
                  >
                    <Panel
                      minSize={20}
                      order={1}
                      defaultSize={layout[0]}
                      className="flex min-h-0"
                    >
                      <section
                        data-chalk-label="INSPIRE"
                        className={`${rndPanelBaseClasses} ${rndPanelToneClasses} ${rndPanelThemes[0]}`}
                      >
                        <header className={rndPanelHeadingClasses}>
                          Discovery runway
                        </header>
                        <p
                          className={`mt-2 text-xs leading-relaxed ${accentMuted}`}
                        >
                          Stage inspiration, competitive research, and sourcing
                          notes here.
                        </p>
                        <div className="mt-3 flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2.5 shadow-inner shadow-[#c8a97e]/5">
                          <DiscoveryPanel />
                        </div>
                      </section>
                    </Panel>
                    <PanelResizeHandle className={rndHandleClasses}>
                      <span className="pointer-events-none h-10 w-0.5 rounded-full bg-white/60 opacity-80 transition group-hover:bg-[#c8a97e]/80/80" />
                    </PanelResizeHandle>
                    <Panel
                      minSize={26}
                      order={2}
                      defaultSize={layout[1]}
                      className="flex min-h-0"
                    >
                      <section
                        data-chalk-label="FORMULATE"
                        className={`${rndPanelBaseClasses} ${rndPanelToneClasses} ${rndPanelThemes[1]}`}
                      >
                        <header className={rndPanelHeadingClasses}>
                          Workbench
                        </header>
                        <p
                          className={`mt-2 text-xs leading-relaxed ${accentMuted}`}
                        >
                          Reserve this lane for formulations, live tests, or
                          shared prototypes.
                        </p>
                        <div className="mt-3 flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2.5 shadow-inner shadow-[#c8a97e]/5">
                          <WorkbenchPanel />
                        </div>
                      </section>
                    </Panel>
                    <PanelResizeHandle className={rndHandleClasses}>
                      <span className="pointer-events-none h-10 w-0.5 rounded-full bg-white/60 opacity-80 transition group-hover:bg-[#c8a97e]/80/80" />
                    </PanelResizeHandle>
                    <Panel
                      minSize={20}
                      order={3}
                      defaultSize={layout[2]}
                      className="flex min-h-0"
                    >
                      <section
                        data-chalk-label="SYNTHESIZE"
                        className={`${rndPanelBaseClasses} ${rndPanelToneClasses} ${rndPanelThemes[2]}`}
                      >
                        <header className={rndPanelHeadingClasses}>
                          Insight stack
                        </header>
                        <p
                          className={`mt-2 text-xs leading-relaxed ${accentMuted}`}
                        >
                          Pin KPIs, AI summaries, or vendor comparisons for
                          rapid decisions.
                        </p>
                        <div className="mt-3 flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2.5 shadow-inner shadow-[#c8a97e]/5">
                          <InsightsPanel />
                        </div>
                      </section>
                    </Panel>
                  </PanelGroup>
                </div>
                <RDLabSessionSidebar
                  isDarkMode={isDarkMode}
                  projectName={projectName}
                  createdAt={activeSession?.createdAt ?? lastSavedAt}
                  updatedAt={activeSession?.updatedAt ?? lastSavedAt}
                  vision={activeSession?.vision}
                  textureFocus={activeSession?.textureFocus}
                  flavorNotes={activeSession?.flavorNotes}
                  launchTarget={activeSession?.launchTarget}
                  focusExperiment={focusExperiment}
                  experimentsCount={experiments.length}
                  discoveryQueue={discoveryQueue}
                  backlog={backlog}
                  insights={insights}
                />
                <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col items-end gap-1.5">
                  {autoSaveState === "saving" ? (
                    <div className="flex items-center gap-1.5 rounded-full border border-[#c8a97e]/25 bg-[#c8a97e]/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.3em] text-white/80 shadow-[0_18px_48px_-36px_rgba(56,189,248,0.55)]">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#c8a97e]" />
                      Saving {projectName}…
                    </div>
                  ) : null}
                  {autoSaveState === "saved" && lastSavedAt ? (
                    <div
                      key={savePulseKey}
                      className="flex items-center gap-1.5 rounded-full border border-[#c8a97e]/30 bg-[#c8a97e]/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80 shadow-[0_25px_60px_-40px_rgba(56,189,248,0.75)] animate-rd-save-pulse"
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-300" />(
                      {projectName}) Last saved{" "}
                      {formatProjectTimestamp(lastSavedAt)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onSubmit={handleProjectCreate}
      />
    </>,
    document.body,
  );
}

export default RecipeInputPage;
