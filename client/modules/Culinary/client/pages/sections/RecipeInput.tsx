import React, { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/context/AppDataContext";
import { useTranslation } from "@/context/LanguageContext";

export default function RecipeInputSection() {
  const { t } = useTranslation();
  const { addRecipesFromJsonFiles, addRecipesFromDocxFiles, addRecipesFromHtmlFiles, addFromZipArchive, addRecipesFromPdfFiles, addRecipesFromExcelFiles, addRecipesFromImageOcr, clearRecipes, recipes, linkImagesToRecipesByFilename } = useAppData();
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ file: string; error: string }[]>([]);
  const [zipUrl, setZipUrl] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [importedTitles, setImportedTitles] = useState<string[]>([]);

  const onFiles = async (files: File[]) => {
    const list = Array.from(files);
    const jsonFiles = list.filter((f) => f.type.includes("json") || f.name.toLowerCase().endsWith(".json"));
    const docxFiles = list.filter((f) => f.name.toLowerCase().endsWith(".docx"));
    const htmlFiles = list.filter((f) => /\.(html?|htm)$/i.test(f.name));
    const pdfFiles = list.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    const xlsFiles = list.filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name));
    const imageFiles = list.filter((f) => f.type.startsWith("image/") || /\.(png|jpe?g|webp|heic|heif)$/i.test(f.name));
    const zipFiles = list.filter((f) => f.type.includes("zip") || f.name.toLowerCase().endsWith(".zip"));

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
    setStatus(t("recipeInput.processing"));

    let importedCount = 0;
    const allErrors: { file: string; error: string }[] = [];

    const runInChunks = async <T, R>(items: T[], size: number, handler: (chunk: T[]) => Promise<R>, after?: (chunk: T[], result: R) => void) => {
      for (let i = 0; i < items.length; i += size) {
        const chunk = items.slice(i, i + size);
        const result = await handler(chunk);
        after?.(chunk, result);
        setProcessed((p) => p + chunk.length);
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      }
    };

    await runInChunks(jsonFiles, 25, addRecipesFromJsonFiles, (chunk, { added, errors, titles }) => {
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
    });

    await runInChunks(docxFiles, 10, addRecipesFromDocxFiles, (chunk, { added, errors, titles }) => {
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
    });

    await runInChunks(htmlFiles, 15, addRecipesFromHtmlFiles, (chunk, { added, errors, titles }) => {
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
    });

    await runInChunks(pdfFiles, 6, addRecipesFromPdfFiles, (chunk, { added, errors, titles }) => {
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
    });

    await runInChunks(xlsFiles, 6, addRecipesFromExcelFiles, (chunk, { added, errors, titles }) => {
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
    });

    await runInChunks(imageFiles, 10, addRecipesFromImageOcr, (chunk, { added, errors, titles }) => {
      importedCount += added;
      allErrors.push(...errors);
      if (titles?.length) setImportedTitles((t) => [...t, ...titles]);
    });

    for (const z of zipFiles) {
      const res = await addFromZipArchive(z);
      importedCount += res.addedRecipes;
      for (const e of res.errors) allErrors.push({ file: e.entry, error: e.error });
      if (res.titles?.length) setImportedTitles((t) => [...t, ...res.titles]);
      setProcessed((p) => p + 1);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    }

    setErrors(allErrors);
    setStatus(t("recipeInput.importedRecipesCount").replace("{importedCount}", String(importedCount)).replace("{allErrors}", allErrors.length ? ` ${allErrors.length} item(s) had issues.` : ""));
  };

  const importFromUrl = async () => {
    if (!zipUrl) return;
    try {
      setLoadingUrl(true);
      setStatus(t("recipeInput.downloading"));
      const resp = await fetch(zipUrl);
      const contentType = resp.headers.get('content-type') || '';
      // Try JSON first (works for luccca_variant_* exports)
      if (/json|javascript/.test(contentType) || zipUrl.toLowerCase().endsWith('.json')) {
        try {
          const data = await resp.json();
          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          const name = (zipUrl.split('/').pop() || 'import.json').replace(/\?.*$/,'');
          const file = new File([blob], name, { type: 'application/json' });
          const { added, errors: errs, titles } = await addRecipesFromJsonFiles([file]);
          setErrors(errs);
          setStatus(`Imported ${added} recipe(s) from JSON${titles.length?`: ${titles.slice(0,5).join(', ')}${titles.length>5?' …':''}`:''}.`);
          return;
        } catch { /* fallthrough to ZIP */ }
      }
      // Fallback to ZIP or other blobs
      const blob = await resp.blob();
      const name = (zipUrl.split("/").pop() || "import.zip").replace(/\?.*$/,'');
      const file = new File([blob], name, { type: blob.type || "application/zip" });
      const res = await addFromZipArchive(file);
      setErrors(res.errors.map((e) => ({ file: e.entry, error: e.error })));
      setStatus(`Imported ${res.addedRecipes} recipe(s) and ${res.addedImages} image(s) from ZIP.`);
    } catch (e: any) {
      setStatus(t("recipeInput.failedImportUrl").replace("{e}", e?.message ?? "error"));
    } finally {
      setLoadingUrl(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Dropzone accept=".json,application/json,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.html,.htm,text/html,.pdf,application/pdf,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel,.csv,text/csv,application/zip,application/x-zip-compressed,.zip,image/*" multiple onFiles={onFiles}>
          <div className="flex flex-col items-center justify-center gap-2 text-sm">
            <div className="text-foreground font-medium">Drag & drop any number of files or entire ZIP exports—Word, PDF, Excel, HTML, JSON, or images.</div>
            <div className="text-muted-foreground">We’ll queue everything automatically and auto-detect titles, ingredients, and instructions.</div>
          </div>
        </Dropzone>

        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">{t("recipeInput.importedRecipes")}</div>
          <div className="mt-1 text-2xl font-semibold">{recipes.length}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => linkImagesToRecipesByFilename()}>
              {t("recipeInput.linkImagesByFilename")}
            </Button>
            <Button variant="destructive" onClick={() => clearRecipes()}>{t("recipeInput.clearRecipes")}</Button>
          </div>

          <div className="mt-6">
            {total > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">{processed} / {total} files processed</div>
                {/* Progress bar */}
                <div className="h-2 w-full rounded bg-muted">
                  <div className="h-2 rounded bg-primary transition-all" style={{ width: `${Math.round((processed / Math.max(total,1)) * 100)}%` }} />
                </div>
                {importedTitles.length > 0 && (
                  <div className="max-h-40 overflow-auto rounded border p-2 text-xs">
                    <div className="font-medium mb-1">{t("recipeInput.imported")}</div>
                    <ul className="space-y-1 list-disc pl-4">
                      {importedTitles.map((t, i) => (
                        <li key={i} className="truncate" title={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 space-y-2">
            <div className="text-sm font-medium">{t("common.import")} Recipes {t("recipeSearch.pasteUrl").includes("http") ? "from URL" : "from URL"}</div>
            <div className="flex gap-2">
              <input
                value={zipUrl}
                onChange={(e) => setZipUrl(e.target.value)}
                placeholder={t("recipeInput.placeholderUrl")}
                className="flex-1 rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={importFromUrl} disabled={loadingUrl || !zipUrl}>
                {loadingUrl ? t("recipeInput.importing") : t("recipeInput.import")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {status && (
        <div className="rounded-md border p-3 text-sm">{status}</div>
      )}
      {errors.length > 0 && (
        <div className="rounded-md border p-3 text-sm">
          <div className="font-medium mb-2">{t("recipeInput.errors")}</div>
          <ul className="space-y-1 list-disc pl-5">
            {errors.map((e, i) => (
              <li key={i}>
                <span className="font-mono">{e.file}</span>: {e.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tip removed per request */}
    </div>
  );
}
