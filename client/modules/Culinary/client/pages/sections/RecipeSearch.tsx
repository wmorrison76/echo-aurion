import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import { updateRecipeInsights } from "@/lib/recipe-insights-storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Star,
  LayoutGrid,
  Rows,
  List,
  Eye,
  Trash2,
  RotateCcw,
  ExternalLink,
  Search,
  Save,
  X,
  Package,
  Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { axisOptions } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { useLanguage, useTranslation } from "@/context/LanguageContext";
import type { LanguageCode } from "@/i18n/config";
import type { RecipeCollection } from "@shared/server-notes";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { storeProcedure } from "@/lib/echo-procedures-service";
import { identifyProcedures } from "@/lib/procedure-extraction";
import { useEchoTraining } from "@/hooks/use-echo-training";
import {
  RecipeImportSelectionModal,
  type DetectedRecipe,
} from "@/components/RecipeImportSelectionModal";
import {
  storeBookImportInPinecone,
  type ImportedRecipeKnowledge,
} from "@/lib/pinecone-recipe-knowledge";
import { Zap } from "lucide-react";
import { CookbookBuilderDialog } from "@/components/CookbookBuilderDialog";
import { VirtualizedRecipeGrid } from "../../components/VirtualizedRecipeGrid";
import { RecipeCard } from "../../components/RecipeCard";

// Common English stop words to exclude from knowledge base
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "by",
  "with",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "shall",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "what",
  "which",
  "who",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "either",
  "neither",
  "some",
  "any",
  "no",
  "not",
  "as",
  "if",
  "than",
  "then",
  "because",
  "while",
  "during",
  "before",
  "after",
  "above",
  "below",
  "under",
  "over",
  "between",
  "among",
  "through",
  "within",
  "without",
  "about",
  "against",
  "along",
  "around",
  "since",
  "until",
  "unless",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "mine",
  "yours",
  "his",
  "hers",
  "ours",
  "theirs",
  "myself",
  "yourself",
  "himself",
  "herself",
  "itself",
  "ourselves",
  "yourselves",
  "themselves",
  "me",
  "him",
  "us",
  "am",
  "such",
  "so",
  "just",
  "also",
  "very",
  "not",
  "only",
  "own",
  "same",
  "more",
  "most",
  "other",
  "another",
  "any",
  "none",
  "nor",
  "up",
  "down",
  "out",
  "off",
  "up",
]);

export default function RecipeSearchSection() {
  const {
    recipes,
    searchRecipes,
    linkImagesToRecipesByFilename,
    clearRecipes,
    addRecipesFromJsonFiles,
    addRecipesFromDocxFiles,
    addRecipesFromHtmlFiles,
    addRecipesFromPdfFiles,
    addRecipesFromExcelFiles,
    addRecipesFromImageOcr,
    addFromZipArchive,
    toggleFavorite,
    rateRecipe,
    updateRecipeTags,
    updateRecipe,
    deleteRecipe,
    restoreRecipe,
    exportAllZip,
    addImages,
    destroyRecipe,
    purgeDeleted,
    collections,
    createCollection,
    updateCollection,
    deleteCollection,
    setCollectionRecipes,
  } = useAppData();
  const { trainWithRecipes, isTraining, showTrainingResult, trainingProgress, trainingResult, dismissTrainingResult } = useEchoTraining();

  // Wrapper to train Echo after recipes are imported
  const importRecipesWithEchoTraining = useCallback(
    async (
      importFn: () => Promise<{ added: number; titles?: string[] }>,
      bookName: string,
    ) => {
      const result = await importFn();

      // Train Echo if recipes were imported
      if (result.added > 0) {
        try {
          console.log(`🧠 Training Echo with ${result.added} imported recipes from "${bookName}"...`);
          // Get the newly added recipes from the app data
          const newRecipes = recipes
            .filter((r) => result.titles?.includes(r.title))
            .slice(-result.added)
            .map((r) => ({
              id: r.id,
              title: r.title,
              ingredients: r.ingredients || [],
              instructions: r.instructions || [],
              sourceBook: bookName,
              sourcePage: r.extra?.page || 0,
              cuisine: r.extra?.cuisine,
              course: r.extra?.course,
              difficulty: r.extra?.difficulty,
              prepTime: r.extra?.prepTime,
              cookTime: r.extra?.cookTime,
              yield: r.extra?.yield,
              tags: r.tags || [],
            }));

          if (newRecipes.length > 0) {
            const trainingResult = await trainWithRecipes(newRecipes, bookName);
            console.log(`✅ Echo training complete:`, trainingResult);
          }
        } catch (error) {
          console.warn(`⚠️ Echo training failed (will continue anyway):`, error);
        }
      }

      return result;
    },
    [recipes, trainWithRecipes],
  );

  const [q, setQ] = useState("");
  type Cat =
    | "all"
    | "recent"
    | "top"
    | "favorites"
    | "uncategorized"
    | "trash"
    | "global";
  const [cat, setCat] = useState<Cat>("all");
  const {
    language: appLanguage,
    setLanguage,
    options: languageOptions,
  } = useLanguage();
  const { t } = useTranslation();
  // Taxonomy filters
  const [fcuisine, setFCuisine] = useState<string>("");
  const [ftech, setFTech] = useState<string>("");
  const [fcourse, setFCourse] = useState<string>("");
  const [fdiet, setFDiet] = useState<string>("");

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  // Generate autocomplete suggestions from recipe titles
  const suggestions = useMemo(() => {
    if (!q.trim()) return [];
    const lowerQ = q.toLowerCase();
    return recipes
      .filter((r) => !r.deletedAt && r.title.toLowerCase().includes(lowerQ))
      .slice(0, 8)
      .map((r) => r.title)
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [q, recipes]);

  const results = useMemo(() => {
    const base = searchRecipes(q);
    const filterByTax = (arr: typeof base) =>
      arr.filter((r) => {
        const t: any = (r as any).extra?.taxonomy || {};
        if (fcuisine && t.cuisine !== fcuisine) return false;
        if (
          ftech &&
          !(Array.isArray(t.technique) && t.technique.includes(ftech))
        )
          return false;
        if (fcourse && !(Array.isArray(t.course) && t.course.includes(fcourse)))
          return false;
        if (fdiet && !(Array.isArray(t.diets) && t.diets.includes(fdiet)))
          return false;
        return true;
      });
    const byTitle = (arr: typeof base) =>
      arr
        .slice()
        .sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
        );
    const notDeleted = byTitle(filterByTax(base.filter((r) => !r.deletedAt)));
    switch (cat) {
      case "recent":
        return notDeleted; // still alphabetized per request
      case "top":
        return notDeleted; // keep alpha
      case "favorites":
        return byTitle(notDeleted.filter((r) => r.favorite));
      case "uncategorized":
        return byTitle(
          notDeleted.filter((r) => !r.tags || r.tags.length === 0),
        );
      case "global":
        return byTitle(notDeleted.filter((r) => (r as any).isGlobal === true));
      case "trash":
        return byTitle(filterByTax(base.filter((r) => !!r.deletedAt)));
      default:
        return notDeleted;
    }
  }, [q, searchRecipes, cat, fcuisine, ftech, fcourse, fdiet]);

  const [status, setStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<"cards" | "grid4" | "rows">("grid4");
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<{ file: string; error: string }[]>([]);
  const [url, setUrl] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [importedTitles, setImportedTitles] = useState<string[]>([]);
  // Book PDF import progress state
  const [bookPhase, setBookPhase] = useState<
    null | "reading" | "selecting" | "categorizing" | "importing" | "done"
  >(null);
  const [bookFile, setBookFile] = useState<string | null>(null);
  const [bookPage, setBookPage] = useState(0);
  const [bookTotal, setBookTotal] = useState(0);
  const [bookImported, setBookImported] = useState<number | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [toc, setToc] = useState<{ title: string; page: number }[] | null>(
    null,
  );
  const [tocChecked, setTocChecked] = useState<Record<string, boolean>>({});
  const pdfPendingRef = useRef<File | null>(null);
  const [bookDropActive, setBookDropActive] = useState(false);
  // Live scan state
  const [scanOpen, setScanOpen] = useState(false);
  const [scanPageNo, setScanPageNo] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);
  const [detectedOpen, setDetectedOpen] = useState(false);
  const [detected, setDetected] = useState<{ page: number; title: string }[]>(
    [],
  );
  const [scanPageTexts, setScanPageTexts] = useState<string[] | null>(null);
  const [scanCandidates, setScanCandidates] = useState<number[] | null>(null);
  const [scanBookName, setScanBookName] = useState<string | null>(null);
  const [ownershipConfirmOpen, setOwnershipConfirmOpen] = useState(false);
  const [pendingOwnershipFile, setPendingOwnershipFile] = useState<File | null>(
    null,
  );
  // Recipe import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importModalRecipes, setImportModalRecipes] = useState<
    DetectedRecipe[]
  >([]);
  const [importingBook, setImportingBook] = useState<string | null>(null);
  const [isImportingToKnowledge, setIsImportingToKnowledge] = useState(false);

  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const collectionNameRef = useRef<HTMLInputElement | null>(null);
  const [collectionDraftName, setCollectionDraftName] = useState("");
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null,
  );
  const [collectionToDelete, setCollectionToDelete] =
    useState<RecipeCollection | null>(null);
  const [cookbookBuilderOpen, setCookbookBuilderOpen] = useState(false);
  const [cookbookBuilderRecipes, setCookbookBuilderRecipes] = useState<
    (typeof recipes)[number][]
  >([]);
  const [cookbookBuilderTitle, setCookbookBuilderTitle] = useState("");

  const sortedCollections = useMemo(() => {
    const timestamp = (value: string | undefined) =>
      value ? Date.parse(value) || 0 : 0;
    return [...collections].sort(
      (a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt),
    );
  }, [collections]);

  const [searchParams, setSearchParams] = useSearchParams();

  const openCookbookBuilder = useCallback(() => {
    const selectedRecipes = recipes.filter((r) =>
      selectedRecipeIds.includes(r.id),
    );
    setCookbookBuilderRecipes(selectedRecipes);
    setCookbookBuilderTitle(collectionDraftName || "Recipe Collection");
    setCookbookBuilderOpen(true);
  }, [recipes, selectedRecipeIds, collectionDraftName]);

  const goToCookbookBuilder = useCallback(() => {
    openCookbookBuilder();
  }, [openCookbookBuilder]);

  const importBookPdf = async (file: File) => {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast({
        title: "PDF required",
        description: "Drop a cookbook PDF to use the library importer.",
        variant: "destructive",
      });
      return;
    }
    if (bookPhase && bookPhase !== "done") {
      toast({
        title: "Book import in progress",
        description:
          "Wait for the current PDF import to finish before adding another.",
      });
      return;
    }
    if (
      typeof window !== "undefined" &&
      !confirm(
        "Confirm you own/purchased this cookbook PDF for personal import?",
      )
    ) {
      return;
    }
    try {
      setBookFile(file.name);
      setBookPhase("reading");
      setStatus("Reading book PDF...");
      const ab = await file.arrayBuffer();
      pdfPendingRef.current = file;
      const pdfjs: any = await import(
        "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.mjs"
      );
      const workerSrc = "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.worker.mjs";
      if (pdfjs.GlobalWorkerOptions)
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      const doc = await pdfjs.getDocument({ data: ab }).promise;
      setBookTotal(doc.numPages);
      setScanOpen(true);
      setDetectedOpen(true);
      setDetected([]);
      setScanPageNo(0);
      setScanTotal(doc.numPages);
      let lines: string[] = [];
      const isLikelyIngredientList = (txt: string) => {
        const ls = txt
          .split(/\n/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 80);
        const qty =
          /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[a-zA-Z]+)?\b/;
        let c = 0;
        for (const L of ls) {
          if (qty.test(L) || /^[���\-*]\s+/.test(L)) c++;
        }
        return c >= 3;
      };
      const normalizeLineA = (s: string) => {
        let t = s.replace(/\s+/g, " ").trim();
        if (
          /^([A-Z]\s+){2,}[A-Z](?:\s+\d+)?[\s:]*$/.test(t) &&
          t.length <= 60
        ) {
          t = t.replace(/\s+/g, "");
        }
        return t;
      };
      const pageTexts: string[] = [];
      const candidates: number[] = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const tc = await page.getTextContent();
        const pageLines = (tc.items as any[])
          .map((i: any) => String(i.str))
          .filter(Boolean);
        lines.push(...pageLines);
        lines.push("");
        const t = pageLines.join("\n");
        pageTexts.push(t);
        setBookPage(p);
        setScanPageNo(p);
        const hasIng = /\bingredients?\b/i.test(t) || isLikelyIngredientList(t);
        if (hasIng) {
          candidates.push(p);
          let guess = "";
          const top = pageLines
            .map(normalizeLineA)
            .filter(Boolean)
            .slice(0, 10);
          for (const L of top) {
            if (
              /^[A-Z][A-Za-z0-9\-'\s]{2,80}$/.test(L) ||
              /^([A-Z]\s+){2,}[A-Z][\s:]*$/.test(L)
            ) {
              guess = L.replace(/\s+/g, " ").trim();
              break;
            }
          }
          // Filter out OCR artifacts and common non-recipe text
          const ocrFilterPatterns = [
            /^see\b/i,
            /(flexipan|inch|inches|cm|diameter)\b/i,
            /^scan to download/i,
            /^visit us online/i,
            /^qr code/i,
            /^(page|contents|index|glossary|appendix|copyright|isbn)/i,
          ];

          for (const pattern of ocrFilterPatterns) {
            if (pattern.test(guess)) {
              guess = "";
              break;
            }
          }

          // Only add meaningful content (at least 3 characters)
          if (guess && guess.length >= 3) {
            setDetected((d) => [
              ...d,
              { page: p, title: guess },
            ]);
          }
        }
      }
      try {
        const keepTop = (obj: Record<string, number>, n: number) =>
          Object.fromEntries(
            Object.entries(obj)
              .sort((a, b) => b[1] - a[1])
              .slice(0, n),
          );
        const words: Record<string, number> = {},
          bigrams: Record<string, number> = {};
        const textAll = pageTexts
          .join("\n")
          .toLowerCase()
          .replace(/[^a-z\s]/g, " ");
        const arr = textAll
          .split(/\s+/)
          .filter((w) => w.length >= 3 && w.length <= 24);
        for (let i = 0; i < arr.length; i++) {
          const w = arr[i];
          words[w] = (words[w] || 0) + 1;
          if (i < arr.length - 1) {
            const g = `${arr[i]} ${arr[i + 1]}`;
            if (g.length >= 5 && g.length <= 40)
              bigrams[g] = (bigrams[g] || 0) + 1;
          }
        }
        const raw = localStorage.getItem("kb:cook") || "{}";
        const kb = JSON.parse(raw || "{}");
        kb.terms = keepTop({ ...kb.terms, ...words }, 400);
        kb.bigrams = keepTop({ ...kb.bigrams, ...bigrams }, 600);
        kb.books = Array.from(
          new Set([...(kb.books || []), file.name.replace(/\.[^.]+$/, "")]),
        );
        localStorage.setItem("kb:cook", JSON.stringify(kb));
      } catch {}
      setScanOpen(false);
      setBookPhase("selecting");
      setScanPageTexts(pageTexts);
      setScanCandidates(candidates);
      setScanBookName(file.name.replace(/\.[^.]+$/, ""));
      if (candidates.length >= 5) {
        setStatus(
          `Detected ${candidates.length} recipe candidates. Click "Import detected" to add them.`,
        );
        return;
      }
      const normLine = (s: string) => {
        let t = s.replace(/\s+/g, " ").trim();
        if (
          /^([A-Z]\s+){2,}[A-Z](?:\s+\d+)?[\s:]*$/.test(t) &&
          t.length <= 60
        ) {
          t = t.replace(/\s+/g, "");
        }
        return t;
      };
      const norm = lines.map(normLine);
      let tocEntries = norm
        .map((s) => {
          const tests = [
            /^(.{3,120}?)(?:[\.·•\s]{2,})(\d{1,4})$/,
            /^(.{3,120}?)\s{3,}(\d{1,4})$/,
            /^(.{3,120}?)\s+[-–—]\s*(\d{1,4})$/,
          ];
          let m: RegExpMatchArray | null = null;
          for (const re of tests) {
            m = s.match(re);
            if (m) break;
          }
          if (!m) return null;
          const title = m[1].trim();
          const page = parseInt(m[2], 10);
          const bad =
            /^(?:contents|index|appendix|recipes?|chapter|table of contents|fig(?:\.|ures?)?(?:\s*\d+)?|plates?(?:\s*\d+)?|illustrations?(?:\s*\d+)?|photos?(?:\s*\d+)?|tables?(?:\s*\d+)?|maps?(?:\s*\d+)?|yield\b|to convert\b|see\b)/i;
          if (!title || bad.test(title)) return null;
          if (/(flexipan|inch|inches|cm|diameter)\b/i.test(title)) return null;
          return { title, page };
        })
        .filter(Boolean) as { title: string; page: number }[];
      const seen: Record<number, boolean> = {};
      tocEntries = tocEntries.filter(
        (e) => !seen[e.page] && (seen[e.page] = true),
      );
      if (tocEntries.length >= 5) {
        setToc(tocEntries);
        const checked: Record<string, boolean> = {};
        tocEntries.forEach((x) => (checked[x.title] = true));
        setTocChecked(checked);
        setTocOpen(true);
        setStatus("Select recipes to import");
        return;
      }
      const items: any[] = [];
      let i = 0;
      const book = file.name.replace(/\.[^.]+$/, "");
      const isTitle = (s: string) =>
        s &&
        s.length < 70 &&
        /[A-Za-z]/.test(s) &&
        (s === s.toUpperCase() || /^[A-Z][^.!?]{2,}$/.test(s));
      while (i < norm.length) {
        while (i < norm.length && !/ingredients?/i.test(norm[i])) i++;
        if (i >= norm.length) break;
        let tIdx = Math.max(0, i - 5);
        let title = "";
        for (let k = i - 1; k >= tIdx; k--) {
          if (isTitle(norm[k])) {
            title = norm[k];
            break;
          }
        }
        const ings: string[] = [];
        i++;
        while (i < norm.length && !/ingredients?/i.test(norm[i])) {
          const s = norm[i];
          if (/^(instructions|directions|method)/i.test(s)) break;
          if (s) ings.push(s);
          i++;
        }
        let ins: string[] = [];
        while (i < norm.length && !/ingredients?/i.test(norm[i])) {
          const s = norm[i];
          if (s) ins.push(s);
          i++;
        }
        if (title && (ings.length || ins.length))
          items.push({
            title,
            ingredients: ings,
            instructions: ins,
            tags: [book],
            extra: { book, source: "pdf-auto" },
          });
      }
      setBookPhase("importing");
      if (items.length) {
        const blob = new Blob([JSON.stringify(items)], {
          type: "application/json",
        });
        const jsonFile = new File([blob], `${book}.json`, {
          type: "application/json",
        });
        const { added } = await addRecipesFromJsonFiles([jsonFile]);
        setBookImported(added);
        setStatus(`Imported ${added} recipes from book.`);
        setBookPhase("done");
      } else {
        setStatus("Could not detect recipes in PDF");
        setBookPhase(null);
      }
    } catch (e: any) {
      setStatus(`Failed: ${e?.message || "error"}`);
      setBookPhase(null);
    }
  };

  const handleImportRecipesToKnowledge = async (
    selectedRecipes: DetectedRecipe[],
  ) => {
    if (!importingBook) return;

    setIsImportingToKnowledge(true);
    try {
      // Convert detected recipes to knowledge base format
      const kbRecipes: ImportedRecipeKnowledge[] = selectedRecipes.map(
        (recipe) => ({
          recipeId: `${importingBook}-p${recipe.page}-${Date.now()}`,
          title: recipe.title || `Recipe from page ${recipe.page}`,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          yield: recipe.yield,
          difficulty: recipe.difficulty,
          sourceBook: importingBook,
          sourcePage: recipe.page,
          importedAt: new Date().toISOString(),
          tags: [
            "imported",
            "cookbook",
            recipe.difficulty ? recipe.difficulty.toLowerCase() : "medium",
          ],
        }),
      );

      // Store in Pinecone for Echo knowledge base
      const result = await storeBookImportInPinecone(kbRecipes, importingBook);

      toast({
        title: "Knowledge Base Updated",
        description: `${result.success} recipe${result.success !== 1 ? "s" : ""} stored for Echo AI. Echo can now recall these recipes instantly.`,
        variant: "default",
      });

      // Reset state
      setImportModalOpen(false);
      setImportModalRecipes([]);
      setImportingBook(null);
    } catch (error) {
      console.error("Failed to import recipes to knowledge base:", error);
      toast({
        title: "Import Failed",
        description: "Could not store recipes in knowledge base. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsImportingToKnowledge(false);
    }
  };

  const onFiles = async (files: File[]) => {
    const list = files.slice(0, 100);
    const jsonFiles = list.filter(
      (f) => f.type.includes("json") || f.name.toLowerCase().endsWith(".json"),
    );
    const docxFiles = list.filter((f) =>
      f.name.toLowerCase().endsWith(".docx"),
    );
    const htmlFiles = list.filter((f) => /(\.html?|\.htm)$/i.test(f.name));
    const pdfFiles = list.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    const xlsFiles = list.filter((f) => /(\.xlsx|\.xls|\.csv)$/i.test(f.name));
    const imageFiles = list.filter(
      (f) =>
        f.type.startsWith("image/") ||
        /(png|jpe?g|webp|heic|heif)$/i.test(f.name),
    );
    const zipFiles = list.filter(
      (f) => f.type.includes("zip") || f.name.toLowerCase().endsWith(".zip"),
    );

    const steps =
      jsonFiles.length +
      docxFiles.length +
      htmlFiles.length +
      pdfFiles.length +
      xlsFiles.length +
      imageFiles.length +
      zipFiles.length;
    setProcessed(0);
    setTotal(steps);
    setImportedTitles([]);
    setErrors([]);
    setStatus("Processing...");

    const collectedTitles: string[] = [];
    const rememberTitles = (titles?: string[]) => {
      if (titles?.length) {
        collectedTitles.push(...titles);
        setImportedTitles((t) => [...t, ...titles]);
      }
    };

    let importedCount = 0;
    const allErrors: { file: string; error: string }[] = [];

    for (const f of jsonFiles) {
      const { added, errors, titles } = await addRecipesFromJsonFiles([f]);
      importedCount += added;
      allErrors.push(...errors);
      rememberTitles(titles);
      setProcessed((p) => p + 1);
    }
    for (const f of docxFiles) {
      const { added, errors, titles } = await addRecipesFromDocxFiles([f]);
      importedCount += added;
      allErrors.push(...errors);
      rememberTitles(titles);
      setProcessed((p) => p + 1);
    }
    for (const f of htmlFiles) {
      const { added, errors, titles } = await addRecipesFromHtmlFiles([f]);
      importedCount += added;
      allErrors.push(...errors);
      rememberTitles(titles);
      setProcessed((p) => p + 1);
    }
    for (const f of pdfFiles) {
      const { added, errors, titles } = await addRecipesFromPdfFiles([f]);
      importedCount += added;
      allErrors.push(...errors);
      rememberTitles(titles);
      setProcessed((p) => p + 1);
    }
    for (const f of xlsFiles) {
      const { added, errors, titles } = await addRecipesFromExcelFiles([f]);
      importedCount += added;
      allErrors.push(...errors);
      rememberTitles(titles);
      setProcessed((p) => p + 1);
    }
    for (const f of imageFiles) {
      const { added, errors, titles } = await addRecipesFromImageOcr([f]);
      importedCount += added;
      allErrors.push(...errors);
      rememberTitles(titles);
      setProcessed((p) => p + 1);
    }
    for (const z of zipFiles) {
      const res = await addFromZipArchive(z);
      importedCount += res.addedRecipes;
      for (const e of res.errors)
        allErrors.push({ file: e.entry, error: e.error });
      rememberTitles(res.titles);
      setProcessed((p) => p + 1);
    }

    setErrors(allErrors);
    const summary = `Imported ${importedCount} recipe${importedCount === 1 ? "" : "s"}.`;
    const issueSummary =
      allErrors.length > 0
        ? `${allErrors.length} item${allErrors.length === 1 ? "" : "s"} had issues.`
        : "No issues detected.";
    const titleSummary =
      collectedTitles.length > 0
        ? `Added: ${collectedTitles
            .slice(0, 4)
            .join(", ")}${collectedTitles.length > 4 ? " …" : ""}`
        : "";
    const statusMessage = [summary, issueSummary].join(" ");
    setStatus(
      titleSummary ? `${statusMessage} ${titleSummary}` : statusMessage,
    );

    // Train Echo with all imported recipes
    if (importedCount > 0 && collectedTitles.length > 0) {
      try {
        console.log(`🧠 Training Echo with ${collectedTitles.length} imported recipes...`);
        const newRecipes = recipes
          .filter((r) => collectedTitles.includes(r.title))
          .slice(-collectedTitles.length)
          .map((r) => ({
            id: r.id,
            title: r.title,
            ingredients: r.ingredients || [],
            instructions: r.instructions || [],
            sourceBook: r.extra?.sourceFile || r.sourceFile || "Import",
            sourcePage: r.extra?.page || 0,
            cuisine: r.extra?.cuisine,
            course: r.extra?.course,
            difficulty: r.extra?.difficulty,
            prepTime: r.extra?.prepTime,
            cookTime: r.extra?.cookTime,
            yield: r.extra?.yield,
            tags: r.tags || [],
          }));

        if (newRecipes.length > 0) {
          const trainingResult = await trainWithRecipes(newRecipes, "Bulk Import");
          console.log(`✅ Echo training complete:`, trainingResult);
        }
      } catch (error) {
        console.warn(`⚠️ Echo training failed (will continue anyway):`, error);
      }
    }

    toast({
      title: "Recipe import complete",
      description: [summary, issueSummary, titleSummary]
        .filter(Boolean)
        .join(" "),
    });
    setProcessed(0);
    setTotal(0);
  };

  const importFromUrl = async () => {
    if (!url) return;
    try {
      setLoadingUrl(true);
      setStatus("Downloading...");
      const resp = await fetch(url);
      const contentType = resp.headers.get("content-type") || "";
      if (
        /json|javascript/.test(contentType) ||
        url.toLowerCase().endsWith(".json")
      ) {
        try {
          const data = await resp.json();
          const blob = new Blob([JSON.stringify(data)], {
            type: "application/json",
          });
          const name = (url.split("/").pop() || "import.json").replace(
            /\?.*$/,
            "",
          );
          const file = new File([blob], name, { type: "application/json" });
          const {
            added,
            errors: errs,
            titles,
          } = await importRecipesWithEchoTraining(
            () => addRecipesFromJsonFiles([file]),
            file.name.replace(/\.[^.]+$/, ""),
          );
          setErrors(errs);
          setStatus(
            `Imported ${added} recipe(s) from JSON${titles.length ? `: ${titles.slice(0, 5).join(", ")}${titles.length > 5 ? " …" : ""}` : ""}.`,
          );
          return;
        } catch {}
      }
      const blob = await resp.blob();
      const name = (url.split("/").pop() || "import.zip").replace(/\?.*$/, "");
      const file = new File([blob], name, {
        type: blob.type || "application/zip",
      });
      const res = await addFromZipArchive(file);
      setErrors(res.errors.map((e) => ({ file: e.entry, error: e.error })));
      setStatus(
        `Imported ${res.addedRecipes} recipe(s) and ${res.addedImages} image(s) from ZIP.`,
      );
    } catch (e: any) {
      setStatus(`Failed to import from URL: ${e?.message ?? "error"}`);
    } finally {
      setLoadingUrl(false);
    }
  };

  const [preview, setPreview] = useState<
    ReturnType<typeof useAppData>["recipes"][number] | null
  >(null);
  const inTrashView = cat === "trash";

  const isCollectionDraftActive =
    Boolean(activeCollectionId) ||
    collectionDraftName.trim().length > 0 ||
    selectedRecipeIds.length > 0;
  const isCollectionSelectionEnabled = isCollectionDraftActive && !inTrashView;

  useEffect(() => {
    if (!selectedRecipeIds.length) return;
    setSelectedRecipeIds((prev) =>
      prev.filter((id) => recipes.some((recipe) => recipe.id === id)),
    );
  }, [recipes, selectedRecipeIds.length]);

  useEffect(() => {
    updateRecipeInsights(recipes);
  }, [recipes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "serverNotes:presetSelection";
    if (!selectedRecipeIds.length) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        ids: selectedRecipeIds,
        savedAt: Date.now(),
      }),
    );
  }, [selectedRecipeIds]);

  const resetCollectionDraft = useCallback(() => {
    setCollectionDraftName("");
    setSelectedRecipeIds([]);
    setActiveCollectionId(null);
  }, []);

  const toggleRecipeSelection = useCallback(
    (recipeId: string) => {
      if (!isCollectionSelectionEnabled) return;
      setSelectedRecipeIds((prev) =>
        prev.includes(recipeId)
          ? prev.filter((id) => id !== recipeId)
          : [...prev, recipeId],
      );
    },
    [isCollectionSelectionEnabled],
  );

  const toggleRecipeGlobal = useCallback(
    (recipeId: string, isGlobal: boolean) => {
      updateRecipe(recipeId, { isGlobal });
      toast({
        title: isGlobal ? "Recipe shared globally" : "Recipe made private",
        description: isGlobal
          ? "This recipe is now available to all chefs in your organization."
          : "This recipe is now private to your location.",
      });
    },
    [updateRecipe, toast],
  );

  const handleEditCollection = useCallback(
    (collection: RecipeCollection) => {
      setActiveCollectionId(collection.id);
      setCollectionDraftName(collection.name);
      setSelectedRecipeIds(
        collection.recipeIds.filter((id) =>
          recipes.some((recipe) => recipe.id === id),
        ),
      );
      requestAnimationFrame(() => {
        collectionNameRef.current?.focus();
      });
    },
    [recipes],
  );

  const handleSaveCollection = useCallback(() => {
    const trimmedName = collectionDraftName.trim();
    if (!trimmedName) {
      toast({
        title: "Name required",
        description: "Add a name before saving the collection.",
        variant: "destructive",
      });
      return;
    }
    if (selectedRecipeIds.length === 0) {
      toast({
        title: "No recipes selected",
        description: "Select at least one recipe to include.",
        variant: "destructive",
      });
      return;
    }
    if (activeCollectionId) {
      updateCollection(activeCollectionId, { name: trimmedName });
      setCollectionRecipes(activeCollectionId, selectedRecipeIds);
      toast({
        title: "Collection updated",
        description: "Changes have been saved.",
      });
    } else {
      createCollection({
        name: trimmedName,
        season: "All",
        year: new Date().getFullYear(),
        version: 1,
        recipeIds: selectedRecipeIds,
      });
      toast({
        title: "Collection created",
        description: `${selectedRecipeIds.length} recipe${selectedRecipeIds.length === 1 ? "" : "s"} saved to "${trimmedName}".`,
      });
    }
    resetCollectionDraft();
  }, [
    activeCollectionId,
    collectionDraftName,
    createCollection,
    resetCollectionDraft,
    selectedRecipeIds,
    setCollectionRecipes,
    toast,
    updateCollection,
  ]);

  const handleDeleteCollection = useCallback(() => {
    if (!collectionToDelete) return;
    deleteCollection(collectionToDelete.id);
    if (collectionToDelete.id === activeCollectionId) {
      resetCollectionDraft();
    }
    toast({
      title: "Collection deleted",
      description: `"${collectionToDelete.name}" removed.`,
    });
    setCollectionToDelete(null);
  }, [
    activeCollectionId,
    collectionToDelete,
    deleteCollection,
    resetCollectionDraft,
    toast,
  ]);

  return (
    <div
      className="mx-auto w-full max-w-[1400px] space-y-3 px-4 py-3 sm:px-6 lg:px-8"
      data-echo-key="page:recipes:search"
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
            {(
              [
                "all",
                "recent",
                "top",
                "favorites",
                "uncategorized",
                "global",
                "trash",
              ] as Cat[]
            ).map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-2 py-0.5 rounded-md text-xs ${cat === c ? "bg-background shadow" : "text-foreground/80"}`}
              >
                {t(
                  `recipes.filter.${c}`,
                  c.replace(/^[a-z]/, (s) => s.toUpperCase()),
                )}
              </button>
            ))}
          </div>
          {recipes.length > 0 && (
            <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
              <button
                onClick={() => setMode("grid4")}
                className={`p-1 rounded text-sm ${mode === "grid4" ? "bg-background shadow" : "text-foreground/70 hover:text-foreground"}`}
                title="Compact grid view"
                aria-label="Compact grid view"
              >
                <Rows size={16} />
              </button>
              <button
                onClick={() => setMode("rows")}
                className={`p-1 rounded text-sm ${mode === "rows" ? "bg-background shadow" : "text-foreground/70 hover:text-foreground"}`}
                title="List view"
                aria-label="List view"
              >
                <List size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAllZip(appLanguage)}
          >
            {t("recipes.exportAll", "Export all (ZIP)")}
          </Button>
          {inTrashView && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (
                  confirm(
                    t(
                      "recipes.deleteAllTrash.confirm",
                      "Delete all items in Trash permanently? This cannot be undone.",
                    ),
                  )
                )
                  purgeDeleted();
              }}
            >
              {t("recipes.deleteAll", "Delete all")}
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => clearRecipes()}
          >
            {t("recipes.clear", "Clear")}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Dropzone
          className="glow flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-background/90 p-4 text-center shadow-sm transition-all hover:border-primary/60 hover:shadow-md dark:bg-zinc-900/70"
          accept=".json,application/json,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.html,.htm,text/html,.pdf,application/pdf,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel,.csv,text/csv,application/zip,application/x-zip-compressed,.zip,image/*"
          multiple
          onFiles={onFiles}
          busy={
            (total > 0 && processed < total) ||
            bookPhase === "reading" ||
            bookPhase === "importing"
          }
          progress={
            total > 0
              ? processed / Math.max(total, 1)
              : bookPhase === "reading"
                ? bookTotal
                  ? bookPage / Math.max(bookTotal, 1)
                  : 0
                : undefined
          }
        >
          <div className="flex flex-col items-center gap-1">
            <div className="text-lg font-semibold uppercase tracking-[0.4em] text-primary">
              {t("recipes.recipeDrop.title", "Recipe Drop")}
            </div>
            <div className="text-xs font-medium text-foreground">
              {t(
                "recipes.recipeDrop.description",
                "Drag or upload recipes and images (Word, PDF, Excel, HTML, JSON, ZIP).",
              )}
            </div>
          </div>
        </Dropzone>
        <div className="flex flex-col space-y-2 rounded-xl border border-primary/30 bg-background/90 p-3 shadow-sm dark:bg-zinc-900/70">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[220px] flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  {t("recipes.menuCollection", "Menu Collection")}
                </div>
                {activeCollectionId && (
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                    {t("recipes.editing", "Editing")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-background px-3 py-1.5 shadow-inner dark:bg-zinc-950/60">
                <input
                  ref={collectionNameRef}
                  value={collectionDraftName}
                  onChange={(event) =>
                    setCollectionDraftName(event.target.value)
                  }
                  placeholder={t(
                    "recipes.collectionName.placeholder",
                    "Collection Name",
                  )}
                  className="flex-1 bg-transparent text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  list=""
                  type="text"
                  data-fuzzy="off"
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => searchInputRef.current?.focus()}
                title="Search recipes"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={handleSaveCollection}
                disabled={
                  collectionDraftName.trim().length === 0 ||
                  selectedRecipeIds.length === 0
                }
                title="Save collection"
              >
                <Save className="h-4 w-4" />
              </Button>
              {isCollectionDraftActive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={resetCollectionDraft}
                  title="Clear"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {isCollectionDraftActive && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div>
                {selectedRecipeIds.length} recipe
                {selectedRecipeIds.length === 1 ? "" : "s"} selected
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRecipeIds([])}
                  disabled={selectedRecipeIds.length === 0}
                >
                  Clear picks
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => searchInputRef.current?.focus()}
                >
                  Search catalog
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="font-semibold"
                  onClick={goToCookbookBuilder}
                  disabled={selectedRecipeIds.length === 0}
                >
                  Build recipe book
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Previous Collections
            </div>
            {sortedCollections.length === 0 ? (
              <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                No collections yet. Create one to save curated menus.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedCollections.map((collection) => {
                  const isActive = activeCollectionId === collection.id;
                  const recipeCount = collection.recipeIds.length;
                  return (
                    <div
                      key={collection.id}
                      className={cn(
                        "rounded-lg border px-3 py-2 transition-colors",
                        isActive
                          ? "border-primary bg-primary/5 dark:bg-primary/15"
                          : "border-border/60 bg-background/80 dark:bg-zinc-950/70",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {collection.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {collection.season} • {collection.year} • v
                            {collection.version} • {recipeCount} recipe
                            {recipeCount === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const collectionRecipes = recipes.filter((r) =>
                                collection.recipeIds?.includes(r.id),
                              );
                              setCookbookBuilderRecipes(collectionRecipes);
                              setCookbookBuilderTitle(collection.name);
                              setCookbookBuilderOpen(true);
                            }}
                            title="Build package"
                          >
                            <Package className="mr-1 h-4 w-4" />
                            Build
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditCollection(collection)}
                            title="Edit collection"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setCollectionToDelete(collection)}
                            title="Delete collection"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div
          className={cn(
            "rounded-xl border bg-background/85 p-3 shadow-sm transition-colors dark:bg-zinc-900/70 lg:col-span-2",
            bookDropActive &&
              "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setBookDropActive(true);
          }}
          onDragLeave={() => setBookDropActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setBookDropActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
              void importBookPdf(file);
            }
          }}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Library (Book PDF) Import
            </div>
            <div className="flex items-center gap-2">
              {detected && detected.length > 0 && (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold text-xs shadow-lg"
                  onClick={() => {
                    setImportModalRecipes(detected as DetectedRecipe[]);
                    setImportingBook(scanBookName || "Unknown Book");
                    setImportModalOpen(true);
                  }}
                  title="[DEV] Import detected recipes to Echo knowledge base"
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Train Echo
                </Button>
              )}
              <div className="text-xs text-muted-foreground">
                {bookPhase ? (
                  <div className="flex items-center gap-2">
                    <span>
                      {bookPhase === "reading"
                        ? "Reading file"
                        : bookPhase === "selecting"
                          ? "Selecting recipes"
                          : bookPhase === "categorizing"
                            ? "Categorizing recipes"
                            : bookPhase === "importing"
                              ? "Importing"
                              : "Done"}
                    </span>
                    {bookPhase === "reading" && (
                      <span>
                        {bookPage}/{bookTotal}
                      </span>
                    )}
                  </div>
                ) : (
                  <>Imported: {recipes.length}</>
                )}
              </div>
            </div>
          </div>
          <input
            type="file"
            accept="application/pdf"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (
                !confirm(
                  "Confirm you own/purchased this cookbook PDF for personal import?",
                )
              ) {
                (e.target as HTMLInputElement).value = "";
                return;
              }
              try {
                setBookFile(f.name);
                setBookPhase("reading");
                setStatus("Reading book PDF...");
                const ab = await f.arrayBuffer();
                pdfPendingRef.current = f;
                const pdfjs: any = await import(
                  "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.mjs"
                );
                const workerSrc =
                  "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.worker.mjs";
                if (pdfjs.GlobalWorkerOptions)
                  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
                const doc = await pdfjs.getDocument({ data: ab }).promise;
                setBookTotal(doc.numPages);
                // live scan popups
                setScanOpen(true);
                setDetectedOpen(true);
                setDetected([]);
                setScanPageNo(0);
                setScanTotal(doc.numPages);
                let lines: string[] = [];
                const isLikelyIngredientList = (txt: string) => {
                  const ls = txt
                    .split(/\n/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 80);
                  const qty =
                    /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔���⅜⅝⅞])(?:\s*[a-zA-Z]+)?\b/;
                  let c = 0;
                  for (const L of ls) {
                    if (qty.test(L) || /^[���\-*]\s+/.test(L)) c++;
                  }
                  return c >= 3;
                };
                const normalizeLineA = (s: string) => {
                  let t = s.replace(/\s+/g, " ").trim();
                  if (
                    /^([A-Z]\s+){2,}[A-Z](?:\s+\d+)?[\s:]*$/.test(t) &&
                    t.length <= 60
                  ) {
                    t = t.replace(/\s+/g, "");
                  }
                  return t;
                };
                const pageTexts: string[] = [];
                const candidates: number[] = [];
                for (let p = 1; p <= doc.numPages; p++) {
                  const page = await doc.getPage(p);
                  const tc = await page.getTextContent();
                  const pageLines = (tc.items as any[])
                    .map((i: any) => String(i.str))
                    .filter(Boolean);
                  lines.push(...pageLines);
                  lines.push("");
                  const t = pageLines.join("\n");
                  pageTexts.push(t);
                  setBookPage(p);
                  setScanPageNo(p);
                  // Skip obvious TOC/chapter pages
                  const isTocPage = /^(table\s+of\s+)?contents?|chapter\s+\d+|index|appendix|preface|foreword|introduction/im.test(t.slice(0, 500));
                  const hasIng =
                    !isTocPage && (/\bingredients?\b/i.test(t) || isLikelyIngredientList(t));
                  if (hasIng) {
                    candidates.push(p);
                    let guess = "";
                    const top = pageLines
                      .map(normalizeLineA)
                      .filter(Boolean)
                      .slice(0, 10);
                    for (const L of top) {
                      if (
                        /^[A-Z][A-Za-z0-9\-\'\s]{2,80}$/.test(L) ||
                        /^([A-Z]\s+){2,}[A-Z][\s:]*$/.test(L)
                      ) {
                        guess = L.replace(/\s+/g, " ").trim();
                        break;
                      }
                    }
                    // Filter out OCR artifacts and common non-recipe text
                    const ocrFilterPatterns = [
                      /^see\b/i,
                      /(flexipan|inch|inches|cm|diameter)\b/i,
                      /^scan to download/i,
                      /^visit us online/i,
                      /^qr code/i,
                      /^(page|contents|index|glossary|appendix|copyright|isbn|preface|chapter|questions|using|references|introduction|about|forward|foreword)\b/i,
                      /^recipe\s+contents\b/i,
                      /^(the\s+)?(baking|cooking|culinary|pastry)\s+(profession|basics|fundamentals)/i,
                      /^(step|section|unit|lesson|part)\s+\d+/i,
                      /^(?:table\s+of|quick\s+reference|formula|metric|conversion)/i,
                      /^(?:baker['']?s\s+)?(?:percentage|ratio|temperature)/i,
                      /\b(?:review|quiz|assignment|worksheet)\b/i,
                    ];

                    for (const pattern of ocrFilterPatterns) {
                      if (pattern.test(guess)) {
                        guess = "";
                        break;
                      }
                    }

                    // Only add meaningful content (at least 3 characters)
                    if (guess && guess.length >= 3) {
                      setDetected((d) => [
                        ...d,
                        { page: p, title: guess },
                      ]);
                    }
                  }
                }
                // update knowledge store
                try {
                  const keepTop = (obj: Record<string, number>, n: number) =>
                    Object.fromEntries(
                      Object.entries(obj)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, n),
                    );
                  const words: Record<string, number> = {},
                    bigrams: Record<string, number> = {};
                  const textAll = pageTexts
                    .join("\n")
                    .toLowerCase()
                    .replace(/[^a-z\s]/g, " ");
                  const arr = textAll
                    .split(/\s+/)
                    .filter((w) => w.length >= 3 && w.length <= 24);
                  for (let i = 0; i < arr.length; i++) {
                    const w = arr[i];
                    words[w] = (words[w] || 0) + 1;
                    if (i < arr.length - 1) {
                      const g = `${arr[i]} ${arr[i + 1]}`;
                      if (g.length >= 5 && g.length <= 40)
                        bigrams[g] = (bigrams[g] || 0) + 1;
                    }
                  }
                  const raw = localStorage.getItem("kb:cook") || "{}";
                  const kb = JSON.parse(raw || "{}");
                  kb.terms = keepTop({ ...kb.terms, ...words }, 400);
                  kb.bigrams = keepTop({ ...kb.bigrams, ...bigrams }, 600);
                  kb.books = Array.from(
                    new Set([
                      ...(kb.books || []),
                      f.name.replace(/\.[^.]+$/, ""),
                    ]),
                  );
                  localStorage.setItem("kb:cook", JSON.stringify(kb));
                } catch {}
                setScanOpen(false);
                setBookPhase("selecting");
                setScanPageTexts(pageTexts);
                setScanCandidates(candidates);
                setScanBookName(f.name.replace(/\.[^.]+$/, ""));
                if (candidates.length >= 5) {
                  setStatus(
                    `Detected ${candidates.length} recipe candidates. Click "Import detected" to add them.`,
                  );
                  return;
                }
                const normLine = (s: string) => {
                  let t = s.replace(/\s+/g, " ").trim();
                  if (
                    /^([A-Z]\s+){2,}[A-Z](?:\s+\d+)?[\s:]*$/.test(t) &&
                    t.length <= 60
                  ) {
                    t = t.replace(/\s+/g, "");
                  }
                  return t;
                };
                const norm = lines.map(normLine);
                let tocEntries = norm
                  .map((s) => {
                    const tests = [
                      /^(.{3,120}?)(?:[\.·•\s]{2,})(\d{1,4})$/, // dot leaders or many spaces then page
                      /^(.{3,120}?)\s{3,}(\d{1,4})$/, // right-aligned page with spaces
                      /^(.{3,120}?)\s+[-–—]\s*(\d{1,4})$/, // dash then page
                    ];
                    let m: RegExpMatchArray | null = null;
                    for (const re of tests) {
                      m = s.match(re);
                      if (m) break;
                    }
                    if (!m) return null;
                    const title = m[1].trim();
                    const page = parseInt(m[2], 10);
                    const bad =
                      /^(?:contents|index|appendix|recipes?|chapter|table of contents|fig(?:\.|ures?)?(?:\s*\d+)?|plates?(?:\s*\d+)?|illustrations?(?:\s*\d+)?|photos?(?:\s*\d+)?|tables?(?:\s*\d+)?|maps?(?:\s*\d+)?|yield\b|to convert\b|see\b)/i;
                    if (!title || bad.test(title)) return null;
                    if (/(flexipan|inch|inches|cm|diameter)\b/i.test(title))
                      return null;
                    return { title, page };
                  })
                  .filter(Boolean) as { title: string; page: number }[];
                // de-duplicate by page number
                const seen: Record<number, boolean> = {};
                tocEntries = tocEntries.filter(
                  (e) => !seen[e.page] && (seen[e.page] = true),
                );
                if (tocEntries.length >= 5) {
                  setToc(tocEntries);
                  const checked: Record<string, boolean> = {};
                  tocEntries.forEach((x) => (checked[x.title] = true));
                  setTocChecked(checked);
                  setTocOpen(true);
                  setStatus("Select recipes to import");
                  return;
                }
                const items: any[] = [];
                let i = 0;
                const book = f.name.replace(/\.[^.]+$/, "");
                const isTitle = (s: string) =>
                  s &&
                  s.length < 70 &&
                  /[A-Za-z]/.test(s) &&
                  (s === s.toUpperCase() || /^[A-Z][^.!?]{2,}$/.test(s));
                while (i < norm.length) {
                  while (i < norm.length && !/ingredients?/i.test(norm[i])) i++;
                  if (i >= norm.length) break;
                  let tIdx = Math.max(0, i - 5);
                  let title = "";
                  for (let k = i - 1; k >= tIdx; k--) {
                    if (isTitle(norm[k])) {
                      title = norm[k];
                      break;
                    }
                  }
                  const ings: string[] = [];
                  i++;
                  while (i < norm.length && !/ingredients?/i.test(norm[i])) {
                    const s = norm[i];
                    if (/^(instructions|directions|method)/i.test(s)) break;
                    if (s) ings.push(s);
                    i++;
                  }
                  let ins: string[] = [];
                  while (i < norm.length && !/ingredients?/i.test(norm[i])) {
                    const s = norm[i];
                    if (s) ins.push(s);
                    i++;
                  }
                  if (title && (ings.length || ins.length))
                    items.push({
                      title,
                      ingredients: ings,
                      instructions: ins,
                      tags: [book],
                      extra: { book, source: "pdf-auto" },
                    });
                }
                setBookPhase("importing");
                if (items.length) {
                  const blob = new Blob([JSON.stringify(items)], {
                    type: "application/json",
                  });
                  const file = new File([blob], `${book}.json`, {
                    type: "application/json",
                  });
                  const { added } = await addRecipesFromJsonFiles([file]);
                  setBookImported(added);
                  setStatus(`Imported ${added} recipes from book.`);
                  setBookPhase("done");
                } else {
                  setStatus("Could not detect recipes in PDF");
                  setBookPhase(null);
                }
              } catch (e: any) {
                setStatus(`Failed: ${e?.message || "error"}`);
                setBookPhase(null);
              } finally {
                (e.target as HTMLInputElement).value = "";
              }
            }}
          />
          <div className="mt-1">
            <label className="text-xs flex items-center gap-1">
              <input
                type="checkbox"
                className="scale-75"
                defaultChecked={
                  typeof localStorage !== "undefined" &&
                  localStorage.getItem("pdf:ocr") === "1"
                }
                onChange={(e) => {
                  try {
                    localStorage.setItem(
                      "pdf:ocr",
                      e.target.checked ? "1" : "0",
                    );
                  } catch {}
                }}
              />{" "}
              OCR fallback for scanned PDFs
            </label>
          </div>
          {(bookPhase || total > 0) && (
            <div className="mt-2 space-y-1">
              {bookPhase && (
                <>
                  <div className="text-xs text-muted-foreground">
                    {bookFile || ""}
                  </div>
                  {bookPhase === "reading" && (
                    <div className="h-2 w-full rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary transition-all"
                        style={{
                          width: `${Math.round((bookPage / Math.max(bookTotal, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </>
              )}
              {total > 0 && (
                <>
                  <div className="text-xs text-muted-foreground">
                    {processed} / {total} files processed
                  </div>
                  <div className="h-2 w-full rounded bg-muted">
                    <div
                      className="h-2 rounded bg-primary transition-all"
                      style={{
                        width: `${Math.round((processed / Math.max(total, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </>
              )}
              {importedTitles.length > 0 && (
                <div className="max-h-32 overflow-auto rounded border p-2 text-xs">
                  <div className="font-medium mb-1">Imported:</div>
                  <ul className="space-y-1 list-disc pl-4">
                    {importedTitles.map((t, i) => (
                      <li key={i} className="truncate" title={t}>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="mt-3 space-y-2 text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Import from the web
            </div>
            <div className="p-2 rounded border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <div className="flex gap-2 items-center">
                <span className="text-xs font-medium">🚀 Auto-populate 500+ recipes:</span>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      setStatus("Crawling recipes from web (this may take 30-60 seconds)...");
                      const response = await fetch(
                        "/api/echo/hungry-learning/crawl-and-store-recipes",
                        { method: "POST" }
                      );
                      if (!response.ok) throw new Error("Crawl failed");
                      const data = await response.json();
                      setStatus(
                        `✅ Added ${data.crawling?.storedRecipes || 0} recipes to system! Echo can now analyze flavor profiles and ingredient ratios.`
                      );
                    } catch (e: any) {
                      setStatus(`Failed to crawl: ${e?.message || "error"}`);
                    }
                  }}
                >
                  Crawl Now
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:flex-1">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("recipeSearch.searchWeb")}
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="sm:self-stretch"
                  onClick={() => {
                    const q = encodeURIComponent(query);
                    window.open(
                      `https://www.google.com/search?q=${q}+recipe`,
                      "_blank",
                    );
                  }}
                >
                  Search
                </Button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:flex-1">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t("recipeSearch.pasteUrl")}
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  size="sm"
                  className="sm:self-stretch"
                  onClick={async () => {
                    try {
                      setLoadingUrl(true);
                      setStatus("Fetching recipe...");
                      const r = await fetch("/api/recipe/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url }),
                      });
                      if (!r.ok)
                        throw new Error(
                          (await r.json().catch(() => ({})))?.error || "Failed",
                        );
                      const rawData = await r.json();
                      const data = rawData?.recipe || rawData;
                      let imageName: string | undefined;
                      const imgUrl =
                        typeof data.image === "string"
                          ? data.image
                          : data.image?.url || data.image?.contentUrl || "";
                      if (imgUrl) {
                        try {
                          const imgRes = await fetch(
                            `/api/recipe/image?url=${encodeURIComponent(String(imgUrl))}`,
                          );
                          if (!imgRes.ok) throw new Error("image fetch");
                          const blob = await imgRes.blob();
                          imageName = (
                            String(imgUrl).split("?")[0].split("/").pop() ||
                            `${Date.now()}.jpg`
                          ).replace(/[^A-Za-z0-9_.-]/g, "_");
                          await addImages(
                            [
                              new File([blob], imageName, {
                                type: blob.type || "image/jpeg",
                              }),
                            ],
                            { tags: ["web"] },
                          );
                        } catch {}
                      }
                      const sample = [
                        {
                          title: data.title,
                          image: imageName || undefined,
                          ingredients: data.ingredients,
                          instructions: Array.isArray(data.instructions)
                            ? data.instructions
                            : String(data.instructions || "")
                                .split(/\r?\n/)
                                .filter(Boolean),
                          tags: [],
                        },
                      ];
                      const file = new File(
                        [
                          new Blob([JSON.stringify(sample)], {
                            type: "application/json",
                          }),
                        ],
                        "web.json",
                        { type: "application/json" },
                      );
                      const { added } = await addRecipesFromJsonFiles([file]);
                      setStatus(`Imported ${added} recipe(s) from web.`);
                    } catch (e: any) {
                      setStatus(`Failed: ${e?.message || "error"}`);
                    } finally {
                      setLoadingUrl(false);
                    }
                  }}
                  disabled={loadingUrl || !url}
                >
                  {loadingUrl ? "Importing..." : "Import"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {status && <div className="rounded-md border p-3 text-sm">{status}</div>}
      <AlertDialog
        open={!!collectionToDelete}
        onOpenChange={(open) => {
          if (!open) setCollectionToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              {collectionToDelete
                ? `"${collectionToDelete.name}" will be removed permanently.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCollectionToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteCollection}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={tocOpen} onOpenChange={setTocOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select recipes to import</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-auto hide-scrollbar border rounded p-2 text-sm space-y-1">
            {(toc || []).map((t) => (
              <label
                key={`${t.page}-${t.title}`}
                className="grid grid-cols-[16px_1fr_42px] items-center gap-2 text-xs"
              >
                <input
                  type="checkbox"
                  className="scale-75"
                  checked={!!tocChecked[t.title]}
                  onChange={() =>
                    setTocChecked((m) => ({ ...m, [t.title]: !m[t.title] }))
                  }
                />
                <span className="truncate" title={`${t.title} — p.${t.page}`}>
                  {t.title}
                </span>
                <span className="text-muted-foreground text-right">
                  p.{t.page}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-between gap-2">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  (toc || []).forEach((t) => (all[t.title] = true));
                  setTocChecked(all);
                }}
              >
                Select all
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const none: Record<string, boolean> = {};
                  (toc || []).forEach((t) => (none[t.title] = false));
                  setTocChecked(none);
                }}
              >
                Unselect all
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setTocOpen(false);
                  setToc(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    setTocOpen(false);
                    const f = pdfPendingRef.current;
                    if (!f) return;
                    setScanOpen(true);
                    setDetectedOpen(true);
                    setDetected([]);
                    setScanPageNo(0);
                    setStatus("Scanning book...");
                    const ab = await f.arrayBuffer();
                    const pdfjs: any = await import(
                      "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.mjs"
                    );
                    const workerSrc =
                      "https://esm.sh/pdfjs-dist@4.7.76/build/pdf.worker.mjs";
                    if (pdfjs.GlobalWorkerOptions)
                      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
                    const doc = await pdfjs.getDocument({ data: ab }).promise;
                    setScanTotal(doc.numPages);
                    const pageTexts: string[] = [];
                    const normLine = (s: string) => {
                      let t = s.replace(/\s+/g, " ").trim();
                      if (
                        /^([A-Z]\s+){2,}[A-Z](?:\s+\d+)?[\s:]*$/.test(t) &&
                        t.length <= 60
                      ) {
                        t = t.replace(/\s+/g, "");
                      }
                      return t;
                    };
                    const isLikelyIngredientList = (txt: string) => {
                      const ls = txt
                        .split(/\n/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .slice(0, 80);
                      const qty =
                        /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼������¾⅓⅔⅛⅜⅝��])(?:\s*[a-zA-Z]+)?\b/;
                      let c = 0;
                      for (const L of ls) {
                        if (qty.test(L) || /^[•\-*]\s+/.test(L)) c++;
                      }
                      return c >= 3;
                    };
                    const candidates: number[] = [];
                    for (let p = 1; p <= doc.numPages; p++) {
                      const page = await doc.getPage(p);
                      const tc = await page.getTextContent();
                      const t = (tc.items as any[])
                        .map((i) => String(i.str))
                        .join("\n");
                      pageTexts.push(t);
                      setScanPageNo(p);
                      const hasIng =
                        /\bingredients?\b/i.test(t) ||
                        isLikelyIngredientList(t);
                      if (hasIng) {
                        candidates.push(p);
                        const lines = t
                          .split(/\n/)
                          .map(normLine)
                          .filter(Boolean);
                        // Filter out common OCR artifacts and non-content
                        const ocrArtifacts = [
                          "scan to download",
                          "visit us online",
                          "qr code",
                          "page",
                          "contents",
                          "index",
                          "glossary",
                          "appendix",
                          "copyright",
                          "isbn",
                          "download",
                        ];

                        let guess = "";
                        for (let k = 0; k < Math.min(lines.length, 10); k++) {
                          const L = lines[k];
                          const isArtifact = ocrArtifacts.some((artifact) =>
                            L.toLowerCase().includes(artifact),
                          );

                          // Skip OCR artifacts
                          if (isArtifact) continue;

                          if (
                            /^[A-Z][A-Za-z0-9\-\'\s]{2,80}$/.test(L) ||
                            /^([A-Z]\s+){2,}[A-Z][\s:]*$/.test(L)
                          ) {
                            guess = L.replace(/\s+/g, " ").trim();
                            break;
                          }
                        }

                        // Only add if we found meaningful content (not just OCR artifacts)
                        if (guess && guess.length >= 3) {
                          setDetected((d) => [
                            ...d,
                            { page: p, title: guess },
                          ]);
                        }
                      }
                    }
                    // Learn cookbook terminology and definitions
                    try {
                      const keepTop = (
                        obj: Record<string, number>,
                        n: number,
                      ) =>
                        Object.fromEntries(
                          Object.entries(obj)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, n),
                        );

                      // Culinary-specific terminology dictionary for intelligent extraction
                      const culinaryKeywords = new Set([
                        // Techniques
                        "broil", "braise", "blanch", "bruise", "brunoise", "julienne", "chiffonade",
                        "deglaze", "deminasse", "dice", "dredge", "fold", "fricassee", "fillet",
                        "flambe", "garnish", "glaze", "grate", "grind", "infuse", "knead",
                        "marinate", "mince", "mirepoix", "poach", "puree", "sauté", "scald",
                        "score", "sear", "shred", "simmer", "skim", "slice", "steam", "strain",
                        "temper", "thread", "toss", "truss", "whip", "zest", "caramelize",
                        "char", "blanch", "shock", "braise", "brander", "butterfly", "chop",
                        // Cooking methods
                        "bake", "boil", "roast", "fry", "grill", "steam", "poach", "simmer",
                        "broil", "sauté", "stir", "pan", "oven", "stovetop", "microwave",
                        // Ingredients
                        "flour", "butter", "sugar", "salt", "pepper", "oil", "cream", "milk",
                        "egg", "yeast", "herb", "spice", "garlic", "onion", "stock", "broth",
                        "sauce", "vinegar", "wine", "cheese", "meat", "fish", "vegetable",
                        // Measurements
                        "teaspoon", "tablespoon", "cup", "pint", "quart", "ounce", "pound",
                        "gram", "milliliter", "liter", "pinch", "dash", "splash",
                        // Equipment
                        "knife", "pan", "pot", "bowl", "mixer", "blender", "whisk", "spatula",
                        "spoon", "fork", "ladle", "skewer", "thermometer", "scale", "sifter",
                        "grater", "peeler", "tongs", "sheet", "baking", "rack", "tray",
                        // Flavor/Taste
                        "sweet", "salty", "sour", "bitter", "umami", "savory", "spicy",
                        "aromatic", "fragrant", "tender", "crispy", "flaky", "moist", "dry",
                        // Cuisine types
                        "french", "italian", "asian", "spanish", "mexican", "greek", "indian",
                        "thai", "japanese", "chinese", "korean", "vietnamese", "middle eastern",
                        // Food types
                        "appetizer", "entree", "dessert", "soup", "salad", "bread", "pasta",
                        "rice", "bean", "grain", "fruit", "vegetable", "protein", "dairy",
                      ]);

                      const words: Record<string, number> = {},
                        bigrams: Record<string, number> = {},
                        definitions: Record<string, string> = {},
                        culinaryTerms: Record<string, number> = {};

                      const textAll = pageTexts
                        .join("\n")
                        .toLowerCase()
                        .replace(/[^a-z\s]/g, " ");
                      const arr = textAll
                        .split(/\s+/)
                        .filter(
                          (w) =>
                            w.length >= 3 &&
                            w.length <= 24 &&
                            !STOP_WORDS.has(w),
                        );

                      // Extract single words and culinary terms
                      for (let i = 0; i < arr.length; i++) {
                        const w = arr[i];
                        words[w] = (words[w] || 0) + 1;

                        // Track culinary-specific terms separately
                        if (culinaryKeywords.has(w)) {
                          culinaryTerms[w] = (culinaryTerms[w] || 0) + 1;
                        }

                        // Extract 3-word phrases for compound culinary techniques/terms
                        if (i < arr.length - 2) {
                          const w1 = arr[i];
                          const w2 = arr[i + 1];
                          const w3 = arr[i + 2];

                          if (
                            !STOP_WORDS.has(w1) &&
                            !STOP_WORDS.has(w2) &&
                            !STOP_WORDS.has(w3)
                          ) {
                            const trigram = `${w1} ${w2} ${w3}`;
                            if (trigram.length >= 5 && trigram.length <= 50) {
                              const isCulinary =
                                culinaryKeywords.has(w1) ||
                                culinaryKeywords.has(w2) ||
                                culinaryKeywords.has(w3);
                              if (isCulinary) {
                                bigrams[trigram] = (bigrams[trigram] || 0) + 1;
                              }
                            }
                          }
                        }

                        // Extract 2-word phrases (bigrams)
                        if (i < arr.length - 1) {
                          const next = arr[i + 1];
                          if (!STOP_WORDS.has(next)) {
                            const g = `${arr[i]} ${next}`;
                            if (g.length >= 5 && g.length <= 40) {
                              const isCulinary =
                                culinaryKeywords.has(arr[i]) ||
                                culinaryKeywords.has(next);
                              if (isCulinary) {
                                bigrams[g] = (bigrams[g] || 0) + 1;
                              }
                            }
                          }
                        }
                      }

                      // Extract definitions from text using multiple patterns
                      // Optimized for culinary definition textbooks
                      const defPatterns = [
                        // Pattern 1: "Term: definition" (most common)
                        /^\s*([A-Z][a-zA-Z\s]{2,50})\s*:\s*(.{10,300})$/gm,
                        // Pattern 2: "Term – definition" or "Term — definition"
                        /^\s*([A-Z][a-zA-Z\s]{2,50})\s*(?:–|—|=)\s*(.{10,300})$/gm,
                        // Pattern 3: "Term (plural): definition"
                        /^\s*([A-Z][a-zA-Z\s]{2,50})\s*\([^)]*\)\s*:\s*(.{10,300})$/gm,
                        // Pattern 4: Multi-line with term on one line, definition on next
                        /^([A-Z][a-zA-Z\s]{2,50})$\n+(.{20,300}?)(?:\n\n|\n[A-Z]|$)/gm,
                        // Pattern 5: Indented definition pattern (term followed by indented text)
                        /^([A-Z][a-zA-Z\s]{2,50})\n\s{2,}(.{20,300}?)(?:\n\n|$)/gm,
                        // Pattern 6: Bold/italic markers followed by definition (markdown-style)
                        /^\*\*?([A-Z][a-zA-Z\s]{2,50})\*\*?\s*[-–—:]\s*(.{10,300})$/gm,
                      ];

                      // Filter out common OCR artifacts and false positives
                      const falsePositives = new Set([
                        "scan to download",
                        "visit us online",
                        "page number",
                        "contents",
                        "table of contents",
                        "index",
                        "glossary",
                        "appendix",
                        "copyright",
                        "isbn",
                        "scan",
                        "download",
                        "qr code",
                        "to download",
                      ]);

                      for (const text of pageTexts) {
                        for (const pattern of defPatterns) {
                          let match;
                          while ((match = pattern.exec(text)) !== null) {
                            const term = match[1]?.trim().toLowerCase() || "";
                            const def = match[2]?.trim() || "";

                            // Validate term and definition quality
                            const isFalsePositive = falsePositives.has(term);
                            const isValidDef =
                              term.length >= 3 &&
                              term.length <= 50 &&
                              def.length >= 10 &&
                              def.length <= 300 &&
                              !isFalsePositive &&
                              !definitions[term];

                            // Clean up definition (remove extra whitespace, normalize)
                            if (isValidDef) {
                              const cleanedDef = def
                                .replace(/\s+/g, " ")
                                .replace(/[""]/g, '"')
                                .replace(/['']/g, "'")
                                .trim();

                              if (cleanedDef.length >= 10) {
                                definitions[term] = cleanedDef;
                              }
                            }
                          }
                        }
                      }

                      console.log(`  📚 Extracted ${Object.keys(definitions).length} definitions from PDF`);

                      // Extract procedures for semantic knowledge (Echo learning)
                      const fullText = pageTexts.join("\n");
                      const extractedProcedures = identifyProcedures(fullText);
                      const bookName = f.name.replace(/\.[^.]+$/, "");

                      // Store procedures in Pinecone-backed system
                      for (const proc of extractedProcedures) {
                        try {
                          await storeProcedure({
                            title: proc.title,
                            source_book: bookName,
                            category: proc.category,
                            steps: proc.steps,
                            materials: proc.materials,
                            tools: proc.tools,
                            time_estimate: proc.time_estimate,
                            difficulty: proc.difficulty,
                            related_keywords: proc.related_keywords,
                          });
                        } catch (procError) {
                          console.warn("Failed to store procedure:", procError);
                        }
                      }

                      const raw = localStorage.getItem("kb:cook") || "{}";
                      const kb = JSON.parse(raw);

                      // Prioritize culinary-specific terms over generic words when displaying
                      // Store both for reference but mark culinary terms as priority
                      const mergedTerms = { ...kb.terms, ...words };
                      const mergedCulinaryTerms = {
                        ...(kb.culinaryTerms || {}),
                        ...culinaryTerms,
                      };

                      // For display purposes, use culinary terms if available, otherwise use all terms
                      kb.terms = keepTop(
                        Object.entries(mergedTerms).reduce(
                          (acc, [term, count]) => {
                            // Boost culinary terms in rankings
                            const boost = mergedCulinaryTerms[term] ? 2 : 1;
                            acc[term] = (count || 0) * boost;
                            return acc;
                          },
                          {} as Record<string, number>,
                        ),
                        400,
                      );

                      kb.culinaryTerms = keepTop(mergedCulinaryTerms, 200);
                      kb.bigrams = keepTop({ ...kb.bigrams, ...bigrams }, 600);
                      kb.definitions = { ...kb.definitions, ...definitions };
                      kb.books = Array.from(
                        new Set([...(kb.books || []), bookName]),
                      );
                      localStorage.setItem("kb:cook", JSON.stringify(kb));
                      console.log(`📚 Learned from ${bookName}:`, {
                        wordsExtracted: Object.keys(words).length,
                        culinaryTermsExtracted: Object.keys(culinaryTerms).length,
                        definitionsExtracted: Object.keys(definitions).length,
                        bigramsExtracted: Object.keys(bigrams).length,
                      });

                      if (extractedProcedures.length > 0) {
                        console.log(
                          `Extracted ${extractedProcedures.length} procedures from ${bookName}`,
                        );
                      }
                    } catch (error) {
                      console.error("Error processing book knowledge:", error);
                    }
                    const starts = candidates.sort((a, b) => a - b);
                    const items: any[] = [];
                    for (let i = 0; i < starts.length; i++) {
                      const s = starts[i];
                      const e =
                        i + 1 < starts.length
                          ? starts[i + 1] - 1
                          : pageTexts.length;
                      const textRaw = pageTexts.slice(s - 1, e).join("\n");
                      const text = textRaw.split(/\n/).map(normLine).join("\n");
                      const lines = text
                        .split(/\n/)
                        .map(normLine)
                        .filter(Boolean);
                      const lower = lines.map((l) => l.toLowerCase());
                      const find = (labels: string[]) =>
                        lower.findIndex((l) =>
                          labels.some((x) => l.startsWith(x)),
                        );
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
                        const qty =
                          /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[a-zA-Z]+)?\b/;
                        for (let j = 0; j < Math.min(lines.length, 80); j++) {
                          if (
                            qty.test(lines[j]) ||
                            /^[•\-*]\s+/.test(lines[j])
                          ) {
                            ingIdx = j - 1;
                            break;
                          }
                        }
                      }
                      if (instIdx < 0 && ingIdx >= 0) {
                        for (
                          let j = ingIdx + 1;
                          j < Math.min(lines.length, 200);
                          j++
                        ) {
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
                      const getRange = (a: number, b: number) =>
                        lines
                          .slice(a + 1, b > a ? b : undefined)
                          .filter(Boolean);
                      const ings =
                        ingIdx >= 0
                          ? getRange(
                              ingIdx,
                              instIdx >= 0 ? instIdx : lines.length,
                            )
                          : [];
                      const ins =
                        instIdx >= 0 ? getRange(instIdx, lines.length) : [];
                      if (ings.length >= 2 || ins.length >= 3) {
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
                        if (!title)
                          title =
                            lines[0] ||
                            `${f.name.replace(/\.[^.]+$/, "")} p.${s}`;
                        items.push({
                          title,
                          ingredients: ings,
                          instructions: ins,
                          tags: [f.name.replace(/\.[^.]+$/, "")],
                        });
                      }
                    }
                    if (items.length) {
                      const blob = new Blob([JSON.stringify(items)], {
                        type: "application/json",
                      });
                      const jf = new File(
                        [blob],
                        `${f.name.replace(/\.[^.]+$/, "")}.json`,
                        { type: "application/json" },
                      );
                      const bookName = f.name.replace(/\.[^.]+$/, "");
                      const { added } = await importRecipesWithEchoTraining(
                        () => addRecipesFromJsonFiles([jf]),
                        bookName,
                      );
                      setStatus(`Imported ${added} recipes from book.`);
                    } else {
                      setStatus("No recipes detected.");
                    }
                  } catch (e: any) {
                    setStatus(`Failed: ${e?.message || "error"}`);
                  } finally {
                    setScanOpen(false);
                    setDetectedOpen(false);
                    setToc(null);
                    setTocChecked({});
                    pdfPendingRef.current = null;
                  }
                }}
              >
                Import all (auto)
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setTocOpen(false);
                    setBookPhase("importing");
                    const selected = Object.keys(tocChecked).filter(
                      (k) => tocChecked[k],
                    );
                    localStorage.setItem(
                      "pdf:index:allow",
                      JSON.stringify(selected),
                    );
                    if (pdfPendingRef.current) {
                      const bookName = pdfPendingRef.current.name.replace(/\.pdf$/i, "");
                      const { added } = await importRecipesWithEchoTraining(
                        () => addRecipesFromPdfFiles([pdfPendingRef.current]),
                        bookName,
                      );
                      setStatus(`Imported ${added} recipe(s) from book.`);
                      setBookPhase("done");
                    }
                  } catch (e: any) {
                    setStatus(`Failed: ${e?.message || "error"}`);
                    setBookPhase(null);
                  } finally {
                    setToc(null);
                    setTocChecked({});
                    pdfPendingRef.current = null;
                  }
                }}
              >
                Accept
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live scanning progress */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scanning book…</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground">
            Page {Math.min(scanPageNo, scanTotal)} / {scanTotal}
          </div>
          <div className="h-2 w-full rounded bg-muted">
            <div
              className="h-2 rounded bg-primary transition-all"
              style={{
                width: `${Math.round((scanPageNo / Math.max(scanTotal, 1)) * 100)}%`,
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Detected recipes list */}
      <Dialog open={detectedOpen} onOpenChange={setDetectedOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detected recipes</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-auto border rounded p-2 text-sm space-y-1">
            {detected.length === 0 ? (
              <div className="text-xs text-muted-foreground">Scanning…</div>
            ) : (
              detected.map((d) => (
                <div
                  key={`${d.page}-${d.title}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate" title={d.title}>
                    {d.title || `Candidate p.${d.page}`}
                  </span>
                  <span className="text-muted-foreground">p.{d.page}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="default"
              disabled={!scanPageTexts || !detected.length}
              onClick={async () => {
                try {
                  const pageTexts = scanPageTexts!;
                  const starts = detected
                    .map((d) => d.page)
                    .sort((a, b) => a - b);
                  const normLine = (s: string) => {
                    let t = s.replace(/\s+/g, " ").trim();
                    if (
                      /^([A-Z]\s+){2,}[A-Z](?:\s+\d+)?[\s:]*$/.test(t) &&
                      t.length <= 60
                    ) {
                      t = t.replace(/\s+/g, "");
                    }
                    return t;
                  };
                  const items: any[] = [];
                  const book = scanBookName || "Book";
                  for (let i = 0; i < starts.length; i++) {
                    const s = starts[i];
                    const e =
                      i + 1 < starts.length
                        ? starts[i + 1] - 1
                        : pageTexts.length;
                    const textRaw = pageTexts.slice(s - 1, e).join("\n");
                    const text = textRaw.split(/\n/).map(normLine).join("\n");
                    const lines = text
                      .split(/\n/)
                      .map(normLine)
                      .filter(Boolean);
                    const lower = lines.map((l) => l.toLowerCase());
                    const find = (labels: string[]) =>
                      lower.findIndex((l) =>
                        labels.some((x) => l.startsWith(x)),
                      );
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
                      const qty =
                        /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔��⅜⅝⅞])(?:\s*[a-zA-Z]+)?\b/;
                      for (let j = 0; j < Math.min(lines.length, 80); j++) {
                        if (qty.test(lines[j]) || /^[•\-*]\s+/.test(lines[j])) {
                          ingIdx = j - 1;
                          break;
                        }
                      }
                    }
                    if (instIdx < 0 && ingIdx >= 0) {
                      for (
                        let j = ingIdx + 1;
                        j < Math.min(lines.length, 200);
                        j++
                      ) {
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
                    const getRange = (a: number, b: number) =>
                      lines.slice(a + 1, b > a ? b : undefined).filter(Boolean);
                    const ings =
                      ingIdx >= 0
                        ? getRange(
                            ingIdx,
                            instIdx >= 0 ? instIdx : lines.length,
                          )
                        : [];
                    const ins =
                      instIdx >= 0 ? getRange(instIdx, lines.length) : [];
                    if (ings.length >= 2 || ins.length >= 3) {
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
                      if (!title) title = lines[0] || `${book} p.${s}`;
                      items.push({
                        title,
                        ingredients: ings,
                        instructions: ins,
                        tags: [book],
                      });
                    }
                  }
                  if (items.length) {
                    // add book metadata and de-duplicate by title within this batch
                    const bookName = scanBookName || "book";
                    const seen: Record<string, boolean> = {};
                    const withMeta = items
                      .filter((it) => {
                        const k = (it.title || "").toLowerCase();
                        if (seen[k]) return false;
                        seen[k] = true;
                        return true;
                      })
                      .map((it) => ({
                        ...it,
                        extra: {
                          ...(it.extra || {}),
                          book: bookName,
                          source: "pdf-detected",
                        },
                      }));
                    const blob = new Blob([JSON.stringify(withMeta)], {
                      type: "application/json",
                    });
                    const jf = new File([blob], `${bookName}.json`, {
                      type: "application/json",
                    });
                    const { added: importedCount } = await importRecipesWithEchoTraining(
                      () => addRecipesFromJsonFiles([jf]),
                      bookName,
                    );
                    setStatus(`Imported ${importedCount} recipes from detected list.`);
                  }
                } catch (e: any) {
                  setStatus(`Failed: ${e?.message || "error"}`);
                } finally {
                  setDetectedOpen(false);
                  setDetected([]);
                  setScanPageTexts(null);
                }
              }}
            >
              Import detected
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {errors.length > 0 && (
        <div className="rounded-md border p-3 text-sm">
          <div className="font-medium mb-2">Errors</div>
          <ul className="space-y-1 list-disc pl-5">
            {errors.map((e, i) => (
              <li key={i}>
                <span className="font-mono">{e.file}</span>: {e.error}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4"
        data-echo-key="section:recipes:filters"
      >
        <div className="flex-1 relative" data-echo-key="field:recipes:query">
          <input
            ref={searchInputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={t("recipeSearch.searchByName")}
            className="w-full rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setQ(suggestion);
                    setShowSuggestions(false);
                    searchInputRef.current?.focus();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm"
                >
                  <Search className="inline h-3 w-3 mr-2 opacity-50" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        <select
          value={fcuisine}
          onChange={(e) => setFCuisine(e.target.value)}
          className="rounded-md border bg-background px-2 py-2 text-sm max-w-[220px]"
          data-echo-key="filter:recipes:cuisine"
        >
          <option value="">Cuisine</option>
          {axisOptions("cuisines").map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={fcourse}
          onChange={(e) => setFCourse(e.target.value)}
          className="rounded-md border bg-background px-2 py-2 text-sm max-w-[220px]"
          data-echo-key="filter:recipes:course"
        >
          <option value="">Course</option>
          {axisOptions("course").map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={fdiet}
          onChange={(e) => setFDiet(e.target.value)}
          className="rounded-md border bg-background px-2 py-2 text-sm max-w-[220px]"
          data-echo-key="filter:recipes:dietary"
        >
          <option value="">Dietary</option>
          {axisOptions("diets").map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {results.length} / {recipes.length} recipes
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No recipes yet. Drop files above or import from URL.
        </div>
      ) : mode === "cards" ? (
        <div
          className="min-h-[800px]"
          data-echo-key="section:recipes:results"
        >
          <VirtualizedRecipeGrid
            recipes={results}
            inTrash={inTrashView}
            onPreview={setPreview}
            onFav={toggleFavorite}
            onRate={rateRecipe}
            onUpdateTags={updateRecipeTags}
            onTrash={(r) =>
              r.deletedAt ? restoreRecipe(r.id) : deleteRecipe(r.id)
            }
            onDestroy={(id) => {
              if (confirm("Delete this recipe forever?")) destroyRecipe(id);
            }}
            selectMode={isCollectionSelectionEnabled}
            selectedIds={selectedRecipeIds}
            onToggleSelect={toggleRecipeSelection}
            onToggleGlobal={toggleRecipeGlobal}
          />
        </div>
      ) : mode === "grid4" ? (
        <div
          className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
          data-echo-key="section:recipes:results"
        >
          {results.filter(Boolean).map((r) => {
            const key = r.id || Math.random().toString(36).slice(2);
            const selected = selectedRecipeIds.includes(r.id);
            return (
              <div
                key={key}
                className={cn(
                  "flex items-start gap-2 rounded border p-3 glow transition-colors",
                  isCollectionSelectionEnabled && selected
                    ? "border-primary bg-primary/5 dark:bg-primary/15"
                    : undefined,
                )}
                data-echo-key="card:recipes:result"
              >
                <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-muted">
                  {r.imageDataUrls?.[0] ? (
                    <ResponsiveImage
                      src={r.imageDataUrls[0]}
                      alt={r.title || ""}
                      width={64}
                      height={48}
                      className="h-full w-full"
                      objectFit="cover"
                    />
                  ) : null}
                  {isCollectionSelectionEnabled && (
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleRecipeSelection(r.id)}
                      className={cn(
                        "absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow focus-visible:outline-none focus-visible:ring",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground",
                      )}
                    >
                      {selected
                        ? t("recipeSearch.selected")
                        : t("recipeSearch.select")}
                    </button>
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className="line-clamp-2 text-sm font-medium"
                    title={r.title}
                  >
                    {r.title}
                  </div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">
                    {r.tags?.join(" �� ")}
                  </div>
                  <div className="mt-1 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreview(r)}
                    >
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      data-echo-key="cta:recipes:open"
                    >
                      <a href={`/recipe/${r.id}/view`}>
                        <ExternalLink className="mr-1" />
                        Open
                      </a>
                    </Button>
                    {inTrashView ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreRecipe(r.id)}
                          title={t("recipeSearch.restore")}
                        >
                          <RotateCcw />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Delete forever?")) destroyRecipe(r.id);
                          }}
                          title={t("recipeSearch.deleteForever")}
                        >
                          <Trash2 />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteRecipe(r.id)}
                        title="Move to trash"
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-3 rounded-lg border glow p-3"
          data-echo-key="section:recipes:results"
        >
          {results.filter(Boolean).map((r) => {
            const key = r.id || Math.random().toString(36).slice(2);
            const selected = selectedRecipeIds.includes(r.id);
            return (
              <div
                key={key}
                className={cn(
                  "flex items-start gap-3 p-3 rounded border transition-colors",
                  isCollectionSelectionEnabled && selected
                    ? "bg-primary/5 dark:bg-primary/15 border-primary"
                    : "border-border/40",
                )}
                data-echo-key="card:recipes:result"
              >
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded bg-muted">
                  {r.imageDataUrls?.[0] ? (
                    <ResponsiveImage
                      src={r.imageDataUrls[0]}
                      alt={r.title || ""}
                      width={128}
                      height={96}
                      className="h-full w-full"
                      objectFit="cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  {isCollectionSelectionEnabled && (
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleRecipeSelection(r.id)}
                      className={cn(
                        "absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow focus-visible:outline-none focus-visible:ring",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground",
                      )}
                    >
                      {selected
                        ? t("recipeSearch.selected")
                        : t("recipeSearch.select")}
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="line-clamp-1 font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString()
                        : "-"}
                    </div>
                  </div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">
                    {r.tags?.join(" · ")}
                  </div>
                  <div className="mt-1 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreview(r)}
                    >
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      data-echo-key="cta:recipes:open"
                    >
                      <a href={`/recipe/${r.id}/view`}>
                        <ExternalLink className="mr-1" />
                        Open
                      </a>
                    </Button>
                    {inTrashView ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreRecipe(r.id)}
                          title={t("recipeSearch.restore")}
                        >
                          <RotateCcw />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Delete forever?")) destroyRecipe(r.id);
                          }}
                          title={t("recipeSearch.deleteForever")}
                        >
                          <Trash2 />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteRecipe(r.id)}
                        title="Move to trash"
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 text-xs text-muted-foreground text-center">
        Total recipes in system: {recipes.length}
      </div>

      <details className="rounded-md border p-3 text-sm">
        <summary className="cursor-pointer select-none">
          🧠 AI Knowledge Learned from Recipes
        </summary>
        <div className="mt-4 space-y-4">
          {(() => {
            try {
              const raw = localStorage.getItem("kb:insights");
              if (!raw || recipes.length === 0)
                return (
                  <div className="text-xs text-muted-foreground">
                    Import recipes to start learning ingredient ratios, flavor
                    profiles, and regional cooking patterns.
                  </div>
                );

              const insights = JSON.parse(raw);

              return (
                <>
                  {/* Ingredient Ratios */}
                  {insights.ingredientRatios &&
                    Object.keys(insights.ingredientRatios).length > 0 && (
                      <div className="border-t pt-3">
                        <div className="font-medium mb-2">
                          📊 Key Ingredient Ratios
                        </div>
                        <ul className="space-y-1 text-xs">
                          {Object.entries(insights.ingredientRatios)
                            .slice(0, 8)
                            .map(([key, ratio]: any) => (
                              <li key={key} className="text-muted-foreground">
                                <span className="font-mono">
                                  {ratio.ingredient1} : {ratio.ingredient2}
                                </span>{" "}
                                ≈{" "}
                                <span className="font-semibold">
                                  {ratio.ratio.toFixed(2)}:1
                                </span>{" "}
                                ({ratio.count}x seen)
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {/* Flavor Profiles */}
                  {insights.flavorProfiles &&
                    insights.flavorProfiles.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="font-medium mb-2">
                          🌶️ Flavor Profile Analysis
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="text-muted-foreground">
                            <span className="font-semibold">Sweet:</span>{" "}
                            {(insights.avgFlavorSweet || 0).toFixed(1)}/10
                          </div>
                          <div className="text-muted-foreground">
                            <span className="font-semibold">Salty:</span>{" "}
                            {(insights.avgFlavorSalty || 0).toFixed(1)}/10
                          </div>
                          <div className="text-muted-foreground">
                            <span className="font-semibold">Umami:</span>{" "}
                            {(insights.avgFlavorUmami || 0).toFixed(1)}/10
                          </div>
                          <div className="text-muted-foreground">
                            <span className="font-semibold">Spicy:</span>{" "}
                            {(insights.avgFlavorSpicy || 0).toFixed(1)}/10
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Regional Cooking Styles */}
                  {insights.regionalPatterns &&
                    Object.keys(insights.regionalPatterns).length > 0 && (
                      <div className="border-t pt-3">
                        <div className="font-medium mb-2">
                          🌍 Regional Cooking Styles
                        </div>
                        <div className="space-y-2">
                          {Object.entries(insights.regionalPatterns)
                            .slice(0, 5)
                            .map(([region, pattern]: any) => (
                              <div key={region} className="text-xs">
                                <div className="font-semibold text-foreground">
                                  {region}
                                </div>
                                <div className="text-muted-foreground ml-2">
                                  {pattern.characteristics
                                    ?.slice(0, 3)
                                    .join(" • ")}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  {/* Common Ingredient Combinations */}
                  {insights.commonCombinations &&
                    insights.commonCombinations.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="font-medium mb-2">
                          👨‍🍳 Common Ingredient Pairs
                        </div>
                        <ul className="space-y-1 text-xs">
                          {insights.commonCombinations
                            .slice(0, 6)
                            .map((combo: any, idx: number) => (
                              <li key={idx} className="text-muted-foreground">
                                {combo.ingredients.slice(0, 3).join(" + ")}
                                {combo.cuisines?.length > 0 && (
                                  <span className="ml-1 text-xs">
                                    ({combo.cuisines[0]})
                                  </span>
                                )}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {/* Cooking Methods */}
                  {insights.cookingMethods &&
                    Object.keys(insights.cookingMethods).length > 0 && (
                      <div className="border-t pt-3">
                        <div className="font-medium mb-2">
                          🔥 Preferred Cooking Methods
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(insights.cookingMethods)
                            .sort(
                              (a: any, b: any) =>
                                b[1].frequency - a[1].frequency,
                            )
                            .slice(0, 6)
                            .map(([method, stats]: any) => (
                              <span
                                key={method}
                                className="px-2 py-1 bg-muted rounded text-xs"
                              >
                                {method} ({stats.frequency}x)
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                </>
              );
            } catch (e) {
              return (
                <div className="text-xs text-muted-foreground">
                  Learning system initialized. Import more recipes to see
                  insights.
                </div>
              );
            }
          })()}
        </div>
      </details>

      <details className="rounded-md border p-3 text-sm mt-4">
        <summary className="cursor-pointer select-none">
          📚 Culinary Terminology & Definitions Learned
        </summary>
        <div className="mt-4 space-y-4 text-xs">
          {(() => {
            try {
              const raw = localStorage.getItem("kb:cook") || "{}";
              const kb = JSON.parse(raw);
              const definitions = kb.definitions || {};
              const culinaryTerms = kb.culinaryTerms || {};
              const allTerms = kb.terms || {};
              const books = kb.books || [];

              // Use culinary terms for display if available, otherwise fall back to all terms
              const displayTerms = Object.keys(culinaryTerms).length > 0 ? culinaryTerms : allTerms;

              if (
                Object.keys(definitions).length === 0 &&
                Object.keys(displayTerms).length === 0
              ) {
                return (
                  <div className="text-muted-foreground">
                    Import textbooks or reference books to learn culinary
                    terminology and definitions.
                  </div>
                );
              }

              return (
                <>
                  {books.length > 0 && (
                    <div className="border-t pt-3">
                      <div className="font-medium mb-2">���� Books Imported</div>
                      <div className="flex flex-wrap gap-2">
                        {books.map((book) => (
                          <span
                            key={book}
                            className="px-2 py-1 bg-muted rounded text-xs"
                          >
                            {book}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(definitions).length > 0 && (
                    <div className="border-t pt-3">
                      <div className="font-medium mb-2">
                        📖 Culinary Definitions
                      </div>
                      <div className="max-h-48 overflow-auto hide-scrollbar space-y-2">
                        {Object.entries(definitions)
                          .sort((a, b) =>
                            (a[0] as string).localeCompare(b[0] as string),
                          )
                          .slice(0, 15)
                          .map(([term, def]) => (
                            <div
                              key={term}
                              className="text-xs border-l-2 border-muted pl-2 flex items-start justify-between gap-2 group"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground capitalize">
                                  {term}
                                </div>
                                <div className="text-muted-foreground line-clamp-2">
                                  {def}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const raw =
                                    localStorage.getItem("kb:cook") || "{}";
                                  const kb = JSON.parse(raw);
                                  if (kb.definitions && kb.definitions[term]) {
                                    delete kb.definitions[term];
                                    localStorage.setItem(
                                      "kb:cook",
                                      JSON.stringify(kb),
                                    );
                                    window.location.reload();
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                                title="Delete this definition"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        {Object.keys(definitions).length > 15 && (
                          <div className="text-muted-foreground italic">
                            +{Object.keys(definitions).length - 15} more
                            definitions...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {Object.keys(displayTerms).length > 0 && (
                    <div className="border-t pt-3">
                      <div className="font-medium mb-2">
                        🔤 Top Culinary Terms ({Object.keys(displayTerms).length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(displayTerms)
                          .sort((a: any, b: any) => b[1] - a[1])
                          .slice(0, 20)
                          .map(([term, count]) => (
                            <span
                              key={term}
                              className="px-1.5 py-0.5 bg-muted rounded text-xs group relative cursor-default hover:bg-muted/80 transition-colors"
                              title={`${term} (appears ${count} times)`}
                            >
                              {term}{" "}
                              <span className="text-muted-foreground">
                                ({count})
                              </span>
                              <button
                                onClick={() => {
                                  const raw =
                                    localStorage.getItem("kb:cook") || "{}";
                                  const kb = JSON.parse(raw);
                                  // Delete from both culinary and general terms
                                  if (kb.culinaryTerms && kb.culinaryTerms[term]) {
                                    delete kb.culinaryTerms[term];
                                  }
                                  if (kb.terms && kb.terms[term]) {
                                    delete kb.terms[term];
                                  }
                                  localStorage.setItem(
                                    "kb:cook",
                                    JSON.stringify(kb),
                                  );
                                  window.location.reload();
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-2 -top-2 p-0.5 bg-destructive text-white rounded-full text-xs"
                                title="Delete this term"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          ))}
                      </div>
                      {Object.keys(allTerms).length > Object.keys(displayTerms).length && (
                        <div className="text-muted-foreground italic text-xs mt-2">
                          Showing {Object.keys(displayTerms).length} culinary-specific terms
                          from {Object.keys(allTerms).length} total terms learned
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t pt-3 text-xs text-muted-foreground italic">
                    💡 <strong>Note:</strong> This knowledge base is retained
                    even when recipes are deleted, preserving your culinary
                    learning across all areas of the application including R&D,
                    General Knowledge, and AI training.
                  </div>
                </>
              );
            } catch (e) {
              return (
                <div className="text-xs text-muted-foreground">
                  Knowledge base system ready. Import textbooks to learn
                  terminology.
                </div>
              );
            }
          })()}
        </div>
      </details>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl drop-shadow-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
              <div className="rounded border overflow-hidden bg-muted/20">
                {preview.imageDataUrls?.[0] ? (
                  <img
                    src={preview.imageDataUrls[0]}
                    alt={preview.title}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <div className="text-sm space-y-2">
                {preview.tags?.length ? (
                  <div className="text-muted-foreground">
                    {preview.tags.join(" · ")}
                  </div>
                ) : null}
                {preview.ingredients?.length ? (
                  <div>
                    <div className="font-medium">Ingredients</div>
                    <ul className="list-disc pl-5 max-h-32 overflow-auto">
                      {preview.ingredients.slice(0, 20).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {preview.instructions?.length ? (
                  <div>
                    <div className="font-medium">Instructions</div>
                    <div className="max-h-32 overflow-auto whitespace-pre-wrap hide-scrollbar">
                      {preview.instructions.join("\n")}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/recipe/${preview.id}/view`}>
                      <ExternalLink className="mr-1" />
                      Open
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const body = encodeURIComponent(`${preview.title}`);
                      location.href = `sms:?&body=${body}`;
                    }}
                  >
                    SMS
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                  >
                    Print
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cookbook Builder Dialog */}
      <CookbookBuilderDialog
        open={cookbookBuilderOpen}
        onOpenChange={setCookbookBuilderOpen}
        recipes={cookbookBuilderRecipes}
        collectionName={cookbookBuilderTitle}
        language={appLanguage}
        onLanguageChange={(newLang) => {
          // Language change handled within dialog
        }}
        languageOptions={languageOptions}
        onSaveToOperationsDocs={(cookbook) => {
          toast({
            title: "Cookbook saved",
            description: `"${cookbook.name}" has been saved to Operations Docs.`,
          });
          setCookbookBuilderOpen(false);
        }}
      />

      {/* Recipe Import Modal for Knowledge Base Training */}
      <RecipeImportSelectionModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        recipes={importModalRecipes}
        onImport={handleImportRecipesToKnowledge}
        isLoading={isImportingToKnowledge}
        bookName={importingBook || "Cookbook"}
      />

      {/* Echo Training Progress Notification */}
      {isTraining && (
        <div className="fixed bottom-24 right-6 z-50 max-w-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="flex items-center justify-center h-5 w-5">
                  <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  🧠 Training Echo AI
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-words">
                  {trainingProgress || "Preparing recipes..."}
                </p>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded px-3 py-2">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Echo is learning from your imported recipes. This window will close when complete.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Echo Training Result Notification - Persists after training */}
      {showTrainingResult && trainingResult && (
        <div className="fixed bottom-24 right-6 z-50 max-w-sm">
          <div className="bg-white dark:bg-zinc-900 border border-green-200 dark:border-green-700/50 rounded-lg shadow-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex items-center justify-center h-5 w-5">
                    <span className="text-lg">✅</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Knowledge Base Updated
                  </h3>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {trainingResult.success} recipe{trainingResult.success !== 1 ? "s" : ""} stored
                    {trainingResult.failed > 0 && ` (${trainingResult.failed} failed)`}
                  </p>
                </div>
              </div>
              <button
                onClick={dismissTrainingResult}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded px-3 py-2">
              <p className="text-xs text-green-700 dark:text-green-300">
                Echo AI can now recall these recipes instantly during culinary questions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
