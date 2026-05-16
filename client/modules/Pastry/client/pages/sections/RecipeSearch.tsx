import React from "react";
import { useAppData } from "@/context/AppDataContext";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Star,
  LayoutGrid,
  Rows,
  List,
  Trash2,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { axisOptions } from "@/lib/taxonomy";

export function RecipeCard({
  r,
  onPreview,
  onFav,
  onRate,
  onTrash,
  inTrash,
  onDestroy,
}: {
  r: ReturnType<typeof useAppData>["recipes"][number];
  onPreview: () => void;
  onFav: () => void;
  onRate: (n: number) => void;
  onTrash: () => void;
  inTrash?: boolean;
  onDestroy?: () => void;
}) {
  const cover = r.imageDataUrls?.[0];
  const stars = Array.from({ length: 5 }, (_, i) => i < (r.rating || 0));
  return (
    <div
      className="rounded-xl border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden glow"
      data-echo-key="card:recipes:result"
    >
      <div className="grid grid-cols-[120px_1fr] gap-3 p-3 items-start">
        {cover ? (
          <img
            src={cover}
            alt={r.title}
            className="h-[110px] w-[110px] object-cover rounded"
            loading="lazy"
          />
        ) : (
          <div className="h-[110px] w-[110px] bg-muted rounded flex items-center justify-center text-muted-foreground">
            No Image
          </div>
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="flex items-start justify-between gap-2">
            <h2 className="m-0 text-base font-semibold line-clamp-1">
              {r.title}
            </h2>
            <button
              className={`shrink-0 p-1 rounded ${r.favorite ? "text-yellow-500" : "text-muted-foreground"} hover:bg-black/5`}
              onClick={onFav}
              aria-label="Favorite"
            >
              <Star className={r.favorite ? "fill-current" : ""} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {stars.map((on, i) => (
              <button
                key={i}
                className={`p-0.5 ${on ? "text-yellow-500" : "text-muted-foreground"}`}
                onClick={() => onRate(i + 1)}
                aria-label={`rate ${i + 1}`}
              >
                ★
              </button>
            ))}
          </div>
          {r.tags?.length ? (
            <p className="m-0 text-xs text-muted-foreground">
              {r.tags.slice(0, 5).join(" · ")}
            </p>
          ) : null}
          {r.ingredients?.length ? (
            <ul className="mt-2 mb-0 text-xs text-muted-foreground max-h-10 overflow-hidden hide-scrollbar list-disc pl-4">
              {r.ingredients.slice(0, 5).map((x, i) => (
                <li key={i} className="truncate" title={x}>
                  {x}
                </li>
              ))}
              {r.ingredients.length > 5 && (
                <li className="list-none">+{r.ingredients.length - 5} more</li>
              )}
            </ul>
          ) : null}
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={onPreview}>
              Preview
            </Button>
            {inTrash ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onTrash}
                  title="Restore"
                >
                  <RotateCcw />
                </Button>
                {onDestroy && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onDestroy}
                    title="Delete forever"
                  >
                    <Trash2 />
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={onTrash}
                title="Move to trash"
              >
                <Trash2 />
              </Button>
            )}
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                try {
                  const draft = {
                    recipeName: r.title,
                    ingredients: (r.ingredients || []).map((s: string) => ({
                      qty: "",
                      unit: "",
                      item: String(s),
                      prep: "",
                      yield: "",
                      cost: "",
                    })),
                    directions: Array.isArray(r.instructions)
                      ? (r.instructions as any[])
                          .map(String)
                          .map((x, i) => `${i + 1}. ${x}`)
                          .join("\n")
                      : String((r as any).instructions || ""),
                    taxonomy: (r.extra as any)?.taxonomy || undefined,
                  };
                  localStorage.setItem("recipe:draft", JSON.stringify(draft));
                } catch {}
                location.href = "/?tab=add-recipe";
              }}
            >
              Edit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    deleteRecipe,
    restoreRecipe,
    exportAllZip,
    addImages,
    destroyRecipe,
    purgeDeleted,
  } = useAppData();
  const [q, setQ] = React.useState("");
  type Cat = "all" | "recent" | "top" | "favorites" | "uncategorized" | "trash";
  const [cat, setCat] = React.useState<Cat>("all");
  // Taxonomy filters
  const [fcuisine, setFCuisine] = React.useState<string>("");
  const [ftech, setFTech] = React.useState<string>("");
  const [fcourse, setFCourse] = React.useState<string>("");
  const [fdiet, setFDiet] = React.useState<string>("");
  const results = React.useMemo(() => {
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
      case "trash":
        return byTitle(filterByTax(base.filter((r) => !!r.deletedAt)));
      default:
        return notDeleted;
    }
  }, [q, searchRecipes, cat, fcuisine, ftech, fcourse, fdiet]);

  const [status, setStatus] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"cards" | "grid4" | "rows">("cards");
  const [query, setQuery] = React.useState("");
  const [errors, setErrors] = React.useState<{ file: string; error: string }[]>([]);
  const [url, setUrl] = React.useState("");
  const [loadingUrl, setLoadingUrl] = React.useState(false);
  const [processed, setProcessed] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [importedTitles, setImportedTitles] = React.useState<string[]>([]);
  // Book PDF import progress state
  const [bookPhase, setBookPhase] = React.useState<
    null | "reading" | "selecting" | "categorizing" | "importing" | "done"
  >(null);
  const [bookFile, setBookFile] = React.useState<string | null>(null);
  const [bookPage, setBookPage] = React.useState(0);
  const [bookTotal, setBookTotal] = React.useState(0);
  const [bookImported, setBookImported] = React.useState<number | null>(null);
  const [tocOpen, setTocOpen] = React.useState(false);
  const [toc, setToc] = React.useState<{ title: string; page: number }[] | null>(
    null,
  );
  const [tocChecked, setTocChecked] = React.useState<Record<string, boolean>>({});
  const pdfPendingRef = React.useRef<File | null>(null);
  // Live scan state
  const [scanOpen, setScanOpen] = React.useState(false);
  const [scanPageNo, setScanPageNo] = React.useState(0);
  const [scanTotal, setScanTotal] = React.useState(0);
  const [detectedOpen, setDetectedOpen] = React.useState(false);
  const [detected, setDetected] = React.useState<{ page: number; title: string }[]>(
    [],
  );
  const [scanPageTexts, setScanPageTexts] = React.useState<string[] | null>(null);
  const [scanCandidates, setScanCandidates] = React.useState<number[] | null>(null);
  const [scanBookName, setScanBookName] = React.useState<string | null>(null);

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

    let importedCount = 0;
    const allErrors: { file: string; error: string }[] = [];

    for (const f of jsonFiles) {
      const { added, errors, titles } = await addRecipesFromJsonFiles([f]);
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
      setProcessed((p) => p + 1);
    }
    for (const f of docxFiles) {
      const { added, errors, titles } = await addRecipesFromDocxFiles([f]);
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
      setProcessed((p) => p + 1);
    }
    for (const f of htmlFiles) {
      const { added, errors, titles } = await addRecipesFromHtmlFiles([f]);
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
      setProcessed((p) => p + 1);
    }
    for (const f of pdfFiles) {
      const { added, errors, titles } = await addRecipesFromPdfFiles([f]);
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
      setProcessed((p) => p + 1);
    }
    for (const f of xlsFiles) {
      const { added, errors, titles } = await addRecipesFromExcelFiles([f]);
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
      setProcessed((p) => p + 1);
    }
    for (const f of imageFiles) {
      const { added, errors, titles } = await addRecipesFromImageOcr([f]);
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
      setProcessed((p) => p + 1);
    }
    for (const z of zipFiles) {
      const res = await addFromZipArchive(z);
      importedCount += res.addedRecipes;
      for (const e of res.errors)
        allErrors.push({ file: e.entry, error: e.error });
      if (res.titles?.length) setImportedTitles((t) => [...t, ...res.titles]);
      setProcessed((p) => p + 1);
    }

    setErrors(allErrors);
    setStatus(
      `Imported ${importedCount} recipe(s).${allErrors.length ? ` ${allErrors.length} item(s) had issues.` : ""}`,
    );
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
          } = await addRecipesFromJsonFiles([file]);
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

  const [preview, setPreview] = React.useState<
    ReturnType<typeof useAppData>["recipes"][number] | null
  >(null);
  const inTrashView = cat === "trash";

  return (
    <div
      className="mx-auto max-w-[1200px] px-4 md:px-6 py-4 space-y-4"
      data-echo-key="page:recipes:search"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {(
            [
              "all",
              "recent",
              "top",
              "favorites",
              "uncategorized",
              "trash",
            ] as Cat[]
          ).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1 rounded-md text-sm ${cat === c ? "bg-background shadow" : "text-foreground/80"}`}
            >
              {c.replace(/^[a-z]/, (s) => s.toUpperCase())}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportAllZip}>
            Export all (ZIP)
          </Button>
          {inTrashView && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (
                  confirm(
                    "Delete all items in Trash permanently? This cannot be undone.",
                  )
                )
                  purgeDeleted();
              }}
            >
              Delete all
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => clearRecipes()}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Dropzone
          className="p-4 min-h-[96px] rounded-lg border border-dashed glow self-start"
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
          <div className="flex flex-col items-center justify-center gap-0.5 text-[11px]">
            <div className="text-foreground font-medium">
              Drag & drop recipes (Word/PDF/Excel/HTML/JSON/ZIP) or images
            </div>
            <div className="text-muted-foreground">
              Auto-detects titles, ingredients, and instructions
            </div>
          </div>
        </Dropzone>
        <div className="rounded-lg border p-2 self-start">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium">Library (Book PDF) Import</div>
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
                    /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[a-zA-Z]+)?\b/;
                  let c = 0;
                  for (const L of ls) {
                    if (qty.test(L) || /^[•\-*]\s+/.test(L)) c++;
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
                  const hasIng =
                    /\bingredients?\b/i.test(t) || isLikelyIngredientList(t);
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
                    if (
                      /^see\b/i.test(guess) ||
                      /(flexipan|inch|inches|cm|diameter)\b/i.test(guess)
                    )
                      guess = "";
                    setDetected((d) => [
                      ...d,
                      { page: p, title: guess || `Candidate p.${p}` },
                    ]);
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
          <div className="mt-3 space-y-1">
            <div className="text-xs font-medium">Import from the web</div>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the web (e.g. 'chocolate cake recipe')"
                className="flex-1 rounded-md border bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <Button
                size="sm"
                variant="outline"
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
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a recipe page URL (https://...)"
                className="flex-1 rounded-md border bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <Button
                size="sm"
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
                    const data = await r.json();
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
      {status && <div className="rounded-md border p-3 text-sm">{status}</div>}
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
                        /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[a-zA-Z]+)?\b/;
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
                        let guess = "";
                        for (let k = 0; k < Math.min(lines.length, 10); k++) {
                          const L = lines[k];
                          if (
                            /^[A-Z][A-Za-z0-9\-\'\s]{2,80}$/.test(L) ||
                            /^([A-Z]\s+){2,}[A-Z][\s:]*$/.test(L)
                          ) {
                            guess = L.replace(/\s+/g, " ").trim();
                            break;
                          }
                        }
                        setDetected((d) => [
                          ...d,
                          { page: p, title: guess || `Candidate p.${p}` },
                        ]);
                      }
                    }
                    // Learn cookbook terminology
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
                      const kb = JSON.parse(raw);
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
                      const { added } = await addRecipesFromJsonFiles([jf]);
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
                      const { added } = await addRecipesFromPdfFiles([
                        pdfPendingRef.current,
                      ]);
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
                        /^(?:\d+(?:\s+\d\/\d)?|\d+\/\d|\d+(?:\.\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s*[a-zA-Z]+)?\b/;
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
                    const { added } = await addRecipesFromJsonFiles([jf]);
                    setStatus(`Imported ${added} recipes from detected list.`);
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
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        data-echo-key="section:recipes:filters"
      >
        <div className="flex-1" data-echo-key="field:recipes:query">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, ingredient, tag…"
            className="w-full rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
          />
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
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
          data-echo-key="section:recipes:results"
        >
          {results.map((r) => (
            <RecipeCard
              key={r.id}
              r={r}
              inTrash={inTrashView}
              onPreview={() => setPreview(r)}
              onFav={() => toggleFavorite(r.id)}
              onRate={(n) => rateRecipe(r.id, n)}
              onTrash={() =>
                r.deletedAt ? restoreRecipe(r.id) : deleteRecipe(r.id)
              }
              onDestroy={() => {
                if (confirm("Delete this recipe forever?")) destroyRecipe(r.id);
              }}
            />
          ))}
        </div>
      ) : mode === "grid4" ? (
        <div
          className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
          data-echo-key="section:recipes:results"
        >
          {results.filter(Boolean).map((r) => (
            <div
              key={r.id || Math.random().toString(36).slice(2)}
              className="rounded border p-3 flex items-start gap-2 glow"
              data-echo-key="card:recipes:result"
            >
              <div className="w-16 h-12 rounded bg-muted overflow-hidden shrink-0">
                {r.imageDataUrls?.[0] ? (
                  <img
                    src={r.imageDataUrls[0]}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div
                  className="font-medium text-sm line-clamp-2"
                  title={r.title}
                >
                  {r.title}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">
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
                        title="Restore"
                      >
                        <RotateCcw />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Delete forever?")) destroyRecipe(r.id);
                        }}
                        title="Delete forever"
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
          ))}
        </div>
      ) : (
        <div
          className="divide-y rounded-lg border glow"
          data-echo-key="section:recipes:results"
        >
          {results.filter(Boolean).map((r) => (
            <div
              key={r.id || Math.random().toString(36).slice(2)}
              className="p-3 flex items-start gap-3"
              data-echo-key="card:recipes:result"
            >
              <div className="w-20 h-16 rounded bg-muted overflow-hidden">
                {r.imageDataUrls?.[0] ? (
                  <img
                    src={r.imageDataUrls[0]}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium line-clamp-1">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString()
                      : "-"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">
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
                        title="Restore"
                      >
                        <RotateCcw />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Delete forever?")) destroyRecipe(r.id);
                        }}
                        title="Delete forever"
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
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-muted-foreground text-center">
        Total recipes in system: {recipes.length}
      </div>

      <details className="rounded-md border p-3 text-sm">
        <summary className="cursor-pointer select-none">
          Knowledge learned from imports
        </summary>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          {(() => {
            try {
              const raw = localStorage.getItem("kb:cook");
              if (!raw)
                return (
                  <div className="text-xs text-muted-foreground col-span-2">
                    No knowledge yet.
                  </div>
                );
              const kb = JSON.parse(raw) || {};
              const top = (obj: any, n: number) =>
                Object.entries(obj || {})
                  .sort((a: any, b: any) => b[1] - a[1])
                  .slice(0, n);
              return (
                <>
                  <div>
                    <div className="font-medium mb-1">Top terms</div>
                    <ul className="list-disc pl-5 space-y-0.5 text-xs">
                      {top(kb.terms, 20).map(([k, v]: any) => (
                        <li key={k}>
                          {k}{" "}
                          <span className="text-muted-foreground">({v})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Top phrases</div>
                    <ul className="list-disc pl-5 space-y-0.5 text-xs">
                      {top(kb.bigrams, 20).map(([k, v]: any) => (
                        <li key={k}>
                          {k}{" "}
                          <span className="text-muted-foreground">({v})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              );
            } catch {
              return (
                <div className="text-xs text-muted-foreground">
                  Unable to read knowledge store.
                </div>
              );
            }
          })()}
        </div>
      </details>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
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
    </div>
  );
}
