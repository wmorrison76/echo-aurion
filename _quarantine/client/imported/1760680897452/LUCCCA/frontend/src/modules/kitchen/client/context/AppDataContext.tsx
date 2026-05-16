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

export type Recipe = {
  id: string;
  title: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  tags?: string[];
  imageNames?: string[]; // filenames to link with gallery
  imageDataUrls?: string[]; // resolved from gallery by name
  createdAt: number;
  sourceFile?: string;
  extra?: Record<string, unknown>;
  favorite?: boolean;
  rating?: number; // 0-5
  deletedAt?: number | null; // soft delete
};

export type LookBook = {
  id: string;
  name: string;
  imageIds: string[];
  createdAt: number;
};

type AppData = {
  recipes: Recipe[];
  images: GalleryImage[];
  lookbooks: LookBook[];
  addImages: (files: File[], opts?: { tags?: string[] }) => Promise<number>;
  restoreDemo: () => void;
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
  exportAllZip: () => Promise<void>;
};

const CTX = createContext<AppData | null>(null);

const LS_RECIPES = "app.recipes.v1";
const LS_IMAGES = "app.images.v1";
const LS_LOOKBOOKS = "app.lookbooks.v1";

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

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [lookbooks, setLookbooks] = useState<LookBook[]>([]);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setRecipes(readLS<Recipe[]>(LS_RECIPES, []));
    setImages(readLS<GalleryImage[]>(LS_IMAGES, []));
    setLookbooks(readLS<LookBook[]>(LS_LOOKBOOKS, []));
  }, []);

  useEffect(() => {
    let seeded = false;
    try {
      seeded = localStorage.getItem("gallery:seeded:food:v1") === "1";
    } catch {}

    const onlyOldDemo =
      images.length > 0 &&
      images.every(
        (i) =>
          (i.tags || []).includes("demo") && !(i.tags || []).includes("food"),
      );
    if (images.length > 0 && !onlyOldDemo) return;

    (async () => {
      try {
        const items = [
          {
            name: "pizza.jpg",
            url: "https://images.unsplash.com/photo-1548365328-9f547fb09530?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "pizza", "demo"],
          },
          {
            name: "burger.jpg",
            url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "burger", "demo"],
          },
          {
            name: "salad.jpg",
            url: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "salad", "demo"],
          },
          {
            name: "pasta.jpg",
            url: "https://images.unsplash.com/photo-1521389508051-d7ffb5dc8bbf?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "pasta", "demo"],
          },
          {
            name: "steak.jpg",
            url: "https://images.unsplash.com/photo-1553163147-622ab57be1c7?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "steak", "demo"],
          },
          {
            name: "sushi.jpg",
            url: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "sushi", "demo"],
          },
          {
            name: "dessert.jpg",
            url: "https://images.unsplash.com/photo-1541976076758-347942db1970?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "dessert", "demo"],
          },
          {
            name: "bread.jpg",
            url: "https://images.unsplash.com/photo-1509440159598-8b4e0b0b1f66?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "bread", "demo"],
          },
          {
            name: "cupcake.jpg",
            url: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "dessert", "cupcake", "demo"],
          },
          {
            name: "icecream.jpg",
            url: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "dessert", "ice cream", "demo"],
          },
          {
            name: "tiramisu.jpg",
            url: "https://images.unsplash.com/photo-1604908176997-431be3fa7e4d?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "dessert", "tiramisu", "demo"],
          },
          {
            name: "cheesecake.jpg",
            url: "https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?auto=format&fit=crop&w=960&h=720&q=70",
            tags: ["food", "dessert", "cheesecake", "demo"],
          },
        ];
        const next: GalleryImage[] = [];
        let order = 0;
        for (const it of items) {
          try {
            const res = await fetch(it.url);
            if (!res.ok) continue;
            const blob = await res.blob();
            const dataUrl = await dataUrlFromBlob(blob);
            next.push({
              id: uid(),
              name: it.name,
              dataUrl,
              createdAt: Date.now(),
              tags: it.tags,
              favorite: false,
              order: order++,
              type: blob.type || "image/jpeg",
            });
          } catch {}
        }
        if (!mountedRef.current) return;
        if (onlyOldDemo) setImages([]);
        if (images.length === 0 || onlyOldDemo) {
          if (next.length) setImages(next);
          try {
            localStorage.setItem("gallery:seeded:food:v1", "1");
          } catch {}
        }
      } catch {}
    })();
  }, [images.length]);

  useEffect(() => {
    writeLS(LS_RECIPES, recipes);
  }, [recipes]);

  useEffect(() => {
    writeLS(LS_IMAGES, images);
  }, [images]);

  useEffect(() => {
    writeLS(LS_LOOKBOOKS, lookbooks);
  }, [lookbooks]);

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

  const addImages = useCallback(
    async (files: File[], opts?: { tags?: string[] }) => {
      let added = 0;
      const existing = new Set(images.map((i) => i.name));
      const maxOrder = images.length
        ? Math.max(
            ...images.map((i) =>
              typeof (i as any).order === "number" ? (i as any).order : -1,
            ),
          )
        : -1;
      let order = maxOrder + 1;
      const next: GalleryImage[] = [];
      for (const f of files) {
        if (existing.has(f.name)) continue;
        try {
          const isDisplayable =
            f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
          if (isDisplayable) {
            const dataUrl = await dataUrlFromFile(f);
            next.push({
              id: uid(),
              name: f.name,
              dataUrl,
              createdAt: Date.now(),
              tags: opts?.tags ?? [],
              favorite: false,
              order: order++,
              type: f.type,
            });
            added++;
          } else {
            const blob = new Blob([await f.arrayBuffer()], {
              type: f.type || "application/octet-stream",
            });
            const blobUrl = URL.createObjectURL(blob);
            next.push({
              id: uid(),
              name: f.name,
              blobUrl,
              createdAt: Date.now(),
              tags: opts?.tags ?? [],
              favorite: false,
              order: order++,
              type: f.type,
              unsupported: true,
            });
            added++;
          }
        } catch (e) {
          console.warn("Failed to read file", f.name, e);
        }
      }
      if (next.length) setImages((prev) => [...next, ...prev]);
      return added;
    },
    [images],
  );

  const addRecipe = useCallback((recipe: Omit<Recipe, "id" | "createdAt">) => {
    const item: Recipe = {
      id: uid(),
      createdAt: Date.now(),
      ...recipe,
    } as Recipe;
    setRecipes((prev) => [item, ...prev]);
    return item.id;
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
    setImages((prev) => prev.filter((i) => i.id !== id));
    setLookbooks((prev) =>
      prev.map((b) => ({ ...b, imageIds: b.imageIds.filter((x) => x !== id) })),
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

  const exportAllZip = useCallback(async () => {
    const zip = new JSZip();
    zip.file("data/recipes.json", JSON.stringify(recipes, null, 2));
    zip.file("data/lookbooks.json", JSON.stringify(lookbooks, null, 2));
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
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `recipe-studio-export-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }, [images, recipes, lookbooks]);

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

      if (collected.length) setRecipes((prev) => [...collected, ...prev]);
      try {
        const chunks = collected.map((r) =>
          [r.title, ...(r.ingredients || []), ...(r.instructions || [])].join(
            "\n",
          ),
        );
        if (chunks.length) learnFromTextChunks("json-import", chunks);
      } catch {}
      // try auto-link after import
      setTimeout(linkImagesToRecipesByFilename, 0);

      return { added: collected.length, errors, titles };
    },
    [linkImagesToRecipesByFilename],
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
    const nodes = Array.from(doc.body.children);

    const titleTags = new Set(["H1", "H2"]);
    const sections: { title: string; elements: Element[] }[] = [];
    let current: { title: string; elements: Element[] } | null = null;

    for (const el of nodes) {
      if (titleTags.has(el.tagName)) {
        const title = (el.textContent || "").trim();
        if (title) {
          if (current) sections.push(current);
          current = { title, elements: [] };
          continue;
        }
      }
      if (current) current.elements.push(el);
    }
    if (current) sections.push(current);

    const baseName = source.replace(/\.[^.]+$/, "");
    if (!sections.length) {
      const title =
        (
          doc.querySelector("h1,h2,h3")?.textContent ||
          baseName ||
          "Untitled"
        ).trim() || "Untitled";
      sections.push({ title, elements: Array.from(doc.body.children) });
    } else {
      // Normalize empty or generic titles
      for (const s of sections) {
        const t = (s.title || "").trim();
        if (!t || /^untitled$/i.test(t)) s.title = baseName || "Untitled";
      }
    }

    const extractListAfter = (startIdx: number, arr: Element[]) => {
      const out: string[] = [];
      for (let i = startIdx + 1; i < arr.length; i++) {
        const el = arr[i];
        const tag = el.tagName;
        if (["H1", "H2", "H3"].includes(tag)) break;
        if (tag === "UL" || tag === "OL") {
          out.push(
            ...Array.from(el.querySelectorAll("li"))
              .map((li) => (li.textContent || "").trim())
              .filter(Boolean),
          );
        } else if (tag === "P") {
          const t = (el.textContent || "").trim();
          if (t) out.push(t);
        } else if (tag === "TABLE") {
          const cells = Array.from(
            el.querySelectorAll("td,th"),
          ) as HTMLElement[];
          const cellText = cells
            .map((c) => (c.textContent || "").trim())
            .filter(Boolean);
          out.push(...cellText);
        }
      }
      return out;
    };

    const results: Recipe[] = [];
    const qtyRe =
      /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[a-zA-Z]+)?\b/;

    for (const sec of sections) {
      const els = sec.elements;
      const texts = els.map((e) => e.textContent || "");
      const lowerTexts = texts.map((t) => t.toLowerCase());
      const findIdx = (label: string[]) =>
        lowerTexts.findIndex((t) => label.some((l) => t.startsWith(l)));
      let ingIdx = findIdx(["ingredients", "ingredient", "what you need"]);
      let instIdx = findIdx(["instructions", "directions", "method", "steps"]);
      let ingredients = ingIdx >= 0 ? extractListAfter(ingIdx, els) : [];
      let instructions = instIdx >= 0 ? extractListAfter(instIdx, els) : [];

      // Fallbacks: detect ingredients by quantity patterns; detect numbered steps
      if (!ingredients.length) {
        ingredients = texts.filter((t) => qtyRe.test(t.trim()));
      }
      if (!instructions.length) {
        const numbered = texts.filter((t) =>
          /^(?:\d+\.|Step\s*\d+)/i.test(t.trim()),
        );
        if (numbered.length) instructions = numbered;
      }
      if (!instructions.length && ingredients.length) {
        const start = Math.max(
          texts.findIndex((t) => qtyRe.test(t.trim())) + 3,
          0,
        );
        instructions = texts.slice(start, start + 20).filter(Boolean);
      }

      // Repair: move quantity-like lines from instructions back to ingredients
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

      // Deduplicate and tidy
      const uniq = (arr: string[]) =>
        Array.from(new Set(arr.map((s) => s.replace(/\s+/g, " ").trim())));
      ingredients = uniq(ingredients).filter(Boolean);
      instructions = uniq(instructions).filter(Boolean);

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

  const addRecipesFromHtmlFiles = useCallback(async (files: File[]) => {
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
            [r.title, ...(r.ingredients || []), ...(r.instructions || [])].join(
              "\n",
            ),
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
    if (collected.length) setRecipes((prev) => [...collected, ...prev]);
    return { added: collected.length, errors, titles };
  }, []);

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

      if (collected.length) setRecipes((prev) => [...collected, ...prev]);
      setTimeout(linkImagesToRecipesByFilename, 0);
      return { added: collected.length, errors, titles };
    },
    [linkImagesToRecipesByFilename],
  );

  const addRecipesFromPdfFiles = useCallback(async (files: File[]) => {
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
        let ocrBudget = 24; // cap OCR pages for performance
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const tc = await page.getTextContent();
          let t = tc.items.map((i: any) => i.str).join("\n");
          if (
            ocrEnabled &&
            ocrBudget > 0 &&
            t.replace(/\s+/g, "").length < 20
          ) {
            try {
              const viewport = page.getViewport({ scale: 1.6 });
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              if (ctx) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: ctx, viewport }).promise;
                const dataUrl = canvas.toDataURL("image/png");
                const Tesseract: any = await import(
                  "https://esm.sh/tesseract.js@5.1.1"
                );
                const { data } = await Tesseract.recognize(
                  await (await fetch(dataUrl)).arrayBuffer(),
                  "eng",
                );
                const txt = String(data?.text || "").trim();
                if (txt) {
                  t = txt;
                  ocrBudget--;
                }
              }
            } catch {}
          }
          pageTexts.push(t);
        }
        const normLine = (s: string) => {
          let t = s.replace(/\s+/g, " ").trim();
          if (/^([A-Z]\s+){2,}[A-Z][\s:]*$/.test(t) && t.length <= 60)
            t = t.replace(/\s+/g, "");
          return t;
        };
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
            // Only import if it looks like a recipe
            const hasRecipeMarkers =
              /\bingredients?\b/i.test(text) &&
              /\b(instructions|directions|method|steps)\b/i.test(text);
            if (!hasRecipeMarkers) continue;
            const meta = parseMeta(text);
            // Extract ingredients/instructions with fallbacks
            const lines = text.split(/\n/).map(normLine).filter(Boolean);
            const lower = lines.map((l) => l.toLowerCase());
            const find = (labels: string[]) =>
              lower.findIndex((l) => labels.some((x) => l.startsWith(x)));
            let ingIdx = find(["ingredients", "ingredient"]);
            let instIdx = find([
              "instructions",
              "directions",
              "method",
              "steps",
            ]);
            // Fallback: detect an ingredient block by qty/unit patterns
            if (ingIdx < 0) {
              const qtyRe =
                /^(?:\d+\s+\d\/\d|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\b/;
              for (let i = 0; i < Math.min(lines.length, 80); i++) {
                if (qtyRe.test(lines[i])) {
                  ingIdx = i - 1;
                  break;
                }
              }
            }
            if (instIdx < 0 && ingIdx >= 0) {
              for (let i = ingIdx + 1; i < Math.min(lines.length, 200); i++) {
                if (
                  /^(instructions|directions|method|steps)\b/i.test(lines[i]) ||
                  /^\d+\.|^Step\s*\d+/i.test(lines[i])
                ) {
                  instIdx = i;
                  break;
                }
              }
            }
            const getRange = (s: number, e: number) =>
              lines.slice(s + 1, e > s ? e : undefined).filter(Boolean);
            let ingredients =
              ingIdx >= 0
                ? getRange(ingIdx, instIdx >= 0 ? instIdx : lines.length)
                : undefined;
            let instructions =
              instIdx >= 0 ? getRange(instIdx, lines.length) : undefined;
            // If still missing, guess instructions as paragraphs after ingredients
            if ((!instructions || instructions.length < 2) && ingIdx >= 0) {
              const start = Math.max(ingIdx + 1, 0);
              instructions = lines
                .slice(start + Math.max(ingredients?.length || 0, 4))
                .slice(0, 40);
            }

            // Try to capture photo page or first recipe page as image
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
              title: cur.title,
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
            titles.push(cur.title);
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
          const qtyRe =
            /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[a-zA-Z]+)?\b/;
          let cnt = 0;
          for (const L of lines) {
            if (qtyRe.test(L) || /^[•\-*]\s+/.test(L)) cnt++;
          }
          return cnt >= 3;
        };
        const instWord =
          /(instructions|directions|method|steps|preparation|procedure)\b/i;
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
              if (rev.length === 0 || rev[rev.length - 1] - p > 1) rev.push(p);
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
            const lines = text.split(/\n/).map(normLine).filter(Boolean);
            const lower = lines.map((l) => l.toLowerCase());
            const find = (labels: string[]) =>
              lower.findIndex((l) => labels.some((x) => l.startsWith(x)));
            let ingIdx = find(["ingredients", "ingredient"]);
            let instIdx = find([
              "instructions",
              "directions",
              "method",
              "steps",
              "preparation",
              "procedure",
            ]);
            if (ingIdx < 0) {
              const qtyRe =
                /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[a-zA-Z]+)?\b/;
              for (let j = 0; j < Math.min(lines.length, 80); j++) {
                if (qtyRe.test(lines[j]) || /^[•\-*]\s+/.test(lines[j])) {
                  ingIdx = j - 1;
                  break;
                }
              }
            }
            if (instIdx < 0 && ingIdx >= 0) {
              for (let j = ingIdx + 1; j < Math.min(lines.length, 200); j++) {
                if (
                  /^(instructions|directions|method|steps|preparation|procedure)\b/i.test(
                    lines[j],
                  ) ||
                  /^\d+\.|^Step\s*\d+/i.test(lines[j])
                ) {
                  instIdx = j;
                  break;
                }
              }
            }
            const getRange = (s: number, e: number) =>
              lines.slice(s + 1, e > s ? e : undefined).filter(Boolean);
            const ingredients =
              ingIdx >= 0
                ? getRange(ingIdx, instIdx >= 0 ? instIdx : lines.length)
                : undefined;
            const instructions =
              instIdx >= 0 ? getRange(instIdx, lines.length) : undefined;
            const meta = parseMeta(text);
            // Title: prefer heading near top or before ingredients
            let title = "";
            for (
              let k = Math.max(0, ingIdx - 6);
              k < Math.min(lines.length, Math.max(ingIdx, 8));
              k++
            ) {
              const L = lines[k] || "";
              if (
                /^[A-Z][A-Za-z0-9\-\'\s]{2,80}$/.test(L) ||
                /^([A-Z]\s+){2,}[A-Z][\s:]*$/.test(L)
              ) {
                title = L.replace(/\s+/g, " ").trim();
                break;
              }
            }
            if (!title) title = lines[0] || `${bookTag} p.${start}`;
            // Render preview image for first page of section
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
            // Only keep if it still looks like a recipe
            if (
              (ingredients && ingredients.length >= 2) ||
              (instructions && instructions.length >= 3)
            ) {
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
        }

        // Fallback: only import if the whole document clearly looks like a single recipe
        const text = pageTexts.join("\n").split(/\n/).map(normLine).join("\n");
        const hasRecipeMarkers =
          /\bingredients?\b/i.test(text) &&
          /\b(instructions|directions|method|steps)\b/i.test(text);
        if (hasRecipeMarkers) {
          const lines = text.split(/\n/).map(normLine).filter(Boolean);
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
          const getRange = (s: number, e: number) =>
            lines.slice(s + 1, e > s ? e : undefined).filter(Boolean);
          const ingredients =
            ingIdx >= 0
              ? getRange(ingIdx, instIdx >= 0 ? instIdx : lines.length)
              : undefined;
          const instructions =
            instIdx >= 0 ? getRange(instIdx, lines.length) : undefined;
          const meta = parseMeta(text);
          const title = lines[0] || f.name.replace(/\.pdf$/i, "");
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
      } catch (e: any) {
        errors.push({
          file: f.name,
          error: e?.message ?? "Failed to read PDF",
        });
      }
    }

    if (collected.length) setRecipes((prev) => [...collected, ...prev]);
    return { added: collected.length, errors, titles };
  }, []);

  const addRecipesFromExcelFiles = useCallback(async (files: File[]) => {
    const errors: { file: string; error: string }[] = [];
    const collected: Recipe[] = [];
    const titles: string[] = [];
    for (const f of files) {
      if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
        errors.push({ file: f.name, error: "Unsupported spreadsheet type" });
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
              const chunk = [title, ...ingredients, ...instructions].join("\n");
              learnFromTextChunks(f.name.replace(/\.[^.]+$/, ""), [chunk]);
            } catch {}
          }
        } else {
          const ab = await f.arrayBuffer();
          const XLSX: any = await import("https://esm.sh/xlsx@0.18.5");
          const wb = XLSX.read(ab, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
          for (const row of json) {
            const title = String(
              row.title ?? row.Name ?? row.Recipe ?? "",
            ).trim();
            if (!title) continue;
            const ing = String(row.ingredients ?? row.Ingredients ?? "")
              .split(/\n|;|\|/)
              .map((s) => s.trim())
              .filter(Boolean);
            const ins = String(
              row.instructions ?? row.Directions ?? row.Method ?? "",
            )
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
      } catch (e: any) {
        errors.push({
          file: f.name,
          error: e?.message ?? "Failed to read spreadsheet",
        });
      }
    }
    if (collected.length) setRecipes((prev) => [...collected, ...prev]);
    return { added: collected.length, errors, titles };
  }, []);

  const addRecipesFromImageOcr = useCallback(async (files: File[]) => {
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
        const instIdx = find(["instructions", "directions", "method", "steps"]);
        const getRange = (start: number, end: number) =>
          lines.slice(start + 1, end > start ? end : undefined).filter(Boolean);
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
    if (collected.length) setRecipes((prev) => [...collected, ...prev]);
    return { added: collected.length, errors, titles };
  }, []);

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
      if (nextRecipes.length) setRecipes((prev) => [...nextRecipes, ...prev]);
      setTimeout(linkImagesToRecipesByFilename, 0);

      return {
        addedRecipes: nextRecipes.length,
        addedImages: nextImages.length,
        errors,
        titles,
      };
    },
    [images, linkImagesToRecipesByFilename],
  );

  const updateRecipe = useCallback((id: string, patch: Partial<Recipe>) => {
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...patch,
              extra: { ...(r.extra ?? {}), ...(patch as any).extra },
            }
          : r,
      ),
    );
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
  const clearImages = useCallback(() => setImages([]), []);

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
    const pushImg = (label: string, hue: number, fileBase: string) => {
      const name = makeUnique(fileBase);
      const dataUrl = makeDataUrl(label, hue);
      next.push({
        id: uid(),
        name,
        dataUrl,
        createdAt: now,
        tags: ["demo", label.toLowerCase()],
        favorite: false,
        order: order++,
        type: "image/jpeg",
      });
    };
    pastryNames.forEach((lab, i) =>
      pushImg(lab, (i * 25) % 360, `${lab.toLowerCase()}-demo.jpg`),
    );
    otherNames.forEach((lab, i) =>
      pushImg(lab, (i * 60 + 180) % 360, `${lab.toLowerCase()}-demo.jpg`),
    );
    if (next.length) setImages((prev) => [...next, ...prev]);
    return next.length;
  }, [images]);

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
      addImages,
      restoreDemo,
      addRecipe,
      addRecipesFromJsonFiles,
      addRecipesFromDocxFiles,
      addRecipesFromHtmlFiles,
      addRecipesFromPdfFiles,
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
      deleteRecipe,
      restoreRecipe,
      purgeDeleted,
      destroyRecipe,
      addDemoImages,
      addStockFoodPhotos,
    }),
    [
      recipes,
      images,
      lookbooks,
      addImages,
      restoreDemo,
      addRecipe,
      addRecipesFromJsonFiles,
      addRecipesFromDocxFiles,
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
      deleteRecipe,
      restoreRecipe,
      purgeDeleted,
      destroyRecipe,
      addDemoImages,
      addStockFoodPhotos,
    ],
  );

  return <CTX.Provider value={value}>{children}</CTX.Provider>;
}

export function useAppData() {
  const ctx = useContext(CTX);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}

export default AppDataProvider;
