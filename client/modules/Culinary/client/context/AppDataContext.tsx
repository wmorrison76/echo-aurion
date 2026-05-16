import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import JSZip from "jszip";
import mockRecipes from "../data/mockRecipes";
import { KITCHEN_STATIONS, CHIT_PRINTERS } from "../data/kitchenStations";
import { DEMO_PLACEHOLDERS, FALLBACK_GALLERY_IMAGE } from "../lib/placeholders";
import {
  clearAllImageBlobs,
  deleteImageBlob,
  loadImageBlob,
  saveImageBlob,
} from "../lib/gallery-storage";
import { objectURLCache } from "../lib/object-url-cache";
import type { Recipe } from "../../shared/recipes";
import type { RecipeCollection } from "../../shared/server-notes";
import { defaultLanguage, type LanguageCode } from "../i18n/config";
import { downloadZip } from "../lib/download-utils";
import { useAuth } from "./AuthContext";
import { cloudRecipeSync } from "../lib/cloud-recipe-sync";
export type { Recipe } from "../../shared/recipes";
// Mammoth is loaded on-demand to keep bundle small and avoid init errors in some environments

export type GalleryImage = {
  id: string;
  name: string;
  dataUrl?: string; // base64 Data URL
  blobUrl?: string; // for unsupported formats
  createdAt: number;
  tags: string[];
  favorite?: boolean;
  order: number;
  type?: string;
  unsupported?: boolean;
};

type StoredGalleryImage = Omit<GalleryImage, "dataUrl" | "blobUrl"> & {
  hasBlob?: boolean;
};

const serializeImagesForStorage = (
  items: GalleryImage[],
): StoredGalleryImage[] =>
  items.map((item) => ({
    id: item.id,
    name: item.name,
    createdAt: item.createdAt,
    tags: item.tags ?? [],
    favorite: item.favorite,
    order: item.order,
    type: item.type,
    unsupported: item.unsupported,
    hasBlob: Boolean(item.dataUrl || item.blobUrl),
  }));

export type LookBook = {
  id: string;
  name: string;
  imageIds: string[];
  createdAt: number;
};

export type TileBoardTile = {
  id: string;
  title: string;
  subtitle?: string;
  imageId: string | null;
  tags: string[];
  layout: "landscape" | "portrait" | "square";
  accent?: string;
  createdAt: number;
};

export type TileBoard = {
  id: string;
  name: string;
  description?: string;
  category: "server-notes" | "cooks-recipes" | "custom";
  tiles: TileBoardTile[];
  createdAt: number;
  updatedAt: number;
};

export type DishWorkflowComponentSnapshot = {
  componentId: string;
  recipeId: string | null;
  label: string;
  quantity: string;
  notes?: string;
};

export type DishWorkflowPosRoute = {
  systemName: string;
  itemCode: string;
  price: string;
  status: "draft" | "ready" | "synced";
};

export type DishWorkflowPlan = {
  id: string;
  name: string;
  menuTitle: string;
  menuDescription: string;
  menuPrice: string;
  serviceware: string;
  serverNotes: string;
  stationIds: string[];
  printerIds: string[];
  components: DishWorkflowComponentSnapshot[];
  posRoutes: DishWorkflowPosRoute[];
  heroImage?: string | null;
  savedAt: number;
  updatedAt: number;
};

export type InspectionReport = {
  id: string;
  name: string;
  inspector?: string;
  notes?: string;
  tags: string[];
  followUpDate?: string | null;
  uploadedAt: number;
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

type AppData = {
  recipes: Recipe[];
  images: GalleryImage[];
  lookbooks: LookBook[];
  tileBoards: TileBoard[];
  addImages: (files: File[], opts?: { tags?: string[] }) => Promise<number>;
  restoreDemo: () => void;
  createTileBoard: (input: {
    name: string;
    description?: string;
    category?: TileBoard["category"];
    imageIds?: string[];
  }) => string;
  updateTileBoard: (
    id: string,
    patch: Partial<Omit<TileBoard, "id" | "createdAt" | "tiles">>,
  ) => void;
  deleteTileBoard: (id: string) => void;
  addTileToBoard: (
    boardId: string,
    tile: Omit<TileBoardTile, "id" | "createdAt"> & { id?: string },
  ) => string;
  updateTileInBoard: (
    boardId: string,
    tileId: string,
    patch: Partial<TileBoardTile>,
  ) => void;
  removeTileFromBoard: (boardId: string, tileId: string) => void;
  addDemoImages: () => Promise<number>;
  addStockFoodPhotos: () => Promise<number>;
  addRecipe: (recipe: Omit<Recipe, "id" | "createdAt">) => string;
  addRecipesFromJsonFiles: (files: File[]) => Promise<{
    added: number;
    errors: { file: string; error: string }[];
    titles: string[];
  }>;
  addRecipesFromDocxFiles: (files: File[]) => Promise<{
    added: number;
    errors: { file: string; error: string }[];
    titles: string[];
  }>;
  addRecipesFromHtmlFiles: (files: File[]) => Promise<{
    added: number;
    errors: { file: string; error: string }[];
    titles: string[];
  }>;
  addRecipesFromPdfFiles: (files: File[]) => Promise<{
    added: number;
    errors: { file: string; error: string }[];
    titles: string[];
  }>;
  addRecipesFromPdfFilesVision: (files: File[]) => Promise<{
    added: number;
    errors: { file: string; error: string }[];
    titles: string[];
  }>;
  addRecipesFromExcelFiles: (files: File[]) => Promise<{
    added: number;
    errors: { file: string; error: string }[];
    titles: string[];
  }>;
  addRecipesFromImageOcr: (files: File[]) => Promise<{
    added: number;
    errors: { file: string; error: string }[];
    titles: string[];
  }>;
  addFromZipArchive: (file: File) => Promise<{
    addedRecipes: number;
    addedImages: number;
    errors: { entry: string; error: string }[];
    titles: string[];
  }>;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  toggleFavorite: (id: string) => void;
  rateRecipe: (id: string, rating: number) => void;
  updateRecipeTags: (id: string, tags: string[]) => void;
  deleteRecipe: (id: string) => void;
  restoreRecipe: (id: string) => void;
  purgeDeleted: () => void;
  destroyRecipe: (id: string) => void;
  getRecipeById: (id: string) => Recipe | undefined;
  attachImageToRecipeFromGallery: (recipeId: string, imageName: string) => void;
  clearRecipes: () => void;
  clearImages: () => void;
  searchRecipes: (q: string) => Recipe[];
  linkImagesToRecipesByFilename: () => void;
  updateImage: (id: string, patch: Partial<GalleryImage>) => void;
  addTagsToImages: (ids: string[], tags: string[]) => void;
  reorderImages: (dragId: string, overId: string) => void;
  deleteImage: (id: string) => void;
  addLookBook: (name: string, imageIds?: string[]) => string;
  updateLookBook: (id: string, patch: Partial<LookBook>) => void;
  deleteLookBook: (id: string) => void;
  addImagesToLookBook: (id: string, imageIds: string[]) => void;
  removeImagesFromLookBook: (id: string, imageIds: string[]) => void;
  exportAllZip: (language?: LanguageCode) => Promise<void>;
  workflows: DishWorkflowPlan[];
  inspections: InspectionReport[];
  collections: RecipeCollection[];
  createCollection: (input: {
    name: string;
    season: string;
    year: number;
    version: number;
    description?: string;
    recipeIds?: string[];
  }) => RecipeCollection;
  updateCollection: (
    id: string,
    patch: Partial<Omit<RecipeCollection, "id" | "createdAt" | "recipeIds">>,
  ) => void;
  deleteCollection: (id: string) => void;
  addRecipeToCollection: (collectionId: string, recipeId: string) => void;
  removeRecipeFromCollection: (collectionId: string, recipeId: string) => void;
  setCollectionRecipes: (collectionId: string, recipeIds: string[]) => void;
  getCollectionById: (id: string) => RecipeCollection | undefined;
  addWorkflowPlan: (plan: DishWorkflowPlan) => void;
  updateWorkflowPlan: (id: string, patch: Partial<DishWorkflowPlan>) => void;
  deleteWorkflowPlan: (id: string) => void;
  addInspectionReport: (report: InspectionReport) => void;
  deleteInspectionReport: (id: string) => void;
  getWorkflowById: (id: string) => DishWorkflowPlan | undefined;
  getInspectionById: (id: string) => InspectionReport | undefined;
  listStations: () => typeof KITCHEN_STATIONS;
  listPrinters: () => typeof CHIT_PRINTERS;
};

const CTX = createContext<AppData | null>(null);

const LS_RECIPES = "app.recipes.v1";
const LS_IMAGES = "app.images.v1";
const LS_LOOKBOOKS = "app.lookbooks.v1";
const LS_COLLECTIONS = "app.collections.v1";
const LS_TILE_BOARDS = "app.tileboards.v1";
const LS_WORKFLOWS = "app.workflows.v1";
const LS_INSPECTIONS = "app.inspections.v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("LocalStorage write failed", e);
  }
}

// --- Recipe normalization and deduplication helpers ---
const TITLE_SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function isAllCapsWord(word: string) {
  return /^\p{Lu}+$/u.test(word);
}

function formatSegment(seg: string) {
  if (!seg) return seg;
  const parts = seg.split(/([\s-\/]+)/g);
  return parts
    .map((p) => {
      if (/^\s+$/.test(p) || /[-\/]/.test(p)) return p;
      const lw = p.toLowerCase();
      if (isAllCapsWord(p)) return p; // keep acronyms
      if (TITLE_SMALL_WORDS.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join("");
}

function formatRecipeTitleCase(title: string) {
  if (!title) return title;
  title = normalizeSpaces(title.replace(/[__]+/g, " "));
  // Split by colon to treat subtitle separately
  const parts = title.split(":").map((p) => p.trim());
  const main = parts[0]
    .split(/\s+/)
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (i === 0) return formatSegment(w);
      if (TITLE_SMALL_WORDS.has(lw)) return lw;
      return formatSegment(w);
    })
    .join(" ");
  if (parts.length > 1)
    return [main, ...parts.slice(1).map((p) => formatSegment(p))].join(": ");
  return main;
}

function recipeTitleKey(title: string) {
  return normalizeSpaces(String(title ?? "").toLowerCase());
}

function sanitizeRecipeRecord(recipe: Recipe): Recipe {
  const id = recipe.id || uid();
  const createdAt = recipe.createdAt || Date.now();
  const title = formatRecipeTitleCase(
    String(recipe.title ?? "").trim() || "Untitled",
  );
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((s) => String(s).trim()).filter(Boolean)
    : recipe.ingredients;
  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions.map((s) => String(s).trim()).filter(Boolean)
    : recipe.instructions;
  const tags = Array.isArray(recipe.tags)
    ? Array.from(
        new Set(recipe.tags.map((t) => String(t).trim()).filter(Boolean)),
      )
    : recipe.tags;
  const imageNames = Array.isArray(recipe.imageNames)
    ? Array.from(
        new Set(recipe.imageNames.map((n) => String(n).trim()).filter(Boolean)),
      )
    : recipe.imageNames;

  const sanitized: Recipe = {
    ...recipe,
    id,
    createdAt,
    title,
    ingredients: ingredients && ingredients.length ? ingredients : undefined,
    instructions:
      instructions && instructions.length ? instructions : undefined,
    tags: tags && tags.length ? tags : undefined,
    imageNames: imageNames && imageNames.length ? imageNames : undefined,
  } as Recipe;

  return sanitized;
}

function sanitizeRecipeCollection(list: Recipe[]): Recipe[] {
  const seen = new Map<string, Recipe>();
  for (const r of list) {
    try {
      const s = sanitizeRecipeRecord(r);
      const key = recipeTitleKey(s.title);
      if (!seen.has(key)) seen.set(key, s);
      else {
        // prefer the earlier createdAt (smaller) or keep existing, but merge extras
        const existing = seen.get(key)!;
        const keep = existing.createdAt <= s.createdAt ? existing : s;
        const other = existing === keep ? s : existing;
        seen.set(key, {
          ...keep,
          extra: { ...(keep.extra ?? {}), ...(other.extra ?? {}) },
        });
      }
    } catch {
      // ignore bad entries
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.createdAt - a.createdAt);
}

function createRecipeDeduper(current: Recipe[]) {
  const keys = new Set(current.map((r) => recipeTitleKey(r.title)));
  return (candidate: Recipe) => {
    const sanitized = sanitizeRecipeRecord(candidate);
    const key = recipeTitleKey(sanitized.title);
    if (keys.has(key)) {
      const existing = current.find((r) => recipeTitleKey(r.title) === key)!;
      return { accepted: false, recipe: existing } as const;
    }
    keys.add(key);
    return { accepted: true, recipe: sanitized } as const;
  };
}

// --- end helpers ---

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [lookbooks, setLookbooks] = useState<LookBook[]>([]);
  const [tileBoards, setTileBoards] = useState<TileBoard[]>([]);
  const [collections, setCollections] = useState<RecipeCollection[]>([]);
  const [workflows, setWorkflows] = useState<DishWorkflowPlan[]>([]);
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const mountedRef = useRef(true);
  const [imagesHydrated, setImagesHydrated] = useState(false);
  const [recipesLoading, setRecipesLoading] = useState(true);

  /**
   * Create object URL using LRU cache to prevent WebKitBlobResource exhaustion
   * Automatically evicts least-recently-used URLs when cache exceeds max size (200)
   */
  const createObjectUrl = useCallback((id: string, blob: Blob) => {
    return objectURLCache.set(id, blob);
  }, []);

  const appendRecipes = useCallback(
    (incoming: Recipe[]) => {
      if (!incoming.length) {
        return { added: [] as Recipe[], duplicates: [] as Recipe[] };
      }
      const sanitizedIncoming = incoming.map((recipe) =>
        sanitizeRecipeRecord(recipe),
      );
      const duplicates: Recipe[] = [];
      const added: Recipe[] = [];
      setRecipes((prev) => {
        const dedupe = createRecipeDeduper(prev);
        const accepted: Recipe[] = [];
        sanitizedIncoming.forEach((candidate) => {
          const result = dedupe(candidate);
          if (result.accepted) {
            accepted.push(result.recipe);
            added.push(result.recipe);
          } else {
            duplicates.push(result.recipe);
          }
        });
        if (!accepted.length) return prev;
        return [...accepted, ...prev];
      });
      return { added, duplicates };
    },
    [setRecipes],
  );
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      // Clean up all object URLs when component unmounts
      objectURLCache.clear();
    };
  }, []);

  /**
   * Monitor object URL cache utilization and warn if approaching limit
   */
  const monitorCacheUtilization = useCallback(() => {
    const stats = objectURLCache.getStats();
    if (stats.utilizationPercent > 80) {
      console.warn(
        `[AppData] Object URL cache utilization high: ${stats.utilizationPercent}% (${stats.currentSize}/${stats.maxSize})`,
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeRecipes = async () => {
      try {
        setRecipesLoading(true);
        // Initialize cloud sync with user ID
        const cloudRecipes = await cloudRecipeSync.initialize(user?.id || null);

        if (!cancelled && mountedRef.current) {
          // Use cloud recipes if available, otherwise use mock recipes
          const recipesToUse = cloudRecipes.length > 0
            ? cloudRecipes
            : readLS<Recipe[]>(LS_RECIPES, []);

          setRecipes(
            sanitizeRecipeCollection(
              recipesToUse.length ? recipesToUse : mockRecipes,
            ),
          );

          // Setup periodic sync if user is logged in
          if (user?.id) {
            const stopSync = cloudRecipeSync.startPeriodicSync(user.id);
            return () => stopSync();
          }
        }
      } finally {
        if (!cancelled) {
          setRecipesLoading(false);
        }
      }
    };

    initializeRecipes();

    setLookbooks(readLS<LookBook[]>(LS_LOOKBOOKS, []));
    setTileBoards(readLS<TileBoard[]>(LS_TILE_BOARDS, []));
    setCollections(readLS<RecipeCollection[]>(LS_COLLECTIONS, []));
    setWorkflows(readLS<DishWorkflowPlan[]>(LS_WORKFLOWS, []));
    setInspections(readLS<InspectionReport[]>(LS_INSPECTIONS, []));

    const hydrate = async () => {
      try {
        const stored = readLS<Array<StoredGalleryImage & { dataUrl?: string }>>(
          LS_IMAGES,
          [],
        );
        console.debug(
          "Loading gallery images from localStorage:",
          stored.length,
          "records",
        );
        const hydratedImages = await hydrateStoredImages(
          stored,
          createObjectUrl,
        );
        console.debug(
          "Successfully hydrated gallery images:",
          hydratedImages.length,
          "images",
        );
        if (!cancelled) {
          setImages(hydratedImages);
          setImagesHydrated(true);
          // Monitor cache after hydration
          monitorCacheUtilization();
        }
      } catch (error) {
        console.error("Failed to restore gallery images", error);
        if (!cancelled) {
          setImages([]);
          setImagesHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [createObjectUrl, monitorCacheUtilization, user]);

  useEffect(() => {
    if (!imagesHydrated) return;

    const onlyLegacyDemo =
      images.length > 0 &&
      images.every(
        (image) =>
          (image.tags || []).includes("demo") &&
          !(image.tags || []).includes("food"),
      );

    if (images.length > 0 && !onlyLegacyDemo) {
      return;
    }

    const seedPlaceholders = async () => {
      const timestamp = Date.now();
      const placeholders: GalleryImage[] = DEMO_PLACEHOLDERS.map(
        (item, index) => ({
          id: uid(),
          name: item.name,
          dataUrl: item.dataUrl,
          createdAt: timestamp + index,
          tags: item.tags,
          favorite: false,
          order: index,
          type: item.mime,
        }),
      );

      if (!placeholders.length) {
        placeholders.push({
          id: uid(),
          name: "luccca-demo.svg",
          dataUrl: FALLBACK_GALLERY_IMAGE.dataUrl,
          createdAt: timestamp,
          tags: ["demo", "fallback"],
          favorite: false,
          order: 0,
          type: FALLBACK_GALLERY_IMAGE.mime,
        });
      }

      const enriched: GalleryImage[] = [];
      for (const item of placeholders) {
        if (!item.dataUrl) {
          enriched.push(item);
          continue;
        }
        try {
          const blob = await blobFromDataUrl(item.dataUrl);
          await saveImageBlob(item.id, blob);
          const blobUrl = createObjectUrl(item.id, blob);
          const refreshedDataUrl = await dataUrlFromBlob(blob);
          enriched.push({ ...item, dataUrl: refreshedDataUrl, blobUrl });
        } catch (error) {
          console.warn("Failed to persist placeholder image", item.name, error);
          enriched.push(item);
        }
      }

      setImages(enriched);
      try {
        localStorage.setItem("gallery:seeded:food:v1", "1");
      } catch {}
    };

    seedPlaceholders();
  }, [images, imagesHydrated, createObjectUrl]);

  useEffect(() => {
    writeLS(LS_RECIPES, recipes);
    // Sync recipes to cloud if user is logged in
    if (user?.id && recipes.length > 0) {
      cloudRecipeSync.saveRecipeBatchToCloud(user.id, recipes).catch((error) => {
        console.error("[AppDataContext] Failed to sync recipes to cloud:", error);
      });
    }
  }, [recipes, user?.id]);

  useEffect(() => {
    if (images.length > 0) {
      try {
        const serialized = serializeImagesForStorage(images);
        writeLS(LS_IMAGES, serialized);
        console.debug(
          "Images persisted to localStorage:",
          serialized.length,
          "records",
        );
      } catch (error) {
        console.error("Failed to persist images to localStorage:", error);
      }
    }
  }, [images]);

  useEffect(() => {
    writeLS(LS_LOOKBOOKS, lookbooks);
  }, [lookbooks]);

  useEffect(() => {
    writeLS(LS_TILE_BOARDS, tileBoards);
  }, [tileBoards]);

  useEffect(() => {
    if (tileBoards.length === 0 && images.length > 0) {
      const now = Date.now();
      const sample = images.slice(0, 4);
      const defaults: TileBoard[] = [
        {
          id: uid(),
          name: "Server Notes",
          description: "Hero imagery for service clarifications",
          category: "server-notes",
          createdAt: now,
          updatedAt: now,
          tiles: sample.slice(0, 3).map((image, index) => ({
            id: uid(),
            title: image.name,
            subtitle: "Service highlight",
            imageId: image.id,
            tags: ["server-notes"],
            layout: index % 2 === 0 ? "landscape" : "portrait",
            accent: "#38bdf8",
            createdAt: now + index,
          })),
        },
        {
          id: uid(),
          name: "Cook's Recipes",
          description: "Production-ready plating references",
          category: "cooks-recipes",
          createdAt: now,
          updatedAt: now,
          tiles: sample.map((image, index) => ({
            id: uid(),
            title: image.name,
            subtitle: "Batch prep",
            imageId: image.id,
            tags: ["cooks", "recipes"],
            layout: "landscape",
            accent: "#f59e0b",
            createdAt: now + index,
          })),
        },
      ];
      setTileBoards(defaults);
    }
  }, [tileBoards.length, images]);

  useEffect(() => {
    writeLS(LS_COLLECTIONS, collections);
  }, [collections]);

  useEffect(() => {
    writeLS(LS_WORKFLOWS, workflows);
  }, [workflows]);

  useEffect(() => {
    writeLS(LS_INSPECTIONS, inspections);
  }, [inspections]);

  const dataUrlFromFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const dataUrlFromBlob = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  const blobFromDataUrl = async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    return response.blob();
  };

  const hydrateStoredImages = async (
    records: Array<StoredGalleryImage & { dataUrl?: string; blobUrl?: string }>,
    createObjectUrl: (id: string, blob: Blob) => string,
  ): Promise<GalleryImage[]> => {
    if (!records.length) {
      return [];
    }
    const hydrated: GalleryImage[] = [];
    for (const record of records) {
      const {
        hasBlob,
        id,
        name,
        createdAt,
        tags,
        favorite,
        order,
        type,
        unsupported,
      } = record;
      let dataUrl = record.dataUrl;
      let blobUrl: string | undefined;
      const shouldLoadBlob = hasBlob !== false || Boolean(record.dataUrl);
      if (shouldLoadBlob) {
        try {
          let blob = await loadImageBlob(id);
          if (!blob && record.dataUrl) {
            blob = await blobFromDataUrl(record.dataUrl);
            await saveImageBlob(id, blob);
          }
          if (blob) {
            blobUrl = createObjectUrl(id, blob);
            if (!unsupported && !dataUrl) {
              dataUrl = await dataUrlFromBlob(blob);
            }
          }
        } catch (error) {
          console.warn("Failed to hydrate gallery image", name, error);
        }
      }
      hydrated.push({
        id,
        name,
        dataUrl: unsupported ? undefined : dataUrl,
        blobUrl: blobUrl ?? (unsupported ? undefined : record.blobUrl),
        createdAt,
        tags,
        favorite,
        order,
        type,
        unsupported,
      });
    }
    return hydrated;
  };

  const createTileBoard = useCallback(
    (input: {
      name: string;
      description?: string;
      category?: TileBoard["category"];
      imageIds?: string[];
    }) => {
      const id = uid();
      const now = Date.now();
      const board: TileBoard = {
        id,
        name: input.name,
        description: input.description,
        category: input.category ?? "custom",
        createdAt: now,
        updatedAt: now,
        tiles: (input.imageIds ?? []).slice(0, 8).map((imageId, index) => {
          const image = images.find((item) => item.id === imageId) ?? null;
          return {
            id: uid(),
            title: image?.name ?? `Tile ${index + 1}`,
            subtitle: image ? "Generated from gallery" : undefined,
            imageId: image?.id ?? null,
            tags: [input.name.toLowerCase().replace(/\s+/g, "-")],
            layout: index % 3 === 0 ? "portrait" : "landscape",
            accent: index % 2 === 0 ? "#38bdf8" : "#f97316",
            createdAt: now + index,
          } satisfies TileBoardTile;
        }),
      } satisfies TileBoard;
      setTileBoards((prev) => [...prev, board]);
      return id;
    },
    [images],
  );

  const updateTileBoard = useCallback(
    (
      id: string,
      patch: Partial<Omit<TileBoard, "id" | "createdAt" | "tiles">>,
    ) => {
      setTileBoards((prev) =>
        prev.map((board) =>
          board.id === id
            ? {
                ...board,
                ...patch,
                updatedAt: Date.now(),
              }
            : board,
        ),
      );
    },
    [],
  );

  const deleteTileBoard = useCallback((id: string) => {
    setTileBoards((prev) => prev.filter((board) => board.id !== id));
  }, []);

  const addTileToBoard = useCallback(
    (
      boardId: string,
      tile: Omit<TileBoardTile, "id" | "createdAt"> & { id?: string },
    ) => {
      const now = Date.now();
      const tileId = tile.id ?? uid();
      setTileBoards((prev) =>
        prev.map((board) =>
          board.id === boardId
            ? {
                ...board,
                updatedAt: now,
                tiles: [
                  ...board.tiles,
                  {
                    ...tile,
                    id: tileId,
                    createdAt: now,
                  },
                ],
              }
            : board,
        ),
      );
      return tileId;
    },
    [],
  );

  const updateTileInBoard = useCallback(
    (boardId: string, tileId: string, patch: Partial<TileBoardTile>) => {
      setTileBoards((prev) =>
        prev.map((board) =>
          board.id === boardId
            ? {
                ...board,
                updatedAt: Date.now(),
                tiles: board.tiles.map((tile) =>
                  tile.id === tileId
                    ? {
                        ...tile,
                        ...patch,
                      }
                    : tile,
                ),
              }
            : board,
        ),
      );
    },
    [],
  );

  const removeTileFromBoard = useCallback((boardId: string, tileId: string) => {
    setTileBoards((prev) =>
      prev.map((board) =>
        board.id === boardId
          ? {
              ...board,
              updatedAt: Date.now(),
              tiles: board.tiles.filter((tile) => tile.id !== tileId),
            }
          : board,
      ),
    );
  }, []);

  const addImages = useCallback(
    async (files: File[], opts?: { tags?: string[] }) => {
      let added = 0;
      const existing = new Set(images.map((i) => i.name));
      const maxOrder = images.length
        ? Math.max(
            ...images.map((i) => (typeof i.order === "number" ? i.order : -1)),
          )
        : -1;
      let order = maxOrder + 1;
      const next: GalleryImage[] = [];
      for (const file of files) {
        if (existing.has(file.name)) {
          console.debug("Skipping duplicate image name", file.name);
          continue;
        }
        try {
          const createdAt = Date.now();
          const baseMeta = {
            id: uid(),
            name: file.name,
            createdAt,
            tags: opts?.tags ?? [],
            favorite: false,
            order: order++,
            type: file.type,
          };
          const isDisplayable =
            file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
          if (isDisplayable) {
            const dataUrl = await dataUrlFromFile(file);
            try {
              await saveImageBlob(baseMeta.id, file);
            } catch (storageError) {
              console.error(
                "Failed to save image blob to IndexedDB",
                file.name,
                storageError,
              );
              throw storageError;
            }
            const blobUrl = createObjectUrl(baseMeta.id, file);
            next.push({
              ...baseMeta,
              dataUrl,
              blobUrl,
            });
            added++;
            console.debug("Successfully added displayable image", file.name);
          } else {
            const blob = new Blob([await file.arrayBuffer()], {
              type: file.type || "application/octet-stream",
            });
            try {
              await saveImageBlob(baseMeta.id, blob);
            } catch (storageError) {
              console.error(
                "Failed to save unsupported image blob to IndexedDB",
                file.name,
                storageError,
              );
              throw storageError;
            }
            const blobUrl = createObjectUrl(baseMeta.id, blob);
            next.push({
              ...baseMeta,
              blobUrl,
              unsupported: true,
            });
            added++;
            console.debug("Successfully added unsupported image", file.name);
          }
        } catch (error) {
          console.error("Failed to ingest image", file.name, error);
        }
      }
      if (next.length) {
        console.debug("Adding images to state, count:", next.length);
        setImages((prev) => [...next, ...prev]);
        // Check cache utilization after adding images
        monitorCacheUtilization();
      } else {
        console.warn("No images were successfully processed");
      }
      return added;
    },
    [images, createObjectUrl, monitorCacheUtilization],
  );

  const addRecipe = useCallback((recipe: Omit<Recipe, "id" | "createdAt">) => {
    const candidate: Recipe = {
      id: uid(),
      createdAt: Date.now(),
      ...recipe,
      title: ((recipe.title ?? "") as string).trim() || "Untitled",
    } as Recipe;
    const sanitized = sanitizeRecipeRecord(candidate);
    const key = recipeTitleKey(sanitized.title);
    let resultId = sanitized.id;
    setRecipes((prev) => {
      const existingIndex = prev.findIndex(
        (entry) => recipeTitleKey(entry.title) === key,
      );
      if (existingIndex !== -1) {
        const existing = prev[existingIndex]!;
        resultId = existing.id;
        const mergedExtra =
          recipe.extra !== undefined
            ? { ...(existing.extra ?? {}), ...(recipe.extra ?? {}) }
            : existing.extra;
        const mergedExisting = sanitizeRecipeRecord({
          ...existing,
          ...recipe,
          id: existing.id,
          createdAt: existing.createdAt,
          extra: mergedExtra,
        } as Recipe);
        const next = prev.slice();
        next[existingIndex] = mergedExisting;
        return next;
      }
      return [sanitized, ...prev];
    });
    return resultId;
  }, []);

  const updateImage = useCallback(
    (id: string, patch: Partial<GalleryImage>) => {
      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? { ...img, ...patch, tags: patch.tags ?? img.tags }
            : img,
        ),
      );
    },
    [],
  );

  const addTagsToImages = useCallback((ids: string[], tags: string[]) => {
    const set = new Set(tags.map((t) => t.trim()).filter(Boolean));
    setImages((prev) =>
      prev.map((img) =>
        ids.includes(img.id)
          ? { ...img, tags: Array.from(new Set([...(img.tags ?? []), ...set])) }
          : img,
      ),
    );
  }, []);

  const reorderImages = useCallback((dragId: string, overId: string) => {
    setImages((prev) => {
      const idxA = prev.findIndex((i) => i.id === dragId);
      const idxB = prev.findIndex((i) => i.id === overId);
      if (idxA === -1 || idxB === -1) return prev;
      const copy = prev.slice();
      const [moved] = copy.splice(idxA, 1);
      copy.splice(idxB, 0, moved);
      return copy.map((i, idx) => ({ ...i, order: idx }));
    });
  }, []);

  const deleteImage = useCallback((id: string) => {
    setImages((prev) => {
      const next = prev.filter((i) => i.id !== id);
      const existingUrl = imageObjectUrlsRef.current.get(id);
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl);
        imageObjectUrlsRef.current.delete(id);
      }
      return next;
    });
    setLookbooks((prev) =>
      prev.map((b) => ({ ...b, imageIds: b.imageIds.filter((x) => x !== id) })),
    );
    deleteImageBlob(id).catch((error) =>
      console.warn("Failed to remove gallery image blob", error),
    );
  }, []);

  const addLookBook = useCallback((name: string, imageIds: string[] = []) => {
    const id = uid();
    const lb: LookBook = {
      id,
      name: name.trim() || "Untitled",
      imageIds: Array.from(new Set(imageIds)),
      createdAt: Date.now(),
    };
    setLookbooks((prev) => [lb, ...prev]);
    return id;
  }, []);

  const updateLookBook = useCallback((id: string, patch: Partial<LookBook>) => {
    setLookbooks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              ...patch,
              imageIds: patch.imageIds
                ? Array.from(new Set(patch.imageIds))
                : b.imageIds,
            }
          : b,
      ),
    );
  }, []);

  const deleteLookBook = useCallback((id: string) => {
    setLookbooks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addImagesToLookBook = useCallback((id: string, imageIds: string[]) => {
    setLookbooks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              imageIds: Array.from(
                new Set([...(b.imageIds || []), ...imageIds]),
              ),
            }
          : b,
      ),
    );
  }, []);

  const removeImagesFromLookBook = useCallback(
    (id: string, imageIds: string[]) => {
      const rm = new Set(imageIds);
      setLookbooks((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, imageIds: (b.imageIds || []).filter((x) => !rm.has(x)) }
            : b,
        ),
      );
    },
    [],
  );

  const dataUrlToUint8 = (dataUrl: string): Uint8Array => {
    const [, base64] = dataUrl.split(",");
    const bin = atob(base64 || "");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  };

  const exportAllZip = useCallback(
    async (language: LanguageCode = defaultLanguage) => {
      const JSZipModule = await import("jszip");
      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      const timestamp = new Date().toISOString();
      zip.file("data/recipes.json", JSON.stringify(recipes, null, 2));
      zip.file("data/lookbooks.json", JSON.stringify(lookbooks, null, 2));
      zip.file("data/collections.json", JSON.stringify(collections, null, 2));
      zip.file(
        "data/images.json",
        JSON.stringify(
          images.map((i) => ({
            id: i.id,
            name: i.name,
            tags: i.tags,
            order: i.order,
            favorite: i.favorite,
            type: i.type,
          })),
          null,
          2,
        ),
      );
      zip.file(
        "metadata.json",
        JSON.stringify(
          {
            language,
            exportedAt: timestamp,
            recipeCount: recipes.length,
            collectionCount: collections.length,
            imageCount: images.length,
          },
          null,
          2,
        ),
      );
      const folder = zip.folder("images");
      if (folder) {
        for (const img of images) {
          if (img.dataUrl) {
            folder.file(img.name, dataUrlToUint8(img.dataUrl));
          } else if (img.blobUrl) {
            try {
              const res = await fetch(img.blobUrl);
              const ab = await res.arrayBuffer();
              folder.file(img.name, ab);
            } catch {}
          }
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadZip(blob, `recipe-studio-export-${timestamp.slice(0, 10)}.zip`);
    },
    [collections, images, lookbooks, recipes],
  );

  const createCollection = useCallback(
    (input: {
      name: string;
      season: string;
      year: number;
      version: number;
      description?: string;
      recipeIds?: string[];
    }): RecipeCollection => {
      const now = new Date().toISOString();
      const recipeIds = Array.from(new Set(input.recipeIds ?? []));
      const item: RecipeCollection = {
        id: uid(),
        name: input.name.trim() || "Untitled Collection",
        season: input.season.trim() || "All",
        year: Number.isFinite(input.year)
          ? input.year
          : new Date().getFullYear(),
        version: Number.isFinite(input.version) ? input.version : 1,
        description: input.description?.trim() || undefined,
        recipeIds,
        createdAt: now,
        updatedAt: now,
      };
      setCollections((prev) => [item, ...prev]);
      return item;
    },
    [],
  );

  const updateCollection = useCallback(
    (
      id: string,
      patch: Partial<Omit<RecipeCollection, "id" | "createdAt" | "recipeIds">>,
    ) => {
      setCollections((prev) =>
        prev.map((collection) =>
          collection.id === id
            ? {
                ...collection,
                ...patch,
                name: patch.name?.trim() || collection.name,
                season: patch.season?.trim() || collection.season,
                description:
                  patch.description?.trim() || collection.description,
                updatedAt: new Date().toISOString(),
              }
            : collection,
        ),
      );
    },
    [],
  );

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => prev.filter((collection) => collection.id !== id));
  }, []);

  const addRecipeToCollection = useCallback(
    (collectionId: string, recipeId: string) => {
      setCollections((prev) =>
        prev.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                recipeIds: Array.from(
                  new Set([...(collection.recipeIds || []), recipeId]),
                ),
                updatedAt: new Date().toISOString(),
              }
            : collection,
        ),
      );
    },
    [],
  );

  const removeRecipeFromCollection = useCallback(
    (collectionId: string, recipeId: string) => {
      setCollections((prev) =>
        prev.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                recipeIds: (collection.recipeIds || []).filter(
                  (id) => id !== recipeId,
                ),
                updatedAt: new Date().toISOString(),
              }
            : collection,
        ),
      );
    },
    [],
  );

  const setCollectionRecipes = useCallback(
    (collectionId: string, recipeIds: string[]) => {
      const uniqueIds = Array.from(new Set(recipeIds));
      setCollections((prev) =>
        prev.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                recipeIds: uniqueIds,
                updatedAt: new Date().toISOString(),
              }
            : collection,
        ),
      );
    },
    [],
  );

  const getCollectionById = useCallback(
    (id: string) => collections.find((collection) => collection.id === id),
    [collections],
  );

  const addWorkflowPlan = useCallback((plan: DishWorkflowPlan) => {
    setWorkflows((prev) => {
      const timestamp = Date.now();
      const normalized: DishWorkflowPlan = {
        ...plan,
        id: plan.id || uid(),
        savedAt: plan.savedAt ?? timestamp,
        updatedAt: timestamp,
      };
      const filtered = prev.filter((entry) => entry.id !== normalized.id);
      return [...filtered, normalized].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
    });
  }, []);

  const updateWorkflowPlan = useCallback(
    (id: string, patch: Partial<DishWorkflowPlan>) => {
      setWorkflows((prev) =>
        prev.map((plan) =>
          plan.id === id
            ? {
                ...plan,
                ...patch,
                updatedAt: Date.now(),
              }
            : plan,
        ),
      );
    },
    [],
  );

  const deleteWorkflowPlan = useCallback((id: string) => {
    setWorkflows((prev) => prev.filter((plan) => plan.id !== id));
  }, []);

  const addInspectionReport = useCallback((report: InspectionReport) => {
    setInspections((prev) => {
      const timestamp = report.uploadedAt ?? Date.now();
      const normalized: InspectionReport = {
        ...report,
        id: report.id || uid(),
        uploadedAt: timestamp,
      };
      const filtered = prev.filter((entry) => entry.id !== normalized.id);
      return [...filtered, normalized].sort(
        (a, b) => b.uploadedAt - a.uploadedAt,
      );
    });
  }, []);

  const deleteInspectionReport = useCallback((id: string) => {
    setInspections((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const getWorkflowById = useCallback(
    (id: string) => workflows.find((plan) => plan.id === id),
    [workflows],
  );

  const getInspectionById = useCallback(
    (id: string) => inspections.find((item) => item.id === id),
    [inspections],
  );

  const listStations = useCallback(() => KITCHEN_STATIONS, []);

  const listPrinters = useCallback(() => CHIT_PRINTERS, []);

  const normalizeRecipe = (
    raw: any,
  ): Omit<Recipe, "id" | "createdAt"> | null => {
    if (!raw || typeof raw !== "object") return null;

    // Some sources nest the recipe under keys like { recipe: {...} } or { data: {...attributes} }
    const r = raw.recipe
      ? raw.recipe
      : raw.data && raw.data.attributes
        ? raw.data.attributes
        : raw;

    // Title
    const title = String(r.title ?? r.name ?? r.label ?? r.slug ?? "").trim();
    if (!title) return null;

    const description = r.description ?? r.summary ?? r.subtitle ?? undefined;

    // Ingredients accept several shapes: array of strings, array of objects, newline string
    const extractLines = (val: any): string[] | undefined => {
      if (!val) return undefined;
      if (Array.isArray(val)) {
        if (val.every((x) => typeof x === "string"))
          return (val as string[]).map(String);
        return val
          .map((x: any) =>
            String(x?.text ?? x?.name ?? x?.line ?? x?.value ?? x),
          )
          .filter(Boolean);
      }
      if (typeof val === "string")
        return val
          .split(/\r?\n|\u2028|\u2029/)
          .map((s) => s.trim())
          .filter(Boolean);
      return undefined;
    };

    const ingredients = extractLines(
      r.ingredients ?? r.ingredientLines ?? r.ingredientsText ?? r.ings,
    );
    const instructions = extractLines(
      r.instructions ??
        r.directions ??
        r.steps ??
        r.method ??
        r.instructionsText,
    );

    const tags = Array.isArray(r.tags)
      ? r.tags.map(String)
      : typeof r.tags === "string"
        ? r.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : undefined;

    // Images: support {images:[{secure_url|url|src|publicId}]}, or single 'image'
    const imagesSrc: string[] = Array.isArray(r.images)
      ? r.images
          .map((x: any) =>
            String(
              x?.name ?? x?.fileName ?? x?.secure_url ?? x?.url ?? x?.src ?? x,
            ).trim(),
          )
          .filter(Boolean)
      : r.image
        ? [String(r.image)]
        : [];
    const imageNames = imagesSrc.length
      ? imagesSrc.map((u) => (u.includes("/") ? u.split("/").pop()! : u))
      : undefined;

    const extra: Record<string, unknown> = {};
    for (const k of Object.keys(r)) {
      if (
        [
          "title",
          "name",
          "label",
          "slug",
          "description",
          "summary",
          "subtitle",
          "ingredients",
          "ingredientLines",
          "ingredientsText",
          "ings",
          "instructions",
          "directions",
          "steps",
          "method",
          "instructionsText",
          "tags",
          "images",
          "image",
        ].includes(k)
      )
        continue;
      extra[k] = (r as any)[k];
    }

    return {
      title,
      description,
      ingredients,
      instructions,
      tags,
      imageNames,
      extra,
    };
  };

  const linkImagesToRecipesByFilename = useCallback(() => {
    if (!images.length || !recipes.length) return;
    const imageMap = new Map(images.map((i) => [i.name, i.dataUrl] as const));
    setRecipes((prev) =>
      prev.map((r) => {
        const urls = (r.imageNames ?? [])
          .map((n) => imageMap.get(n))
          .filter(Boolean) as string[];
        return { ...r, imageDataUrls: urls.length ? urls : r.imageDataUrls };
      }),
    );
  }, [images, recipes.length]);

  const addRecipesFromJsonFiles = useCallback(
    async (files: File[]) => {
      const errors: { file: string; error: string }[] = [];
      const collected: Recipe[] = [];
      const titles: string[] = [];

      for (const f of files) {
        if (
          !f.type.includes("json") &&
          !f.name.toLowerCase().endsWith(".json")
        ) {
          errors.push({
            file: f.name,
            error: "Unsupported file type (expect JSON)",
          });
          continue;
        }
        try {
          const text = await f.text();
          const json = JSON.parse(text);
          const arr: any[] = Array.isArray(json) ? json : [json];
          const existingKeys = new Set(
            recipes.map(
              (r) =>
                `${(r.title || "").toLowerCase()}|${String((r.extra as any)?.book || "")}|${String((r.extra as any)?.page || "")}`,
            ),
          );
          for (const item of arr) {
            const norm = normalizeRecipe(item);
            if (norm) {
              const key = `${(norm.title || "").toLowerCase()}|${String((norm.extra as any)?.book || "")}|${String((norm.extra as any)?.page || "")}`;
              if (existingKeys.has(key)) continue;
              existingKeys.add(key);
              collected.push({
                id: uid(),
                createdAt: Date.now(),
                sourceFile: f.name,
                ...norm,
              });
              if (norm.title) titles.push(norm.title);
            }
          }
        } catch (e: any) {
          errors.push({ file: f.name, error: e?.message ?? "Parse error" });
        }
      }

      const { added } = appendRecipes(collected);
      try {
        const chunks = collected.map((r) =>
          [r.title, ...(r.ingredients || []), ...(r.instructions || [])].join(
            "\n",
          ),
        );
        if (chunks.length) learnFromTextChunks("json-import", chunks);
      } catch {}
      if (added.length) {
        setTimeout(linkImagesToRecipesByFilename, 0);
      }

      return { added: added.length, errors, titles };
    },
    [appendRecipes, linkImagesToRecipesByFilename, recipes],
  );

  const learnFromTextChunks = (book: string, chunks: string[]) => {
    try {
      const keepTop = (obj: Record<string, number>, n: number) =>
        Object.fromEntries(
          Object.entries(obj)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n),
        );
      const textAll = chunks.join("\n").toLowerCase();
      const wordsArr = textAll
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
      const words: Record<string, number> = {};
      const bigrams: Record<string, number> = {};
      for (let i = 0; i < wordsArr.length; i++) {
        const w = wordsArr[i];
        if (w.length < 2 || w.length > 24) continue;
        words[w] = (words[w] || 0) + 1;
        if (i < wordsArr.length - 1) {
          const g = `${wordsArr[i]} ${wordsArr[i + 1]}`;
          if (g.length >= 5 && g.length <= 40)
            bigrams[g] = (bigrams[g] || 0) + 1;
        }
      }
      const kbRaw = localStorage.getItem("kb:cook") || "{}";
      const kb = JSON.parse(kbRaw || "{}");
      kb.terms = keepTop(
        {
          ...(kb.terms || {}),
          ...Object.fromEntries(
            Object.entries(words).map(([k, v]) => [
              k,
              v + (kb.terms?.[k] || 0),
            ]),
          ),
        },
        400,
      );
      const mergedBi: Record<string, number> = { ...(kb.bigrams || {}) };
      for (const [k, v] of Object.entries(bigrams)) {
        mergedBi[k] = (mergedBi[k] || 0) + v;
      }
      kb.bigrams = keepTop(mergedBi, 600);
      kb.books = Array.from(new Set([...(kb.books || []), book]));
      localStorage.setItem("kb:cook", JSON.stringify(kb));
    } catch {}
  };

  const convertDocxArrayBufferToHtml = async (
    arrayBuffer: ArrayBuffer,
  ): Promise<string> => {
    const mammoth = await import("mammoth/mammoth.browser");
    const { value } = await mammoth.convertToHtml({ arrayBuffer });
    return value as string;
  };

  const htmlToRecipes = (html: string, source: string): Recipe[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

    const createParagraph = (text: string) => {
      const paragraph = doc.createElement("p");
      paragraph.textContent = text;
      return paragraph;
    };

    const headingPattern = /^H[1-6]$/;
    const containerTags = new Set([
      "DIV",
      "SECTION",
      "ARTICLE",
      "MAIN",
      "HEADER",
      "FOOTER",
      "ASIDE",
    ]);
    const blocks: Element[] = [];

    const walk = (element: Element) => {
      const tag = element.tagName;
      if (
        headingPattern.test(tag) ||
        tag === "P" ||
        tag === "UL" ||
        tag === "OL" ||
        tag === "TABLE" ||
        tag === "DL" ||
        tag === "BLOCKQUOTE"
      ) {
        blocks.push(element);
        return;
      }
      if (containerTags.has(tag)) {
        const children = Array.from(element.children);
        if (!children.length) {
          const text = normalize(element.textContent || "");
          if (text) blocks.push(createParagraph(text));
          return;
        }
        for (const child of children) walk(child);
        return;
      }
      if (tag === "BR" || tag === "HR") {
        blocks.push(element);
        return;
      }
      const text = normalize(element.textContent || "");
      if (!text) return;
      if (
        tag === "SPAN" ||
        tag === "FONT" ||
        tag === "EM" ||
        tag === "STRONG" ||
        tag === "B" ||
        tag === "I"
      ) {
        blocks.push(createParagraph(text));
      } else {
        blocks.push(element);
      }
    };

    Array.from(doc.body.children).forEach(walk);
    if (!blocks.length) {
      blocks.push(...Array.from(doc.body.children));
    }

    const computeUppercaseRatio = (text: string) => {
      const letters = text.replace(/[^A-Za-z]/g, "");
      if (!letters.length) return 0;
      const uppercase = text.replace(/[^A-Z]/g, "");
      return uppercase.length / letters.length;
    };

    const hasSignificantBold = (element: Element) => {
      const total = normalize(element.textContent || "").replace(
        /\s/g,
        "",
      ).length;
      if (!total) return false;
      const boldNodes = Array.from(element.querySelectorAll("strong, b"));
      if (!boldNodes.length) return false;
      const boldLength = boldNodes
        .map(
          (node) => normalize(node.textContent || "").replace(/\s/g, "").length,
        )
        .reduce((acc, len) => acc + len, 0);
      return boldLength >= total * 0.6;
    };

    const titleStopwords = [
      "ingredient",
      "ingredients",
      "instructions",
      "instruction",
      "method",
      "methods",
      "directions",
      "direction",
      "procedure",
      "procedures",
      "component",
      "components",
      "mise en place",
      "mise-en-place",
      "garnish",
      "garnishes",
      "allergens",
      "allergen",
      "menu description",
      "menu descriptions",
      "beverage pairing",
      "beverage pairings",
      "pairing",
      "pairings",
      "notes",
      "chef notes",
      "production notes",
      "prep",
      "prep list",
      "prep time",
      "cook time",
      "total time",
      "bake time",
      "yield",
      "yields",
      "serves",
      "makes",
      "portion",
      "portions",
      "storage",
      "equipment",
      "tools",
      "assembly",
      "service",
      "finish",
      "finishing",
      "allergy",
      "allergies",
    ];

    const isStopwordTitle = (text: string) => {
      const lower = text.toLowerCase();
      return titleStopwords.some((word) => {
        if (word.includes(" ")) return lower.includes(word);
        return lower === word || lower.startsWith(`${word}:`);
      });
    };

    const isLikelyTitleText = (text: string) => {
      const norm = normalize(text);
      if (!norm) return false;
      if (norm.length > 140) return false;
      if (isStopwordTitle(norm)) return false;
      if (/^\d+(?:\.\d+)*$/.test(norm)) return false;
      const words = norm.split(/\s+/);
      if (words.length === 1 && words[0].length <= 2) return false;
      if (words.length > 20) return false;

      const upperCaseWordCount = words.filter((w) => /^[A-Z]/.test(w)).length;
      const lowerCaseWordCount = words.filter((w) => /^[a-z]/.test(w)).length;
      const startsWithArticle = /^(a|an|the|this|that|these|those)\s/i.test(
        norm,
      );

      if (startsWithArticle && lowerCaseWordCount > upperCaseWordCount) {
        return false;
      }

      const uppercaseRatio = computeUppercaseRatio(norm);
      const hasTitleCaseWords =
        words.filter((w) => /^[A-Z][a-z]{2,}/.test(w)).length >=
        Math.min(words.length, 2);
      const hasAllCaps =
        uppercaseRatio >= 0.6 && words.some((w) => w.length > 3);
      if (hasAllCaps) return true;
      if (hasTitleCaseWords && norm.length <= 80) return true;
      if (uppercaseRatio >= 0.45 && norm.length <= 60 && words.length >= 2)
        return true;
      return false;
    };

    type Section = { title: string; elements: Element[] };
    const sections: Section[] = [];
    const baseName = source.replace(/\.[^.]+$/, "");
    let current: Section | null = null;

    const ensureSection = (title: string) => {
      if (current) sections.push(current);
      current = { title, elements: [] };
    };

    const createCarryParagraphs = (lines: string[]) => {
      const text = lines.join(" ").trim();
      if (!text) return [];
      return [createParagraph(text)];
    };

    for (let i = 0; i < blocks.length; i++) {
      const el = blocks[i];
      const tag = el.tagName;
      const text = normalize(el.textContent || "");
      if (!text) continue;

      let detectedTitle: { title: string; carry?: Element[] } | null = null;

      if (/^H[1-4]$/.test(tag)) {
        if (isLikelyTitleText(text)) detectedTitle = { title: text };
      } else if (
        tag === "P" ||
        tag === "BLOCKQUOTE" ||
        tag === "SPAN" ||
        tag === "DIV"
      ) {
        const lines = (el.textContent || "")
          .split(/\r?\n+/)
          .map((line) => normalize(line))
          .filter(Boolean);
        if (lines.length) {
          const candidate = lines[0];
          if (isLikelyTitleText(candidate)) {
            const uppercaseRatio = computeUppercaseRatio(candidate);
            const bold = hasSignificantBold(el);
            const contextHasKeyword = blocks
              .slice(i + 1, i + 4)
              .some((next) => {
                const t = normalize(next.textContent || "").toLowerCase();
                return /ingredient|instruction|direction|method|component|mise en place|yield|menu description|beverage|allergen/.test(
                  t,
                );
              });
            const shouldCreateSection =
              current !== null && current.elements.length > 0;
            if (
              shouldCreateSection &&
              (bold ||
                uppercaseRatio >= 0.5 ||
                (contextHasKeyword &&
                  (uppercaseRatio >= 0.35 ||
                    candidate.split(/\s+/).length >= 2)))
            ) {
              const carry = createCarryParagraphs(lines.slice(1));
              detectedTitle = { title: candidate, carry };
            } else if (
              !current &&
              (bold ||
                uppercaseRatio >= 0.5 ||
                (contextHasKeyword &&
                  (uppercaseRatio >= 0.35 ||
                    candidate.split(/\s+/).length >= 2)))
            ) {
              const carry = createCarryParagraphs(lines.slice(1));
              detectedTitle = { title: candidate, carry };
            }
          }
        }
      }

      if (detectedTitle) {
        ensureSection(detectedTitle.title);
        if (detectedTitle.carry?.length) {
          current?.elements.push(...detectedTitle.carry);
        }
        continue;
      }

      if (!current) ensureSection(baseName || "Untitled");
      current.elements.push(el);
    }

    if (current) sections.push(current);
    if (!sections.length) {
      const fallbackTitle =
        (
          doc.querySelector("h1,h2,h3,h4")?.textContent ||
          baseName ||
          "Untitled"
        ).trim() || "Untitled";
      sections.push({
        title: fallbackTitle,
        elements: Array.from(doc.body.children),
      });
    } else {
      for (const section of sections) {
        const normTitle = normalize(section.title);
        section.title =
          normTitle && !/^untitled$/i.test(normTitle)
            ? normTitle
            : baseName || "Untitled";
      }
    }

    const extractListAfter = (startIdx: number, arr: Element[]) => {
      const out: string[] = [];
      for (let i = startIdx + 1; i < arr.length; i++) {
        const el = arr[i];
        const tag = el.tagName;
        if (["H1", "H2", "H3"].includes(tag)) break;
        const text = (el.textContent || "").trim();
        if (!text) continue;

        if (tag === "UL" || tag === "OL") {
          out.push(
            ...Array.from(el.querySelectorAll("li"))
              .map((li) => (li.textContent || "").trim())
              .filter(Boolean),
          );
        } else if (
          tag === "P" ||
          tag === "DIV" ||
          tag === "SPAN" ||
          tag === "BLOCKQUOTE"
        ) {
          const lines = text
            .split(/\r?\n+/)
            .map((l) => l.trim())
            .filter(Boolean);
          out.push(...lines);
        } else if (tag === "TABLE") {
          const cells = Array.from(
            el.querySelectorAll("td,th"),
          ) as HTMLElement[];
          const cellText = cells
            .map((c) => (c.textContent || "").trim())
            .filter(Boolean);
          out.push(...cellText);
        } else if (tag === "BR" || tag === "HR") {
          continue;
        } else {
          if (text.length > 2) out.push(text);
        }
      }
      return out;
    };

    const results: Recipe[] = [];
    const qtyRe =
      /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛��⅝⅞])(?:\s*[a-zA-Z]+)?\b/;

    for (const sec of sections) {
      const els = sec.elements;
      const texts = els.map((e) => e.textContent || "");
      const lowerTexts = texts.map((t) => t.toLowerCase());
      const findIdx = (label: string[]) =>
        lowerTexts.findIndex((t) => label.some((l) => t.startsWith(l)));
      let ingIdx = findIdx(["ingredients", "ingredient", "what you need"]);
      let instIdx = findIdx([
        "instructions",
        "directions",
        "method",
        "steps",
        "procedure",
        "procedures",
      ]);
      let ingredients = ingIdx >= 0 ? extractListAfter(ingIdx, els) : [];
      let instructions = instIdx >= 0 ? extractListAfter(instIdx, els) : [];

      if (!ingredients.length) {
        ingredients = texts.filter((t) => qtyRe.test(t.trim()));
      }

      if (!instructions.length) {
        const numbered = texts.filter((t) =>
          /^(?:\d+\.|Step\s*\d+|procedure\s*\d+)/i.test(t.trim()),
        );
        if (numbered.length) instructions = numbered;
      }

      if (!ingredients.length && !instructions.length && texts.length > 0) {
        const allTexts = texts.join(" ").toLowerCase();
        const hasIngredientKeywords =
          /ingredient|component|include|contain|require|add|mix|combine|blend|butter|flour|sugar|salt|pepper|egg|milk|water|oil|garlic|onion/.test(
            allTexts,
          );
        const hasInstructionKeywords =
          /instruction|direction|step|procedure|method|process|do|make|prepare|heat|cook|bake|fry|simmer|boil|roast|grill|broil|toast|sear|whisk|fold|mix/.test(
            allTexts,
          );

        if (hasIngredientKeywords || hasInstructionKeywords) {
          let firstInstructionIdx = -1;
          for (let i = 0; i < texts.length; i++) {
            const t = texts[i].toLowerCase().trim();
            if (
              /^instruction|^direction|^step|^procedure|^method|^process/.test(
                t,
              )
            ) {
              firstInstructionIdx = i;
              break;
            }
            if (
              i > 0 &&
              /^(heat|cook|bake|fry|simmer|boil|roast|grill|broil|toast|sear|whisk|fold|blend|mix|stir|pour|add to|combine|arrange|place|serve|sprinkle|drizzle|brush)\b/.test(
                t,
              ) &&
              !qtyRe.test(t)
            ) {
              firstInstructionIdx = i;
              break;
            }
          }

          if (firstInstructionIdx > 0) {
            ingredients = texts
              .slice(0, firstInstructionIdx)
              .filter((t) => t.trim() && t.trim().length > 2);
            instructions = texts
              .slice(firstInstructionIdx)
              .filter((t) => t.trim() && t.trim().length > 2);
          } else if (firstInstructionIdx === 0) {
            instructions = texts.filter((t) => t.trim() && t.trim().length > 2);
          } else {
            const qtyLines = texts.filter((t) => qtyRe.test(t.trim()));
            if (qtyLines.length > 0) {
              const lastQtyIdx = texts.lastIndexOf(
                qtyLines[qtyLines.length - 1],
              );
              ingredients = texts
                .slice(0, lastQtyIdx + 1)
                .filter((t) => t.trim() && t.trim().length > 2);
              instructions = texts
                .slice(lastQtyIdx + 1)
                .filter((t) => t.trim() && t.trim().length > 2);
            }
          }
        }
      }

      if (!ingredients.length && !instructions.length) {
        const qtyCount = texts.filter((t) => qtyRe.test(t.trim())).length;
        const instrCount = texts.filter((t) =>
          /^(?:\d+\.|step|heat|cook|bake)/i.test(t.trim()),
        ).length;

        if (qtyCount > instrCount && qtyCount > 0) {
          ingredients = texts.filter((t) => qtyRe.test(t.trim()));
        } else if (instrCount > 0) {
          instructions = texts.filter((t) =>
            /^(?:\d+\.|step|heat|cook|bake|fry|simmer)/i.test(t.trim()),
          );
        } else if (texts.length > 1) {
          ingredients = [];
          instructions = texts.filter((t) => t.trim().length > 2);
        }
      }

      if (!instructions.length && ingredients.length) {
        const start = Math.max(
          texts.findIndex((t) => qtyRe.test(t.trim())) + 3,
          0,
        );
        instructions = texts
          .slice(start, start + 20)
          .filter((t) => t.trim().length > 2);
      }

      if (instructions.length) {
        const rest: string[] = [];
        for (const line of instructions) {
          const s = String(line).trim();
          if (qtyRe.test(s) && !/^yield\b/i.test(s)) {
            if (!ingredients.includes(line)) ingredients.push(line);
          } else {
            rest.push(line);
          }
        }
        instructions = rest;
      }

      const uniq = (arr: string[]) =>
        Array.from(new Set(arr.map((s) => s.replace(/\s+/g, " ").trim())));
      ingredients = uniq(ingredients).filter((t) => t.length > 0);
      instructions = uniq(instructions).filter((t) => t.length > 0);

      const title = (sec.title || baseName || "Untitled").trim() || "Untitled";
      results.push({
        id: uid(),
        createdAt: Date.now(),
        title,
        ingredients: ingredients.length ? ingredients : undefined,
        instructions: instructions.length ? instructions : undefined,
        sourceFile: source,
      });
    }
    return results;
  };

  const addRecipesFromHtmlFiles = useCallback(
    async (files: File[]) => {
      const errors: { file: string; error: string }[] = [];
      const collected: Recipe[] = [];
      const titles: string[] = [];
      for (const f of files) {
        if (!/\.(html?|htm)$/i.test(f.name)) {
          errors.push({ file: f.name, error: "Unsupported HTML type" });
          continue;
        }
        try {
          const html = await f.text();
          const recs = htmlToRecipes(html, f.name);
          collected.push(...recs);
          titles.push(...recs.map((r) => r.title));
          try {
            const chunks = recs.map((r) =>
              [
                r.title,
                ...(r.ingredients || []),
                ...(r.instructions || []),
              ].join("\n"),
            );
            learnFromTextChunks(f.name.replace(/\.[^.]+$/, ""), chunks);
          } catch {}
        } catch (e: any) {
          errors.push({
            file: f.name,
            error: e?.message ?? "Failed to read HTML",
          });
        }
      }
      const { added } = appendRecipes(collected);
      return { added: added.length, errors, titles };
    },
    [appendRecipes],
  );

  const addRecipesFromDocxFiles = useCallback(
    async (files: File[]) => {
      const errors: { file: string; error: string }[] = [];
      const collected: Recipe[] = [];
      const titles: string[] = [];

      for (const f of files) {
        if (!f.name.toLowerCase().endsWith(".docx")) {
          errors.push({
            file: f.name,
            error: "Unsupported Word format (use .docx)",
          });
          continue;
        }
        try {
          const ab = await f.arrayBuffer();
          const html = await convertDocxArrayBufferToHtml(ab);
          const recs = htmlToRecipes(html, f.name);
          collected.push(...recs);
          titles.push(...recs.map((r) => r.title));
          try {
            const chunks = recs.map((r) =>
              [
                r.title,
                ...(r.ingredients || []),
                ...(r.instructions || []),
              ].join("\n"),
            );
            learnFromTextChunks(f.name.replace(/\.[^.]+$/, ""), chunks);
          } catch {}
        } catch (e: any) {
          errors.push({
            file: f.name,
            error: e?.message ?? "Failed to read .docx",
          });
        }
      }

      const { added } = appendRecipes(collected);
      if (added.length) {
        setTimeout(linkImagesToRecipesByFilename, 0);
      }
      return { added: added.length, errors, titles };
    },
    [appendRecipes, linkImagesToRecipesByFilename],
  );

  /**
   * Vision-based PDF import using GPT-4V
   * Much faster and more accurate than layout parsing
   */
  const addRecipesFromPdfFilesVision = useCallback(
    async (files: File[]) => {
      const errors: { file: string; error: string }[] = [];
      const collected: Recipe[] = [];
      const titles: string[] = [];

      for (const f of files) {
        try {
          console.log(`📸 Extracting recipes from ${f.name} using vision...`);
          const ab = await f.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(ab).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              "",
            ),
          );

          const response = await fetch(
            "/api/echo-training/vision-extract-recipes",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pdfBase64: base64,
                pdfName: f.name,
              }),
            },
          );

          if (!response.ok) {
            const err = await response.json();
            errors.push({
              file: f.name,
              error: err.error || "Failed to extract recipes",
            });
            continue;
          }

          const result = await response.json();
          if (result.recipes && Array.isArray(result.recipes)) {
            for (const recipe of result.recipes) {
              collected.push({
                id: uid(),
                createdAt: Date.now(),
                title: recipe.title || "Untitled Recipe",
                ingredients: recipe.ingredients || [],
                instructions: recipe.instructions || [],
                prepTime: recipe.prepTime,
                cookTime: recipe.cookTime,
                yield: recipe.servings,
                cuisine: recipe.cuisine,
                sourceFile: f.name,
                tags: [f.name.replace(/\.pdf$/i, "")],
              });
              titles.push(recipe.title);
            }
            console.log(
              `✅ Extracted ${result.recipes.length} recipes from ${f.name}`,
            );
          }
        } catch (error: any) {
          errors.push({
            file: f.name,
            error: error.message || "Failed to read PDF",
          });
        }
      }

      const { added } = appendRecipes(collected);
      return { added: added.length, errors, titles };
    },
    [appendRecipes],
  );

  const addRecipesFromPdfFiles = useCallback(
    async (files: File[]) => {
      const errors: { file: string; error: string }[] = [];
      const collected: Recipe[] = [];
      const titles: string[] = [];

      const parseMeta = (text: string) => {
        const meta: Record<string, string> = {};
        const get = (re: RegExp) => (text.match(re)?.[1] || "").trim();
        meta.prepTime = get(/(?:prep|preparation)\s*time\s*:?\s*([^\n]+)/i);
        meta.cookTime = get(/cook\s*time\s*:?\s*([^\n]+)/i);
        meta.totalTime = get(/total\s*time\s*:?\s*([^\n]+)/i);
        meta.temperature =
          get(/(?:temp|temperature)\s*:?\s*([^\n]+)/i) ||
          text.match(/(\d{2,3})\s*°?\s*([FC])/i)?.[0] ||
          "";
        meta.yield = get(/(?:yield|makes|serves)\s*:?\s*([^\n]+)/i);
        return meta;
      };

      const learnFromPages = (book: string, pages: string[]) => {
        try {
          const text = pages.join("\n").toLowerCase();
          const knownTerms = [
            "mise en place",
            "bain marie",
            "roux",
            "ganache",
            "emulsion",
            "caramelize",
            "temper chocolate",
            "fold",
            "simmer",
            "whisk",
            "sear",
            "poach",
            "blanch",
            "reduce",
            "deglaze",
            "knead",
            "proof",
            "laminate",
            "macaronage",
            "pate a choux",
            "sabayon",
            "custard",
            "meringue",
            "pate sucree",
            "pate brisee",
            "ganache",
            "frangipane",
            "creme anglaise",
            "streusel",
            "simple syrup",
            "brioche",
          ];
          const word = text
            .replace(/[^a-z\s]/g, " ")
            .split(/\s+/)
            .filter(Boolean);
          const bigrams: Record<string, number> = {};
          for (let i = 0; i < word.length - 1; i++) {
            const g = `${word[i]} ${word[i + 1]}`;
            if (g.length < 5 || g.length > 40) continue;
            bigrams[g] = (bigrams[g] || 0) + 1;
          }
          const counts: Record<string, number> = {};
          for (const t of knownTerms) {
            const re = new RegExp(`\\b${t.replace(/\s+/g, "\\s+")}\\b`, "gi");
            const m = text.match(re);
            if (m) counts[t] = (counts[t] || 0) + m.length;
          }
          const keepTop = (obj: Record<string, number>, n: number) =>
            Object.fromEntries(
              Object.entries(obj)
                .sort((a, b) => b[1] - a[1])
                .slice(0, n),
            );
          const kbRaw = localStorage.getItem("kb:cook") || "{}";
          const kb = JSON.parse(kbRaw);
          kb.terms = {
            ...(kb.terms || {}),
            ...Object.fromEntries(
              Object.entries(counts).map(([k, v]) => [
                k,
                v + (kb.terms?.[k] || 0),
              ]),
            ),
          };
          kb.bigrams = { ...(kb.bigrams || {}) };
          for (const [k, v] of Object.entries(keepTop(bigrams, 400))) {
            kb.bigrams[k] = (kb.bigrams[k] || 0) + v;
          }
          kb.books = Array.from(new Set([...(kb.books || []), book]));
          // Trim to keep storage bounded
          kb.terms = keepTop(kb.terms, 400);
          kb.bigrams = keepTop(kb.bigrams, 600);
          localStorage.setItem("kb:cook", JSON.stringify(kb));
        } catch {}
      };

      const mergeHyphenatedLines = (lines: string[]) => {
        const merged: string[] = [];
        for (let i = 0; i < lines.length; i++) {
          const current = lines[i];
          if (
            /[A-Za-z]-$/.test(current) &&
            i + 1 < lines.length &&
            /^[a-z]/.test(lines[i + 1])
          ) {
            merged.push(
              current.replace(/-$/, "") + lines[i + 1].replace(/^\s+/, ""),
            );
            i++;
            continue;
          }
          merged.push(current);
        }
        return merged;
      };

      const extractPageText = async (page: any) => {
        const textContent = await page.getTextContent({
          disableCombineTextItems: true,
        });
        const items = (textContent.items || []) as any[];
        if (!items.length)
          return { text: "", lines: [] as string[], charCount: 0 };
        type Row = {
          y: number;
          items: {
            x: number;
            xEnd: number;
            width: number;
            height: number;
            str: string;
          }[];
        };
        const rowMap = new Map<number, Row>();
        const yTolerance = 3;
        for (const raw of items) {
          const str = typeof raw.str === "string" ? raw.str : "";
          if (!str.trim()) continue;
          const transform = Array.isArray(raw.transform)
            ? raw.transform
            : [0, 0, 0, 0, raw.x || 0, raw.y || 0];
          const x = typeof transform[4] === "number" ? transform[4] : 0;
          const y = typeof transform[5] === "number" ? transform[5] : 0;
          const widthCandidate =
            typeof raw.width === "number"
              ? raw.width
              : typeof transform[0] === "number"
                ? Math.abs(transform[0])
                : str.length * 4;
          const heightCandidate =
            typeof raw.height === "number"
              ? raw.height
              : typeof transform[3] === "number"
                ? Math.abs(transform[3])
                : 0;
          const key = Math.round(y / yTolerance) * yTolerance;
          let row = rowMap.get(key);
          if (!row) {
            row = { y, items: [] };
            rowMap.set(key, row);
          }
          row.items.push({
            x,
            xEnd: x + widthCandidate,
            width: widthCandidate,
            height: heightCandidate,
            str,
          });
        }
        const rows = Array.from(rowMap.values()).sort((a, b) => b.y - a.y);
        const structured: { text: string; x: number; y: number }[] = [];
        const newColumnGap = 48;
        const wordGap = 4;
        for (const row of rows) {
          const sortedItems = row.items.sort((a, b) => a.x - b.x);
          let buffer = "";
          let bufferStart = sortedItems[0]?.x ?? 0;
          let bufferEnd = sortedItems[0]?.xEnd ?? bufferStart;
          const segments: { text: string; x: number; y: number }[] = [];
          for (let i = 0; i < sortedItems.length; i++) {
            const current = sortedItems[i];
            const text = current.str.replace(/\s+/g, " ").trim();
            if (!text) continue;
            if (!buffer) {
              buffer = text;
              bufferStart = current.x;
              bufferEnd = current.xEnd;
              continue;
            }
            const gap = current.x - bufferEnd;
            if (gap > newColumnGap) {
              if (buffer.trim()) {
                segments.push({
                  text: buffer.trim(),
                  x: bufferStart,
                  y: row.y,
                });
              }
              buffer = text;
              bufferStart = current.x;
              bufferEnd = current.xEnd;
              continue;
            }
            if (gap > wordGap && !buffer.endsWith(" ")) buffer += " ";
            buffer += text;
            bufferEnd = Math.max(bufferEnd, current.xEnd);
          }
          if (buffer.trim()) {
            segments.push({ text: buffer.trim(), x: bufferStart, y: row.y });
          }
          for (const segment of segments) {
            structured.push(segment);
          }
        }
        // Detect if this is a multi-column layout
        const xPositions = structured.map((s) => Math.round(s.x / 50) * 50);
        const uniqueXPositions = Array.from(new Set(xPositions)).sort(
          (a, b) => a - b,
        );
        const isMultiColumn =
          uniqueXPositions.length >= 2 &&
          uniqueXPositions[1] - uniqueXPositions[0] > 100;

        let filtered = structured;
        if (isMultiColumn && uniqueXPositions.length >= 2) {
          // For multi-column layouts, prefer the rightmost column (typically contains the recipe)
          const rightmostX = uniqueXPositions[uniqueXPositions.length - 1];
          const columnThreshold = rightmostX - 100;
          filtered = structured.filter((s) => s.x >= columnThreshold);
        }

        filtered.sort((a, b) => {
          if (Math.abs(a.y - b.y) <= 4) {
            return a.x - b.x;
          }
          return b.y - a.y;
        });
        const rawLines = filtered
          .map((entry) => entry.text.replace(/\s+/g, " ").trim())
          .filter(Boolean);
        const lines = mergeHyphenatedLines(rawLines);
        const text = lines.join("\n");
        const charCount = lines.reduce((acc, line) => acc + line.length, 0);
        return { text, lines, charCount };
      };

      const normLine = (s: string) => {
        let t = s.replace(/\s+/g, " ").trim();
        if (/^([A-Z]\s+){2,}[A-Z][\s:]*$/.test(t) && t.length <= 60)
          t = t.replace(/\s+/g, "");
        return t;
      };

      type DerivedRecipeSections = {
        title: string;
        ingredients?: string[];
        instructions?: string[];
        meta: Record<string, string>;
      };

      const deriveStructuredRecipe = (
        text: string,
      ): DerivedRecipeSections | null => {
        const rawLines = text
          .split(/\n/)
          .map((line) => line.replace(/\s+/g, " ").trim())
          .filter((line) => line.length);
        if (!rawLines.length) return null;

        type LinePair = { original: string; normalized: string };

        let pairs = rawLines
          .map((line) => {
            const normalized = normLine(line);
            if (!normalized.length) return null;
            return { original: line, normalized };
          })
          .filter((value): value is LinePair => value !== null);
        if (!pairs.length) return null;

        let fallbackTitle: string | undefined;
        const tocStopWords = /^(?:contents|index|appendix|chapter|recipes?)$/i;
        const measurementTokens =
          /\b(?:cup|cups?|tsp|teaspoons?|tbsp|tablespoons?|grams?|gram|kg|kilograms?|g|ml|milliliters?|l|liters?|oz|ounces?|lb|lbs|pounds?|serves?|makes|yield|minutes?|minute|mins?|hours?|hour|°f|°c|step|steps?)\b/i;
        const tocPatterns = [
          /^.{3,160}?[.\s·•]{2,}\d{1,4}(?:\D.*)?$/i,
          /^.{3,160}?\s[-������]\s*\d{1,4}(?:\D.*)?$/i,
        ];
        const looksLikeIndexEntry = (line: string) => {
          if (line.length > 160) return false;
          if (tocPatterns.some((re) => re.test(line))) return true;
          const tokens = line.split(/\s+/);
          if (tokens.length < 3) return false;
          const last = tokens[tokens.length - 1];
          if (!/^\d{1,4}$/.test(last)) return false;
          const before = tokens.slice(0, -1).join(" ").trim();
          if (before.length < 4) return false;
          if (measurementTokens.test(before)) return false;
          if (/\b(?:page|pg|step)\b/i.test(before)) return false;
          return true;
        };

        while (pairs.length) {
          const { original, normalized } = pairs[0];
          const lower = normalized.toLowerCase();
          if (tocStopWords.test(lower) || /\bcandidate\b/i.test(original)) {
            pairs.shift();
            continue;
          }
          if (looksLikeIndexEntry(original)) {
            if (!fallbackTitle) {
              fallbackTitle = original
                .replace(/\s*\d{1,4}\s*$/, "")
                .replace(/[.\·•\s]+$/, "")
                .trim();
            }
            pairs.shift();
            continue;
          }
          break;
        }

        pairs = pairs.filter((pair) => !/\bcandidate\b/i.test(pair.original));
        if (!pairs.length) return null;

        let lines = pairs.map((pair) => pair.normalized);
        if (!lines.length) return null;
        const ingredientLabels = [
          "ingredients",
          "ingredient list",
          "mise en place",
          "components",
          "you will need",
          "shopping list",
          "for the dough",
          "for the filling",
          "for the topping",
          "for the sauce",
          "for the batter",
          "for the crust",
        ];
        const instructionLabels = [
          "instructions",
          "directions",
          "method",
          "preparation",
          "procedure",
          "assembly",
          "to assemble",
          "to prepare",
          "cooking directions",
          "cooking instructions",
          "finishing",
          "finishing steps",
          "to finish",
          "mixing",
          "makeup",
          "baking",
          "heating",
          "chilling",
          "folding",
          "cooling",
        ];
        const matchLabel = (line: string, labels: string[]) =>
          labels.some(
            (label) => line === label || line.startsWith(`${label} `),
          );
        const qtyRegex =
          /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[��½¾���⅔⅛⅜⅝⅞])(?:\s*(?:cups?|cup|tsp|teaspoons?|tbsp|tablespoons?|grams?|gram|kg|kilograms?|g|ml|milliliters?|l|liters?|oz|ounces?|lb|lbs|pounds?|pinch|dash|cloves?|cans?|sticks?|slices?|heads?|bunch(?:es)?|sprigs?))?\b/;
        const metaSuppress =
          /^\s*(?:yield|serves|makes|prep(?:aration)?|cook|total)\b/i;

        let lower = lines.map((line) => line.toLowerCase());
        let cleaned = lower.map((line) => line.replace(/[:.\s]+$/, ""));

        let coreIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          if (
            matchLabel(cleaned[i], ingredientLabels) ||
            /^for the [a-z]/.test(cleaned[i]) ||
            qtyRegex.test(lines[i]) ||
            /^[:•\-*\u2022\u2023\u2043]\s*/.test(pairs[i].original) ||
            matchLabel(cleaned[i], instructionLabels)
          ) {
            coreIdx = i;
            break;
          }
        }
        if (coreIdx > 4) {
          const sliceStart = Math.max(0, coreIdx - 4);
          pairs = pairs.slice(sliceStart);
          lines = pairs.map((pair) => pair.normalized);
          if (!lines.length) return null;
          lower = lines.map((line) => line.toLowerCase());
          cleaned = lower.map((line) => line.replace(/[:.\s]+$/, ""));
        }

        let ingIdx = -1;
        const tableHeaderPattern = /^(?:ingredients|u\.?s\.?|metric|%|\s*)+$/i;

        for (let i = 0; i < cleaned.length; i++) {
          const line = cleaned[i];
          if (
            matchLabel(line, ingredientLabels) ||
            /^for the [a-z]/.test(line)
          ) {
            ingIdx = i;
            // Skip if it's just a table header row
            if (i + 1 < cleaned.length && tableHeaderPattern.test(line)) {
              ingIdx = i + 1;
            }
            break;
          }
        }
        if (ingIdx < 0) {
          for (let i = 0; i < Math.min(lines.length, 120); i++) {
            const window = lines.slice(i, i + 6);
            const matches = window.filter(
              (entry) =>
                qtyRegex.test(entry) ||
                /^[:•\-*\u2022\u2023\u2043]\s*/.test(entry),
            );
            if (matches.length >= 3) {
              // Make sure we're not starting at a table header
              const startIdx = Math.max(0, i - 1);
              if (!tableHeaderPattern.test(cleaned[startIdx] || "")) {
                ingIdx = startIdx;
              } else {
                ingIdx = i;
              }
              break;
            }
          }
        }

        let instIdx = -1;
        const variationStartPattern = /^(?:variations?|variation|substitutions?|chocolate|brown sugar|lemon|optional)\b/i;

        for (let i = Math.max(ingIdx + 1, 0); i < cleaned.length; i++) {
          const line = cleaned[i];
          // Skip variations section
          if (variationStartPattern.test(line)) {
            break;
          }
          if (
            matchLabel(line, instructionLabels) ||
            /^to (?:assemble|finish|serve|prepare|cook|bake)\b/.test(line)
          ) {
            instIdx = i;
            break;
          }
        }
        if (instIdx < 0 && ingIdx >= 0) {
          for (let i = ingIdx + 1; i < lines.length; i++) {
            const line = lines[i];
            // Skip variations
            if (variationStartPattern.test(line)) break;
            if (
              /^(?:step\s*)?\d+\b/.test(line) ||
              /^\d+\.\s+/.test(line) ||
              /^•\s+/.test(line) ||
              // Check for procedure-style sections like "MIXING:" or "BAKING:"
              /^(?:mixing|makeup|baking|chilling|cooling|heating|folding)[\s:]/i.test(line) ||
              (line.length > 30 && /[\.?!]/.test(line))
            ) {
              instIdx = i;
              break;
            }
          }
        }

        const stripBullet = (line: string) => {
          let result = line.replace(/^[:•\-*\u2022\u2023\u2043]\s*/, "").trim();
          // For table-based recipes, try to extract just the ingredient name
          // Pattern: "ingredient_name" followed by measurements and percentages
          // Examples: "Butter and/or shortening 8 oz 250 g 40"
          //           "Sugar 10 oz 310 g 50"
          //           "Salt 0.16 oz (3/4 tsp) 5 g 0.8"

          // Check if line appears to have measurement data (numbers followed by units)
          if (/\d\s*(?:oz|g|cup|tsp|tbsp|lb|kg|ml|l|grams?|gram|ounces?|pound|lbs?|teaspoon|tablespoon)\b/i.test(result)) {
            // Try to extract ingredient name by removing measurement info
            // This pattern matches numbers with optional fractions followed by units
            const cleaned = result
              .replace(/\s+\d+(?:\s+\d+\/\d+|\.\d+)?(?:\s*(?:oz|g|cup|tsp|tbsp|lb|kg|ml|l|grams?|gram|ounces?|pound|lbs?|teaspoon|tablespoon))?(?:\s+\(\s*\d+\/\d+\s*[a-z]+\s*\))?/gi, "") // Remove US measurements with optional fractions
              .replace(/\s+\d+(?:\.\d+)?\s*g\b/gi, "") // Remove metric grams
              .replace(/\s+\d+(?:\.\d+)?\s*%\s*$/i, "") // Remove trailing percentage
              .replace(/\s+/g, " ") // Normalize spaces
              .trim();
            if (cleaned.length > 2) {
              result = cleaned;
            }
          }
          return result;
        };
        const getRange = (start: number, end: number) =>
          lines
            .slice(start + 1, end > start ? end : undefined)
            .map(stripBullet)
            .filter((entry) => entry.length && !metaSuppress.test(entry));

        let ingredients =
          ingIdx >= 0
            ? getRange(ingIdx, instIdx >= 0 ? instIdx : lines.length)
            : undefined;

        // Filter out table headers, metadata, and non-ingredient lines
        if (ingredients && ingredients.length) {
          const tableHeaderPatterns = [
            /^(?:ingredients|u\.?s\.?|metric|%|\s*)?$/i, // Empty or just units
            /^(?:ingredients|u\.?s\.?[\s\(]|metric[\s\(]|%[\s\(])/i, // Header row
            /^(?:total weight:?|total weight)/i, // Totals line
          ];
          const isTableHeader = (line: string) =>
            tableHeaderPatterns.some(pattern => pattern.test(line.trim()));

          // Merge multi-line ingredients (table-based recipes often split ingredients across lines)
          const mergedIngredients: string[] = [];
          let currentLine = "";

          for (const line of ingredients) {
            const trimmed = line.trim();

            // Skip empty lines and headers
            if (!trimmed || isTableHeader(trimmed)) {
              if (currentLine) {
                mergedIngredients.push(currentLine);
                currentLine = "";
              }
              continue;
            }

            // Check if this line is a pure measurement component (isolated number, unit, or percentage)
            const isPureMeasurement = /^(?:\d+(?:\.\d+)?|oz|g|lb|kg|cup|tsp|tbsp|ml|l|%|grams?|ounces?|pounds?|teaspoons?|tablespoons?)$/i.test(trimmed);

            // Check if line has parenthetical info like "(1/2 tsp)" or has measurements
            const hasParentheses = /^\(.*\)$/.test(trimmed);

            // Check if this line is clearly a new ingredient (starts with capital letter, not a number/unit)
            const isNewIngredient = /^[A-Z][a-z]/.test(trimmed) && !isPureMeasurement && !hasParentheses;

            // Lines that belong with the current ingredient (continuations or measurements)
            const isPartOfCurrent = currentLine && (
              isPureMeasurement ||
              hasParentheses ||
              (!isNewIngredient && !/^[•\-*0-9\(]/.test(trimmed) && !/(p\.?\s*\d+|pp\.?\s*\d+)/.test(trimmed))
            );

            if (isPartOfCurrent) {
              // Merge with current line (add measurement or description)
              currentLine += " " + trimmed;
            } else if (isNewIngredient || (/^[A-Z]/.test(trimmed) && currentLine && !/\d\s*(?:oz|g|cup|tsp|tbsp|lb)/.test(currentLine))) {
              // New ingredient detected
              if (currentLine) {
                mergedIngredients.push(currentLine);
              }
              currentLine = trimmed;
            } else if (!currentLine) {
              // First item
              currentLine = trimmed;
            } else {
              // Default: treat as continuation if we have a current line
              currentLine += " " + trimmed;
            }
          }

          if (currentLine) {
            mergedIngredients.push(currentLine);
          }

          // Filter and clean
          ingredients = mergedIngredients
            .filter((line) => {
              const trimmed = line.trim();
              if (!trimmed || isTableHeader(trimmed)) return false;
              if (metaSuppress.test(trimmed)) return false;
              // Exclude lines that are clearly just units or percentages
              if (/^(?:oz|g|%|\(\d+\)|lb|tsp|tbsp|gram|ounce|pound|milliliter|liter|cup)$/.test(trimmed.toLowerCase())) return false;
              // Keep lines that have actual ingredient content (at least 3 chars)
              if (trimmed.length >= 3) return true;
              return false;
            });

          // If we have very few ingredients, try to recover by looking for lines with quantities
          if (ingredients.length < 2) {
            const candidates = getRange(ingIdx, instIdx >= 0 ? instIdx : lines.length)
              .filter((line) => {
                const trimmed = line.trim();
                return qtyRegex.test(trimmed) &&
                       !isTableHeader(trimmed) &&
                       trimmed.length >= 3;
              });
            if (candidates.length >= 2) ingredients = candidates;
          }
        }

        let instructions =
          instIdx >= 0 ? getRange(instIdx, lines.length) : undefined;

        // Filter out variations and other non-instruction content
        if (instructions && instructions.length) {
          const variationPatterns = [
            /^(?:variations?|variation|substitutions?|chocolate|brown sugar|lemon|optional)\b/i,
            /^(?:for the|make the following|increase|omit|substitute)\b/i,
          ];

          const procedureHeaderPatterns = [
            /^(?:mixing|makeup|baking|heating|chilling|cooling|folding)\s*:?\s*$/i,
          ];

          // Find where variations start
          let variationStart = instructions.length;
          for (let i = 0; i < instructions.length; i++) {
            if (variationPatterns.some(p => p.test(instructions[i]))) {
              variationStart = i;
              break;
            }
          }

          // Keep only instructions before variations
          if (variationStart > 0) {
            instructions = instructions.slice(0, variationStart);
          }

          // Remove empty lines, metadata, and procedure headers
          instructions = instructions
            .map(stripBullet)
            .filter((entry) => {
              if (!entry.length) return false;
              if (metaSuppress.test(entry)) return false;
              // Skip procedure section headers (they're usually just labels)
              if (procedureHeaderPatterns.some(p => p.test(entry))) return false;
              // Don't include lines that are just ingredient names or units
              if (qtyRegex.test(entry) && entry.length < 20) return false;
              return true;
            });
        }

        if ((!instructions || instructions.length < 2) && lines.length) {
          const start = instIdx >= 0 ? instIdx + 1 : Math.max(ingIdx + 1, 0);
          const fallback = lines
            .slice(start)
            .map(stripBullet)
            .filter(
              (entry) =>
                entry.length &&
                !qtyRegex.test(entry) &&
                !metaSuppress.test(entry),
            );
          if (fallback.length >= 2) instructions = fallback;
        }

        const headingLimit = ingIdx >= 0 ? ingIdx : Math.min(lines.length, 6);
        const headingCandidates = lines.slice(0, Math.max(headingLimit, 1));
        let title = "";
        for (const candidate of headingCandidates) {
          if (metaSuppress.test(candidate) || candidate.length < 3) continue;
          if (
            /^[A-Z][A-Za-z0-9\-\'\s]{2,80}$/.test(candidate) ||
            /^[A-Za-z][A-Za-z0-9\-\'\s]{2,80}$/.test(candidate)
          ) {
            title = candidate.replace(/[:\-\s]+$/, "").trim();
            break;
          }
        }
        if (!title && fallbackTitle) title = fallbackTitle;
        if (!title && lines.length) title = lines[0];
        title = title.replace(/\s+/g, " ").trim();

        const meta = parseMeta(lines.join("\n"));
        return {
          title,
          ingredients:
            ingredients && ingredients.length ? ingredients : undefined,
          instructions:
            instructions && instructions.length ? instructions : undefined,
          meta,
        };
      };

      for (const f of files) {
        if (!f.name.toLowerCase().endsWith("pdf")) {
          errors.push({ file: f.name, error: "Unsupported PDF type" });
          continue;
        }
        try {
          const ab = await f.arrayBuffer();
          const pdfjs: any = await import(
            "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.mjs"
          );
          const workerSrc =
            "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.worker.mjs";
          if (pdfjs.GlobalWorkerOptions)
            pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
          const doc = await pdfjs.getDocument({ data: ab }).promise;
          const pageTexts: string[] = [];
          const ocrEnabled = (() => {
            try {
              return localStorage.getItem("pdf:ocr") === "1";
            } catch {
              return false;
            }
          })();
          let ocrBudget = Math.min(
            48,
            Math.max(24, Math.ceil(doc.numPages * 0.25)),
          );
          let tesseractModule: any | null = null;
          const getTesseract = async () => {
            if (!tesseractModule) {
              tesseractModule = await import(
                "https://esm.sh/tesseract.js@5.1.1"
              );
            }
            return tesseractModule;
          };
          for (let p = 1; p <= doc.numPages; p++) {
            const page = await doc.getPage(p);
            const extracted = await extractPageText(page);
            let t = extracted.text;
            let charCount = extracted.charCount;
            const lineCount = extracted.lines.length;
            let wordCount = t.split(/\s+/).filter(Boolean).length;
            const avgLineLength = lineCount ? charCount / lineCount : charCount;
            const allowOcr = ocrEnabled || charCount === 0;
            const shouldAttemptOcr =
              allowOcr &&
              ocrBudget > 0 &&
              (charCount < 60 ||
                wordCount < 12 ||
                lineCount <= 3 ||
                avgLineLength < 6);
            if (shouldAttemptOcr) {
              try {
                const viewport = page.getViewport({ scale: 1.6 });
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  await page.render({ canvasContext: ctx, viewport }).promise;
                  const dataUrl = canvas.toDataURL("image/png");
                  const Tesseract: any = await getTesseract();
                  const { data } = await Tesseract.recognize(
                    await (await fetch(dataUrl)).arrayBuffer(),
                    "eng",
                  );
                  const raw = String(data?.text || "").trim();
                  if (raw) {
                    const cleaned = raw
                      .split(/\n/)
                      .map((line) => line.replace(/\s+/g, " ").trim())
                      .filter(Boolean)
                      .join("\n");
                    const ocrWordCount = cleaned
                      .split(/\s+/)
                      .filter(Boolean).length;
                    if (ocrWordCount > wordCount) {
                      t = cleaned;
                      wordCount = ocrWordCount;
                      charCount = cleaned.length;
                    }
                  }
                }
              } catch {}
              ocrBudget = Math.max(0, ocrBudget - 1);
            }
            pageTexts.push(t);
          }
          const allLines = pageTexts
            .join("\n")
            .split(/\r?\n/)
            .map(normLine)
            .filter(Boolean);
          // Learn from entire book regardless of what gets imported
          learnFromPages(f.name.replace(/\.pdf$/i, ""), pageTexts);

          // Parse appendix/TOC entries with flexible patterns
          let indexEntries = allLines
            .map((s) => {
              const tests = [
                /^(.{3,120}?)(?:[\.·•\s]{2,})(\d{1,4})(?:.*?\(\s*photo\s*(\d{1,4})\s*\))?$/i,
                /^(.{3,120}?)\s{3,}(\d{1,4})(?:.*?\(\s*photo\s*(\d{1,4})\s*\))?$/i,
                /^(.{3,120}?)\s+[-–—]\s*(\d{1,4})(?:.*?\(\s*photo\s*(\d{1,4})\s*\))?$/i,
              ];
              let m: RegExpMatchArray | null = null;
              let photo: number | undefined;
              for (const re of tests) {
                const mm = s.match(re);
                if (mm) {
                  m = mm;
                  photo = mm[3] ? parseInt(mm[3], 10) : undefined;
                  break;
                }
              }
              if (!m) return null;
              const title = m[1].trim();
              const page = parseInt(m[2], 10);
              const bad =
                /^(?:contents|index|appendix|recipes?|chapter|table of contents|fig(?:\.|ures?)?(?:\s*\d+)?|plates?(?:\s*\d+)?|illustrations?(?:\s*\d+)?|photos?(?:\s*\d+)?|tables?(?:\s*\d+)?|maps?(?:\s*\d+)?|yield\b|to convert\b)/i;
              if (!title || bad.test(title)) return null;
              return { title, page, photoPage: photo };
            })
            .filter(Boolean) as {
            title: string;
            page: number;
            photoPage?: number;
          }[];
          // de-duplicate by page number
          const seenPages: Record<number, boolean> = {};
          indexEntries = indexEntries.filter(
            (e) => !seenPages[e.page] && (seenPages[e.page] = true),
          );

          // Honor 'import all' flag to skip TOC
          let importAll = false;
          try {
            importAll = localStorage.getItem("pdf:index:autoAll") === "1";
          } catch {}
          if (importAll) {
            try {
              localStorage.removeItem("pdf:index:autoAll");
            } catch {}
            indexEntries = [];
          }

          // Heuristic: treat as appendix if we have many entries
          const bookTag = f.name.replace(/\.pdf$/i, "");
          let importedFromIndex = 0;
          if (indexEntries.length >= 20) {
            // Optional selection filter from UI
            let allow: Set<string> | null = null;
            try {
              const raw = localStorage.getItem("pdf:index:allow");
              if (raw) allow = new Set(JSON.parse(raw));
            } catch {}
            if (allow)
              indexEntries = indexEntries.filter((e) => allow!.has(e.title));
            indexEntries = indexEntries.sort((a, b) => a.page - b.page);
            for (let i = 0; i < indexEntries.length; i++) {
              const cur = indexEntries[i];
              const next = indexEntries[i + 1];
              const start = Math.min(Math.max(cur.page, 1), doc.numPages);
              const end = Math.min(
                next ? next.page - 1 : doc.numPages,
                doc.numPages,
              );
              const textRaw = pageTexts.slice(start - 1, end).join("\n");
              const text = textRaw.split(/\n/).map(normLine).join("\n");
              const structured = deriveStructuredRecipe(text);
              if (!structured) continue;
              const {
                title: derivedTitle,
                ingredients,
                instructions,
                meta,
              } = structured;
              const ingredientCount = ingredients?.length ?? 0;
              const instructionCount = instructions?.length ?? 0;
              if (ingredientCount < 2 && instructionCount < 3) continue;

              let finalTitle = derivedTitle || cur.title;
              if (!finalTitle || finalTitle.length < 3) finalTitle = cur.title;

              let imgData: string | undefined;
              const pageToRender =
                cur.photoPage &&
                cur.photoPage >= 1 &&
                cur.photoPage <= doc.numPages
                  ? cur.photoPage
                  : start;
              try {
                const page = await doc.getPage(pageToRender);
                const viewport = page.getViewport({ scale: 1.2 });
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  await page.render({ canvasContext: ctx, viewport }).promise;
                  imgData = canvas.toDataURL("image/jpeg", 0.85);
                }
              } catch {}

              collected.push({
                id: uid(),
                createdAt: Date.now(),
                title: finalTitle || cur.title,
                ingredients,
                instructions,
                tags: [bookTag],
                imageDataUrls: imgData ? [imgData] : undefined,
                sourceFile: f.name,
                extra: {
                  page: start,
                  endPage: end,
                  ...meta,
                  source: "pdf-appendix",
                },
              });
              titles.push(finalTitle || cur.title);
              importedFromIndex++;
            }
            try {
              localStorage.removeItem("pdf:index:allow");
            } catch {}
            if (importedFromIndex > 0) {
              continue;
            }
          }

          // Fallback: try marker-based multi-recipe detection across pages
          const isLikelyIngredientList = (txt: string) => {
            const lines = txt
              .split(/\n/)
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 80);
            // Check if there's an explicit ingredients label
            if (/\bingredients?\b/i.test(txt.slice(0, 200))) {
              return true;
            }
            const qtyRe =
              /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[a-zA-Z]+)?\b/;
            let cnt = 0;
            for (const L of lines) {
              if (qtyRe.test(L) || /^[•\-*]\s+/.test(L)) cnt++;
            }
            return cnt >= 3;
          };
          const instWord =
            /(instructions|directions|method|steps|preparation|procedure|mixing|makeup|baking|heating|chilling)\b/i;
          const markerStarts: number[] = [];
          // Forward scan
          for (let p = 1; p <= doc.numPages; p++) {
            const here = pageTexts[p - 1] || "";
            const next1 = pageTexts[p] || "";
            const next2 = pageTexts[p + 1] || "";
            const hasIng =
              /\bingredients?\b/i.test(here) || isLikelyIngredientList(here);
            const hasInstNearby =
              instWord.test([here, next1, next2].join("\n")) ||
              /^(?:\d+\.|Step\s*\d+)/im.test([here, next1].join("\n"));
            if (hasIng && hasInstNearby) {
              if (
                markerStarts.length === 0 ||
                p - markerStarts[markerStarts.length - 1] > 1
              )
                markerStarts.push(p);
            }
          }
          // If none, try reverse scan from back of book
          if (markerStarts.length === 0) {
            const rev: number[] = [];
            for (let p = doc.numPages; p >= 1; p--) {
              const here = pageTexts[p - 1] || "";
              const prev1 = pageTexts[p - 2] || "";
              const hasIng =
                /\bingredients?\b/i.test(here) || isLikelyIngredientList(here);
              const hasInstNearby =
                instWord.test([here, prev1].join("\n")) ||
                /^(?:\d+\.|Step\s*\d+)/im.test([here, prev1].join("\n"));
              if (hasIng && hasInstNearby) {
                if (rev.length === 0 || rev[rev.length - 1] - p > 1)
                  rev.push(p);
              }
            }
            rev.reverse();
            markerStarts.push(...rev);
          }
          if (markerStarts.length >= 1) {
            for (let i = 0; i < markerStarts.length; i++) {
              const start = markerStarts[i];
              const end =
                i + 1 < markerStarts.length
                  ? markerStarts[i + 1] - 1
                  : doc.numPages;
              const textRaw = pageTexts.slice(start - 1, end).join("\n");
              const text = textRaw.split(/\n/).map(normLine).join("\n");
              const structured = deriveStructuredRecipe(text);
              if (!structured) continue;
              const {
                title: derivedTitle,
                ingredients,
                instructions,
                meta,
              } = structured;
              const ingredientCount = ingredients?.length ?? 0;
              const instructionCount = instructions?.length ?? 0;
              if (ingredientCount < 2 && instructionCount < 3) continue;

              let title = derivedTitle;
              if (!title || title.length < 3) {
                title = `${bookTag} p.${start}`;
              }

              let imgData: string | undefined;
              try {
                const page = await doc.getPage(start);
                const viewport = page.getViewport({ scale: 1.1 });
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  await page.render({ canvasContext: ctx, viewport }).promise;
                  imgData = canvas.toDataURL("image/jpeg", 0.85);
                }
              } catch {}

              collected.push({
                id: uid(),
                createdAt: Date.now(),
                title,
                ingredients,
                instructions,
                tags: [bookTag],
                imageDataUrls: imgData ? [imgData] : undefined,
                sourceFile: f.name,
                extra: {
                  page: start,
                  endPage: end,
                  ...meta,
                  source: "pdf-markers",
                },
              });
              titles.push(title);
            }
          }

          // Fallback: treat the entire document as a single recipe if it scores well
          const text = pageTexts
            .join("\n")
            .split(/\n/)
            .map(normLine)
            .join("\n");
          const structured = deriveStructuredRecipe(text);
          if (structured) {
            const {
              title: derivedTitle,
              ingredients,
              instructions,
              meta,
            } = structured;
            const ingredientCount = ingredients?.length ?? 0;
            const instructionCount = instructions?.length ?? 0;
            if (ingredientCount >= 2 || instructionCount >= 2) {
              const title = derivedTitle || f.name.replace(/\.pdf$/i, "");
              collected.push({
                id: uid(),
                createdAt: Date.now(),
                title,
                ingredients,
                instructions,
                sourceFile: f.name,
                extra: { ...meta, source: "pdf-single" },
              });
              titles.push(title);
            }
          }
        } catch (e: any) {
          errors.push({
            file: f.name,
            error: e?.message ?? "Failed to read PDF",
          });
        }
      }

      // Extract and send definitions to Echo from all PDF pages
      if (files.length > 0) {
        try {
          type PdfRow = {
            y: number;
            items: {
              x: number;
              xEnd: number;
              width: number;
              height: number;
              str: string;
            }[];
          };

          // Collect all page texts from all PDFs for definition extraction
          // This is wrapped in a try-catch to avoid breaking the main PDF import
          let allPageTexts: string[] = [];
          try {
            for (const f of files) {
              try {
                const ab = await f.arrayBuffer();
                let pdfjs: any;
                try {
                  pdfjs = await import(
                    "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.mjs"
                  );
                } catch (importError) {
                  console.warn(
                    "Could not load pdfjs from esm.sh, skipping definition extraction",
                  );
                  continue;
                }

                const workerSrc =
                  "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.worker.mjs";
                if (pdfjs?.GlobalWorkerOptions)
                  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

                const doc = await pdfjs.getDocument({ data: ab }).promise;

                for (let p = 1; p <= doc.numPages; p++) {
                  const page = await doc.getPage(p);
                  const tc = await page.getTextContent({
                    disableCombineTextItems: true,
                  });
                  const items = (tc.items || []) as any[];
                  if (!items.length) continue;

                  const rowMap = new Map<number, PdfRow>();
                  const yTolerance = 3;
                  for (const raw of items) {
                    const str = typeof raw.str === "string" ? raw.str : "";
                    if (!str.trim()) continue;
                    const transform = Array.isArray(raw.transform)
                      ? raw.transform
                      : [0, 0, 0, 0, raw.x || 0, raw.y || 0];
                    const x =
                      typeof transform[4] === "number" ? transform[4] : 0;
                    const y =
                      typeof transform[5] === "number" ? transform[5] : 0;
                    const widthCandidate =
                      typeof raw.width === "number"
                        ? raw.width
                        : typeof transform[0] === "number"
                          ? Math.abs(transform[0])
                          : str.length * 4;
                    const heightCandidate =
                      typeof raw.height === "number"
                        ? raw.height
                        : typeof transform[3] === "number"
                          ? Math.abs(transform[3])
                          : 0;
                    const key = Math.round(y / yTolerance) * yTolerance;
                    let row = rowMap.get(key);
                    if (!row) {
                      row = { y, items: [] };
                      rowMap.set(key, row);
                    }
                    row.items.push({
                      x,
                      xEnd: x + widthCandidate,
                      width: widthCandidate,
                      height: heightCandidate,
                      str,
                    });
                  }
                  const rows = Array.from(rowMap.values()).sort(
                    (a, b) => b.y - a.y,
                  );
                  const pageLines: string[] = [];
                  const newColumnGap = 48;
                  const wordGap = 4;
                  for (const row of rows) {
                    const sortedItems = row.items.sort((a, b) => a.x - b.x);
                    let buffer = "";
                    let bufferStart = sortedItems[0]?.x ?? 0;
                    let bufferEnd = sortedItems[0]?.xEnd ?? bufferStart;
                    for (let i = 0; i < sortedItems.length; i++) {
                      const current = sortedItems[i];
                      const text = current.str.replace(/\s+/g, " ").trim();
                      if (!text) continue;
                      if (!buffer) {
                        buffer = text;
                        bufferStart = current.x;
                        bufferEnd = current.xEnd;
                        continue;
                      }
                      const gap = current.x - bufferEnd;
                      if (gap > newColumnGap) {
                        if (buffer.trim()) {
                          pageLines.push(buffer.trim());
                        }
                        buffer = text;
                        bufferStart = current.x;
                        bufferEnd = current.xEnd;
                        continue;
                      }
                      if (gap > wordGap && !buffer.endsWith(" ")) buffer += " ";
                      buffer += text;
                      bufferEnd = Math.max(bufferEnd, current.xEnd);
                    }
                    if (buffer.trim()) {
                      pageLines.push(buffer.trim());
                    }
                  }
                  allPageTexts.push(pageLines.join("\n"));
                }
              } catch (pdfError) {
                console.warn(`Failed to extract definitions from ${f.name}`);
              }
            }
          } catch (outerError) {
            console.warn("Error in definition extraction block:", outerError);
          }

          if (allPageTexts.length > 0) {
            const combinedText = allPageTexts.join("\n");
            const sourceName =
              files[0]?.name.replace(/\.pdf$/i, "") || "Imported PDF";

            try {
              console.log(`📚 Extracting definitions from PDF...`);
              const response = await fetch(
                "/api/echo-training/extract-definitions-from-pdf",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    pdfText: combinedText,
                    sourceName,
                  }),
                },
              );

              if (response.ok) {
                const result = await response.json();
                if (result.count > 0) {
                  console.log(
                    `✅ Extracted ${result.count} definitions from "${sourceName}"`,
                  );

                  // Store definitions in Echo knowledge base AND local knowledge base
                  try {
                    const storeResponse = await fetch(
                      "/api/echo-training/store-definitions-batch",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          definitions: result.definitions,
                          sourceName,
                        }),
                      },
                    );

                    if (storeResponse.ok) {
                      const storeResult = await storeResponse.json();
                      console.log(
                        `✅ Stored ${storeResult.success} definitions in Echo knowledge base`,
                      );

                      // Also add definitions to local knowledge base for UI display
                      try {
                        const kbRaw = localStorage.getItem("kb:cook") || "{}";
                        const kb = JSON.parse(kbRaw);
                        const culinaryTerms = kb.culinaryTerms || {};
                        const definitions = kb.definitions || {};
                        const definitionDetails = kb.definitionDetails || {};

                        // Add extracted definitions to the knowledge base
                        for (const def of result.definitions) {
                          const term = def.term.toLowerCase();
                          if (!culinaryTerms[term]) {
                            culinaryTerms[term] = 1;
                          } else {
                            culinaryTerms[term] += 1;
                          }

                          // Store the definition text for display
                          definitions[term] = def.definition;

                          // Store detailed metadata separately
                          definitionDetails[term] = {
                            definition: def.definition,
                            categories: def.categories || [],
                            source: sourceName,
                            slug: def.slug,
                          };
                        }

                        kb.culinaryTerms = culinaryTerms;
                        kb.definitions = definitions;
                        kb.definitionDetails = definitionDetails;
                        kb.books = Array.from(
                          new Set([...(kb.books || []), sourceName]),
                        );

                        localStorage.setItem("kb:cook", JSON.stringify(kb));
                        console.log(
                          `📖 Added ${result.definitions.length} definitions to local knowledge base`,
                        );
                      } catch (localError) {
                        console.warn(
                          "Failed to add definitions to local KB:",
                          localError,
                        );
                      }
                    }
                  } catch (storeError) {
                    console.warn(
                      "Failed to store definitions in Echo:",
                      storeError,
                    );
                  }
                }
              }
            } catch (extractError) {
              console.warn("Failed to extract definitions:", extractError);
            }
          }
        } catch (defError) {
          console.warn("Error processing definitions:", defError);
        }
      }

      const { added } = appendRecipes(collected);
      return { added: added.length, errors, titles };
    },
    [appendRecipes],
  );

  const addRecipesFromExcelFiles = useCallback(
    async (files: File[]) => {
      const errors: { file: string; error: string }[] = [];
      const collected: Recipe[] = [];
      const titles: string[] = [];
      console.log("[Excel Import] Starting import of", files.length, "file(s)");
      for (const f of files) {
        console.log("[Excel Import] Processing file:", f.name, "Type:", f.type, "Size:", f.size);
        if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
          const err = "Unsupported spreadsheet type";
          console.error("[Excel Import]", f.name, "-", err);
          errors.push({ file: f.name, error: err });
          continue;
        }
        try {
          if (/\.csv$/i.test(f.name)) {
            const text = await f.text();
            const rows = text.split(/\r?\n/).map((l) => l.split(/,|\t/));
            const header = rows.shift() || [];
            const idx = (k: string) =>
              header.findIndex((h) => h.trim().toLowerCase() === k);
            const it = idx("title");
            const ii = idx("ingredients");
            const io = idx("instructions");
            for (const r of rows) {
              const title = (r[it] || "").trim();
              if (!title) continue;
              const ingredients = (r[ii] || "")
                .split(/\n|;|\|/)
                .map((s) => s.trim())
                .filter(Boolean);
              const instructions = (r[io] || "")
                .split(/\n|\.|;\s/)
                .map((s) => s.trim())
                .filter(Boolean);
              collected.push({
                id: uid(),
                createdAt: Date.now(),
                title,
                ingredients: ingredients.length ? ingredients : undefined,
                instructions: instructions.length ? instructions : undefined,
                sourceFile: f.name,
              });
              titles.push(title);
              try {
                const chunk = [title, ...ingredients, ...instructions].join(
                  "\n",
                );
                learnFromTextChunks(f.name.replace(/\.[^.]+$/, ""), [chunk]);
              } catch {}
            }
          } else {
            console.log("[Excel Import] Reading Excel file:", f.name);
            const ab = await f.arrayBuffer();
            console.log("[Excel Import] File read as array buffer, size:", ab.byteLength);
            let XLSX: any;

            try {
              console.log("[Excel Import] Loading XLSX library from CDN...");
              XLSX = await import("https://esm.sh/xlsx@0.18.5");
              console.log("[Excel Import] XLSX library loaded successfully");
            } catch (importError: any) {
              const msg = `Failed to load Excel parser: ${importError?.message || "Network error or library unavailable"}`;
              console.error("[Excel Import]", msg);
              throw new Error(msg);
            }

            if (!XLSX || !XLSX.read) {
              const msg = "Excel parser (XLSX) is not available";
              console.error("[Excel Import]", msg);
              throw new Error(msg);
            }

            let wb: any;
            try {
              console.log("[Excel Import] Parsing Excel file...");
              wb = XLSX.read(new Uint8Array(ab), { type: "array" });
              console.log("[Excel Import] Excel parsed successfully. Sheets:", wb.SheetNames);
            } catch (readError: any) {
              const msg = `Failed to parse Excel file: ${readError?.message || "Invalid format or corrupted file"}`;
              console.error("[Excel Import]", msg);
              throw new Error(msg);
            }

            if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
              const msg = "Excel file has no readable sheets";
              console.error("[Excel Import]", msg);
              throw new Error(msg);
            }

            const ws = wb.Sheets[wb.SheetNames[0]];
            if (!ws) {
              const msg = "Failed to access the first sheet in the Excel file";
              console.error("[Excel Import]", msg);
              throw new Error(msg);
            }

            let json: any[] = [];
            try {
              console.log("[Excel Import] Converting sheet to JSON...");

              const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false }) as any[][];
              console.log("[Excel Import] Total rows in sheet:", rawRows.length);

              let headerRowIdx = 0;
              let dataStartIdx = 1;

              if (rawRows.length > 0) {
                for (let i = 0; i < Math.min(25, rawRows.length); i++) {
                  const row = rawRows[i];
                  if (!Array.isArray(row) || row.length === 0) continue;

                  const rowStr = row.map((v) => String(v || "").toLowerCase()).join(" ");
                  const hasIngredient = rowStr.includes("ingredient");
                  const hasAmount = rowStr.includes("amount") || rowStr.includes("qty");
                  const hasRecipe = rowStr.includes("title") || rowStr.includes("name") || rowStr.includes("recipe");

                  if ((hasIngredient || hasAmount) || hasRecipe) {
                    console.log("[Excel Import] Found header row at index", i, "with content:", row);
                    headerRowIdx = i;
                    dataStartIdx = i + 1;
                    break;
                  }
                }
              }

              const headers = (rawRows[headerRowIdx] || []).map((h) => String(h || "").trim());
              console.log("[Excel Import] Using headers:", headers);

              for (let i = dataStartIdx; i < rawRows.length; i++) {
                const row = rawRows[i];
                if (!Array.isArray(row) || row.every((c) => !c)) continue;

                const obj: any = {};
                for (let j = 0; j < headers.length; j++) {
                  if (headers[j]) {
                    obj[headers[j]] = String(row[j] || "").trim();
                  }
                }
                if (Object.keys(obj).some((k) => obj[k])) {
                  json.push(obj);
                }
              }

              console.log("[Excel Import] Parsed", json.length, "data rows");
            } catch (jsonError: any) {
              const msg = `Failed to convert sheet to JSON: ${jsonError?.message || "Unknown error"}`;
              console.error("[Excel Import]", msg);
              throw new Error(msg);
            }

            if (!Array.isArray(json) || json.length === 0) {
              const msg = "Sheet contains no data rows";
              console.error("[Excel Import]", msg);
              throw new Error(msg);
            }

            const firstRow = json[0] || {};
            const columnKeys = Object.keys(firstRow);
            console.log("[Excel Import] Processing rows. Column headers found:", columnKeys);
            console.log("[Excel Import] First row data:", firstRow);

            const findColumn = (row: any, keywords: string[]): string => {
              const lowerKeywords = keywords.map((k) => k.toLowerCase());

              for (const key of Object.keys(row)) {
                const lowerKey = key.toLowerCase();
                for (const keyword of lowerKeywords) {
                  if (lowerKey.includes(keyword) || keyword.includes(lowerKey)) {
                    return key;
                  }
                }
              }

              for (const key of Object.keys(row)) {
                const lowerKey = key.toLowerCase();
                for (const keyword of lowerKeywords) {
                  if (
                    lowerKey.split(/[\s\-_]/).some((part) => part === keyword) ||
                    keyword.split(/[\s\-_]/).some((part) => part === lowerKey)
                  ) {
                    return key;
                  }
                }
              }

              return "";
            };

            const tryParseCosting = (): Recipe | null => {
              if (json.length === 0) return null;

              const firstRowKeys = Object.keys(json[0] || {});
              const hasIngredientColumn = firstRowKeys.some(
                (k) => k.toLowerCase().includes("ingredient") || k.toLowerCase() === "ingredient"
              );
              const hasAmountColumn = firstRowKeys.some(
                (k) => k.toLowerCase().includes("amount") || k.toLowerCase().includes("qty")
              );
              const hasUnitColumn = firstRowKeys.some(
                (k) => k.toLowerCase().includes("unit") || k.toLowerCase() === "u/m"
              );

              if (!hasIngredientColumn) return null;

              console.log("[Excel Import] Detected costing sheet format");

              let title = f.name.replace(/\.[^.]+$/, "");
              const ing: string[] = [];

              if (rawRows && rawRows.length > 0) {
                for (let i = 0; i < Math.min(15, rawRows.length); i++) {
                  const row = rawRows[i];
                  if (!Array.isArray(row)) continue;

                  const rowText = row.map((v) => String(v || "")).join(" ");
                  if (rowText.includes("Name:")) {
                    const nameMatch = rowText.match(/Name:\s*([^\n\t]+)/);
                    if (nameMatch && nameMatch[1]) {
                      title = nameMatch[1].trim();
                      console.log("[Excel Import] Extracted recipe name from row", i, ":", title);
                      break;
                    }
                  }
                }
              }

              for (const row of json) {
                const ingredientKey = findColumn(row, ["ingredient"]);
                const amountKey = findColumn(row, ["amount", "qty", "quantity"]);
                const unitKey = findColumn(row, ["unit", "u/m", "uom"]);

                const ingredient = String(row[ingredientKey] ?? "").trim();
                if (!ingredient) continue;

                const amount = String(row[amountKey] ?? "").trim();
                const unit = String(row[unitKey] ?? "").trim();

                let ingredientLine = ingredient;
                if (amount && unit) {
                  ingredientLine = `${amount} ${unit} ${ingredient}`;
                } else if (amount) {
                  ingredientLine = `${amount} ${ingredient}`;
                } else if (unit) {
                  ingredientLine = `${unit} ${ingredient}`;
                }

                ing.push(ingredientLine);
              }

              if (ing.length === 0) return null;

              console.log("[Excel Import] Parsed costing sheet as recipe:", title, "with", ing.length, "ingredients");
              return {
                id: uid(),
                createdAt: Date.now(),
                title,
                ingredients: ing.length ? ing : undefined,
                instructions: undefined,
                sourceFile: f.name,
              };
            };

            const costingRecipe = tryParseCosting();
            if (costingRecipe) {
              collected.push(costingRecipe);
              titles.push(costingRecipe.title);
              try {
                const chunk = [costingRecipe.title, ...(costingRecipe.ingredients || [])].join("\n");
                learnFromTextChunks(f.name.replace(/\.[^.]+$/, ""), [chunk]);
              } catch {}
            } else {
              for (const row of json) {
                const titleKey = findColumn(row, ["title", "name", "recipe"]);
                const ingredientsKey = findColumn(row, ["ingredient", "ingredients"]);
                const instructionsKey = findColumn(row, ["instruction", "instructions", "directions", "method", "steps"]);

                const title = String(row[titleKey] ?? "").trim();
                if (!title) {
                  console.log("[Excel Import] Skipping row with no title (checked column:", titleKey, "). Row data:", row);
                  continue;
                }
                console.log("[Excel Import] Found recipe:", title);

                const ing = String(row[ingredientsKey] ?? "")
                  .split(/\n|;|\|/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                const ins = String(row[instructionsKey] ?? "")
                  .split(/\n|\.|;\s/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                collected.push({
                  id: uid(),
                  createdAt: Date.now(),
                  title,
                  ingredients: ing.length ? ing : undefined,
                  instructions: ins.length ? ins : undefined,
                  sourceFile: f.name,
                });
                titles.push(title);
                try {
                  const chunk = [title, ...ing, ...ins].join("\n");
                  learnFromTextChunks(f.name.replace(/\.[^.]+$/, ""), [chunk]);
                } catch {}
              }
            }
          }
        } catch (e: any) {
          const errMsg = e?.message ?? "Failed to read spreadsheet";
          console.error("[Excel Import] Error processing file", f.name, ":", errMsg);
          errors.push({
            file: f.name,
            error: errMsg,
          });
        }
      }
      console.log("[Excel Import] Import complete. Collected:", collected.length, "recipes. Errors:", errors.length);
      const { added } = appendRecipes(collected);
      console.log("[Excel Import] Added to database:", added.length, "recipes");
      return { added: added.length, errors, titles };
    },
    [appendRecipes],
  );

  const addRecipesFromImageOcr = useCallback(
    async (files: File[]) => {
      const errors: { file: string; error: string }[] = [];
      const collected: Recipe[] = [];
      const titles: string[] = [];
      for (const f of files) {
        try {
          const Tesseract: any = await import(
            "https://esm.sh/tesseract.js@5.1.1"
          );
          const { data } = await Tesseract.recognize(
            await f.arrayBuffer(),
            "eng",
          );
          const raw = String(data?.text || "").trim();
          if (!raw) {
            errors.push({ file: f.name, error: "No text detected" });
            continue;
          }
          const lines = raw
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
          try {
            learnFromTextChunks(f.name.replace(/\.[^.]+$/, ""), [raw]);
          } catch {}
          const title =
            lines[0] || f.name.replace(/\.(png|jpe?g|webp|heic)$/i, "");
          const lower = lines.map((l) => l.toLowerCase());
          const find = (labels: string[]) =>
            lower.findIndex((l) => labels.includes(l));
          const ingIdx = find(["ingredients", "ingredient"]);
          const instIdx = find([
            "instructions",
            "directions",
            "method",
            "steps",
          ]);
          const getRange = (start: number, end: number) =>
            lines
              .slice(start + 1, end > start ? end : undefined)
              .filter(Boolean);
          const ingredients =
            ingIdx >= 0
              ? getRange(ingIdx, instIdx >= 0 ? instIdx : lines.length)
              : undefined;
          const instructions =
            instIdx >= 0 ? getRange(instIdx, lines.length) : undefined;
          collected.push({
            id: uid(),
            createdAt: Date.now(),
            title,
            ingredients,
            instructions,
            sourceFile: f.name,
          });
          titles.push(title);
        } catch (e: any) {
          errors.push({ file: f.name, error: e?.message ?? "OCR failed" });
        }
      }
      const { added } = appendRecipes(collected);
      return { added: added.length, errors, titles };
    },
    [appendRecipes],
  );

  const addFromZipArchive = useCallback(
    async (file: File) => {
      const errors: { entry: string; error: string }[] = [];
      const nextRecipes: Recipe[] = [];
      const nextImages: GalleryImage[] = [];
      const titles: string[] = [];

      try {
        const zip = await JSZip.loadAsync(file);
        const existingImageNames = new Set(images.map((i) => i.name));

        const entries = Object.values(zip.files);
        for (const entry of entries) {
          if (entry.dir) continue;
          const base = entry.name.split("/").pop() || entry.name;
          const lower = base.toLowerCase();

          try {
            if (lower.endsWith(".json")) {
              const str = await entry.async("string");
              const json = JSON.parse(str);
              const arr: any[] = Array.isArray(json) ? json : [json];
              for (const item of arr) {
                const norm = normalizeRecipe(item);
                if (norm) {
                  nextRecipes.push({
                    id: uid(),
                    createdAt: Date.now(),
                    sourceFile: base,
                    ...norm,
                  });
                  titles.push(norm.title);
                }
              }
            } else if (lower.endsWith(".docx")) {
              const ab = await entry.async("arraybuffer");
              const html = await convertDocxArrayBufferToHtml(ab);
              const recs = htmlToRecipes(html, base);
              nextRecipes.push(...recs);
              titles.push(...recs.map((r) => r.title));
            } else if (/(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/i.test(lower)) {
              if (existingImageNames.has(base)) continue;
              const blob = await entry.async("blob");
              // try to preserve mime if possible
              const mime = lower.endsWith(".png")
                ? "image/png"
                : lower.endsWith(".webp")
                  ? "image/webp"
                  : lower.endsWith(".gif")
                    ? "image/gif"
                    : "image/jpeg";
              const typedBlob = blob.type
                ? blob
                : new Blob([blob], { type: mime });
              const dataUrl = await dataUrlFromBlob(typedBlob);
              nextImages.push({
                id: uid(),
                name: base,
                dataUrl,
                createdAt: Date.now(),
                tags: [],
                favorite: false,
                order: images.length + nextImages.length,
                type: typedBlob.type,
              });
            }
          } catch (e: any) {
            errors.push({
              entry: entry.name,
              error: e?.message ?? "Failed to read entry",
            });
          }
        }
      } catch (e: any) {
        errors.push({ entry: file.name, error: e?.message ?? "Invalid ZIP" });
      }

      if (nextImages.length) setImages((prev) => [...nextImages, ...prev]);
      const addedInfo = nextRecipes.length
        ? appendRecipes(nextRecipes)
        : { added: [] as Recipe[], duplicates: [] as Recipe[] };
      if (addedInfo.added.length) {
        setTimeout(linkImagesToRecipesByFilename, 0);
      }

      return {
        addedRecipes: addedInfo.added.length,
        addedImages: nextImages.length,
        errors,
        titles,
      };
    },
    [appendRecipes, images, linkImagesToRecipesByFilename],
  );

  const updateRecipe = useCallback((id: string, patch: Partial<Recipe>) => {
    setRecipes((prev) => {
      const index = prev.findIndex((recipe) => recipe.id === id);
      if (index === -1) return prev;
      const current = prev[index]!;
      const mergedExtra =
        patch.extra !== undefined
          ? { ...(current.extra ?? {}), ...(patch.extra ?? {}) }
          : current.extra;

      const mergedRecipe: Recipe = sanitizeRecipeRecord({
        ...current,
        ...patch,
        id: current.id,
        createdAt: current.createdAt,
        title:
          patch.title !== undefined
            ? String(patch.title ?? "").trim() || "Untitled"
            : current.title,
        extra: mergedExtra,
      });

      const key = recipeTitleKey(mergedRecipe.title);
      const conflictIndex = prev.findIndex(
        (recipe, idx) => idx !== index && recipeTitleKey(recipe.title) === key,
      );

      if (conflictIndex !== -1) {
        return prev.reduce<Recipe[]>((acc, recipe, idx) => {
          if (idx === conflictIndex) {
            const conflict = recipe;
            acc.push({
              ...conflict,
              ...mergedRecipe,
              id: conflict.id,
              createdAt: conflict.createdAt,
              extra:
                mergedRecipe.extra !== undefined
                  ? { ...(conflict.extra ?? {}), ...(mergedRecipe.extra ?? {}) }
                  : conflict.extra,
            });
          } else if (idx !== index) {
            acc.push(recipe);
          }
          return acc;
        }, []);
      }

      const next = prev.slice();
      next[index] = mergedRecipe;
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)),
    );
  }, []);
  const rateRecipe = useCallback((id: string, rating: number) => {
    const v = Math.max(0, Math.min(5, Math.round(rating)));
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rating: v } : r)),
    );
  }, []);
  const updateRecipeTags = useCallback((id: string, tags: string[]) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, tags } : r)));
  }, []);
  const deleteRecipe = useCallback((id: string) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, deletedAt: Date.now() } : r)),
    );
  }, []);
  const restoreRecipe = useCallback((id: string) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, deletedAt: null } : r)),
    );
  }, []);
  const purgeDeleted = useCallback(() => {
    setRecipes((prev) => prev.filter((r) => !r.deletedAt));
  }, []);
  const destroyRecipe = useCallback((id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const getRecipeById = useCallback(
    (id: string) => recipes.find((r) => r.id === id),
    [recipes],
  );

  const attachImageToRecipeFromGallery = useCallback(
    (recipeId: string, imageName: string) => {
      const img = images.find((i) => i.name === imageName);
      if (!img) return;
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipeId
            ? {
                ...r,
                imageNames: Array.from(
                  new Set([...(r.imageNames ?? []), imageName]),
                ),
                imageDataUrls: Array.from(
                  new Set([...(r.imageDataUrls ?? []), img.dataUrl]),
                ),
              }
            : r,
        ),
      );
    },
    [images],
  );

  const clearRecipes = useCallback(() => setRecipes([]), []);
  const clearImages = useCallback(() => {
    setImages([]);
    imageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    imageObjectUrlsRef.current.clear();
    clearAllImageBlobs().catch((error) =>
      console.warn("Failed to clear gallery blob store", error),
    );
  }, []);

  const searchRecipes = useCallback(
    (q: string) => {
      const query = q.trim().toLowerCase();
      if (!query) return recipes;
      return recipes.filter((r) => {
        if (r.title.toLowerCase().includes(query)) return true;
        const ing = r.ingredients?.join(" \n ").toLowerCase() ?? "";
        const instr = r.instructions?.join(" \n ").toLowerCase() ?? "";
        const tags = r.tags?.join(" ").toLowerCase() ?? "";
        return (
          ing.includes(query) || instr.includes(query) || tags.includes(query)
        );
      });
    },
    [recipes],
  );

  const restoreDemo = useCallback(() => {
    setImages([]);
    setLookbooks([]);
    imageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    imageObjectUrlsRef.current.clear();
    clearAllImageBlobs().catch((error) =>
      console.warn("Failed to reset gallery storage", error),
    );
    try {
      localStorage.removeItem(LS_IMAGES);
      localStorage.removeItem(LS_LOOKBOOKS);
      localStorage.removeItem("gallery:seeded:food:v1");
    } catch {}
  }, []);

  const addDemoImages = useCallback(async (): Promise<number> => {
    const now = Date.now();
    const makeDataUrl = (label: string, hue: number) => {
      try {
        const c = document.createElement("canvas");
        c.width = 960;
        c.height = 720;
        const ctx = c.getContext("2d");
        if (!ctx) return "";
        const g = ctx.createLinearGradient(0, 0, 960, 720);
        g.addColorStop(0, `hsl(${hue},65%,92%)`);
        g.addColorStop(1, `hsl(${(hue + 30) % 360},70%,82%)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 960, 720);
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.font = "bold 72px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, 480, 380);
        return c.toDataURL("image/jpeg", 0.78);
      } catch {
        return "";
      }
    };
    const pastryNames = [
      "Croissant",
      "Eclair",
      "Macaron",
      "Tart",
      "Mille-feuille",
      "Profiterole",
      "Strudel",
      "Cannoli",
      "Baklava",
      "Choux",
      "Danish",
      "Brioche",
    ];
    const otherNames = ["Cake", "Pie", "Bread", "Plated", "Savory"];
    const existingNames = new Set(images.map((i) => i.name));
    let order = images.length
      ? Math.max(...images.map((i) => (i as any).order ?? 0)) + 1
      : 0;
    const next: GalleryImage[] = [];
    const makeUnique = (base: string) => {
      let name = base;
      let i = 2;
      while (existingNames.has(name) || next.some((n) => n.name === name)) {
        const dot = base.lastIndexOf(".");
        if (dot > 0) name = `${base.slice(0, dot)}-${i}${base.slice(dot)}`;
        else name = `${base}-${i}`;
        i++;
      }
      return name;
    };
    const pushImg = async (label: string, hue: number, fileBase: string) => {
      const name = makeUnique(fileBase);
      const rawDataUrl = makeDataUrl(label, hue);
      const id = uid();
      let dataUrl = rawDataUrl;
      let blobUrl: string | undefined;
      if (rawDataUrl) {
        try {
          const blob = await blobFromDataUrl(rawDataUrl);
          await saveImageBlob(id, blob);
          blobUrl = createObjectUrl(id, blob);
          dataUrl = await dataUrlFromBlob(blob);
        } catch (error) {
          console.warn("Failed to persist demo placeholder", name, error);
        }
      }
      next.push({
        id,
        name,
        dataUrl,
        blobUrl,
        createdAt: now,
        tags: ["demo", label.toLowerCase()],
        favorite: false,
        order: order++,
        type: "image/jpeg",
      });
    };
    for (const [index, lab] of pastryNames.entries()) {
      await pushImg(lab, (index * 25) % 360, `${lab.toLowerCase()}-demo.jpg`);
    }
    for (const [index, lab] of otherNames.entries()) {
      await pushImg(
        lab,
        (index * 60 + 180) % 360,
        `${lab.toLowerCase()}-demo.jpg`,
      );
    }
    if (next.length) setImages((prev) => [...next, ...prev]);
    return next.length;
  }, [createObjectUrl, images]);

  const addStockFoodPhotos = useCallback(async (): Promise<number> => {
    const existingNames = new Set(images.map((i) => i.name));
    let order = images.length
      ? Math.max(...images.map((i) => (i as any).order ?? 0)) + 1
      : 0;
    const list = [
      {
        name: "pizza.jpg",
        url: "https://images.unsplash.com/photo-1548365328-9f547fb09530?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "pizza", "stock", "demo"],
      },
      {
        name: "burger.jpg",
        url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "burger", "stock", "demo"],
      },
      {
        name: "salad.jpg",
        url: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "salad", "stock", "demo"],
      },
      {
        name: "pasta.jpg",
        url: "https://images.unsplash.com/photo-1521389508051-d7ffb5dc8bbf?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "pasta", "stock", "demo"],
      },
      {
        name: "steak.jpg",
        url: "https://images.unsplash.com/photo-1553163147-622ab57be1c7?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "steak", "stock", "demo"],
      },
      {
        name: "sushi.jpg",
        url: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "sushi", "stock", "demo"],
      },
      {
        name: "dessert.jpg",
        url: "https://images.unsplash.com/photo-1541976076758-347942db1970?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "dessert", "stock", "demo"],
      },
      {
        name: "bread.jpg",
        url: "https://images.unsplash.com/photo-1509440159598-8b4e0b0b1f66?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "bread", "stock", "demo"],
      },
      {
        name: "cupcake.jpg",
        url: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "dessert", "cupcake", "stock", "demo"],
      },
      {
        name: "icecream.jpg",
        url: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "dessert", "ice cream", "stock", "demo"],
      },
      {
        name: "tiramisu.jpg",
        url: "https://images.unsplash.com/photo-1604908176997-431be3fa7e4d?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "dessert", "tiramisu", "stock", "demo"],
      },
      {
        name: "cheesecake.jpg",
        url: "https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?auto=format&fit=crop&w=960&h=720&q=70",
        tags: ["food", "dessert", "cheesecake", "stock", "demo"],
      },
    ];
    const makeUnique = (base: string) => {
      let name = base;
      let i = 2;
      while (existingNames.has(name)) {
        const d = base.lastIndexOf(".");
        name =
          d > 0 ? `${base.slice(0, d)}-${i}${base.slice(d)}` : `${base}-${i}`;
        i++;
      }
      return name;
    };
    const next: GalleryImage[] = [];
    for (const it of list) {
      try {
        const res = await fetch(it.url);
        const blob = await res.blob();
        const dataUrl = await dataUrlFromBlob(blob);
        next.push({
          id: uid(),
          name: makeUnique(it.name),
          dataUrl,
          createdAt: Date.now(),
          tags: it.tags,
          favorite: false,
          order: order++,
          type: blob.type || "image/jpeg",
        });
      } catch {}
    }
    if (next.length) setImages((prev) => [...next, ...prev]);
    return next.length;
  }, [images]);

  const value = useMemo<AppData>(
    () => ({
      recipes,
      images,
      lookbooks,
      tileBoards,
      addImages,
      restoreDemo,
      createTileBoard,
      updateTileBoard,
      deleteTileBoard,
      addTileToBoard,
      updateTileInBoard,
      removeTileFromBoard,
      addRecipe,
      addRecipesFromJsonFiles,
      addRecipesFromDocxFiles,
      addRecipesFromHtmlFiles,
      addRecipesFromPdfFiles,
      addRecipesFromPdfFilesVision,
      addRecipesFromExcelFiles,
      addRecipesFromImageOcr,
      addFromZipArchive,
      updateRecipe,
      getRecipeById,
      attachImageToRecipeFromGallery,
      clearRecipes,
      clearImages,
      searchRecipes,
      linkImagesToRecipesByFilename,
      updateImage,
      addTagsToImages,
      reorderImages,
      deleteImage,
      addLookBook,
      updateLookBook,
      deleteLookBook,
      addImagesToLookBook,
      removeImagesFromLookBook,
      exportAllZip,
      toggleFavorite,
      rateRecipe,
      updateRecipeTags,
      deleteRecipe,
      restoreRecipe,
      purgeDeleted,
      destroyRecipe,
      addDemoImages,
      addStockFoodPhotos,
      collections,
      createCollection,
      updateCollection,
      deleteCollection,
      addRecipeToCollection,
      removeRecipeFromCollection,
      setCollectionRecipes,
      getCollectionById,
      workflows,
      inspections,
      addWorkflowPlan,
      updateWorkflowPlan,
      deleteWorkflowPlan,
      addInspectionReport,
      deleteInspectionReport,
      getWorkflowById,
      getInspectionById,
      listStations,
      listPrinters,
    }),
    [
      recipes,
      images,
      lookbooks,
      tileBoards,
      collections,
      addImages,
      restoreDemo,
      createTileBoard,
      updateTileBoard,
      deleteTileBoard,
      addTileToBoard,
      updateTileInBoard,
      removeTileFromBoard,
      addRecipe,
      addRecipesFromJsonFiles,
      addRecipesFromDocxFiles,
      addRecipesFromPdfFilesVision,
      addFromZipArchive,
      updateRecipe,
      getRecipeById,
      attachImageToRecipeFromGallery,
      searchRecipes,
      linkImagesToRecipesByFilename,
      updateImage,
      addTagsToImages,
      reorderImages,
      deleteImage,
      addLookBook,
      updateLookBook,
      deleteLookBook,
      addImagesToLookBook,
      removeImagesFromLookBook,
      exportAllZip,
      toggleFavorite,
      rateRecipe,
      updateRecipeTags,
      deleteRecipe,
      restoreRecipe,
      purgeDeleted,
      destroyRecipe,
      addDemoImages,
      addStockFoodPhotos,
      createCollection,
      updateCollection,
      deleteCollection,
      addRecipeToCollection,
      removeRecipeFromCollection,
      setCollectionRecipes,
      getCollectionById,
      workflows,
      inspections,
      addWorkflowPlan,
      updateWorkflowPlan,
      deleteWorkflowPlan,
      addInspectionReport,
      deleteInspectionReport,
      getWorkflowById,
      getInspectionById,
      listStations,
      listPrinters,
    ],
  );

  return <CTX.Provider value={value}>{children}</CTX.Provider>;
}

export function useAppData() {
  const ctx = useContext(CTX);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
