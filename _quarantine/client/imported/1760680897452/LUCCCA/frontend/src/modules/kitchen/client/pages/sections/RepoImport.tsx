import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/context/AppDataContext";

export default function RepoImportSection() {
  const { addRecipesFromJsonFiles, recipes, clearRecipes, linkImagesToRecipesByFilename } = useAppData();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ file: string; error: string }[]>([]);
  const [importedTitles, setImportedTitles] = useState<string[]>([]);

  const importPasted = async () => {
    setStatus(null);
    setErrors([]);
    setImportedTitles([]);
    try {
      const trimmed = text.trim();
      if (!trimmed) { setStatus("Paste JSON first."); return; }
      // Validate JSON before creating a File
      let parsed: any;
      try { parsed = JSON.parse(trimmed); } catch (e: any) { setStatus("Invalid JSON: " + (e?.message || "Parse error")); return; }
      const file = new File([new Blob([JSON.stringify(parsed)], { type: "application/json" })], "pasted.json", { type: "application/json" });
      const { added, errors, titles } = await addRecipesFromJsonFiles([file]);
      setErrors(errors);
      if (titles?.length) setImportedTitles(titles);
      setStatus(`Imported ${added} recipe(s).${errors.length ? ` ${errors.length} item(s) had issues.` : ""}`);
      linkImagesToRecipesByFilename();
    } catch (e: any) {
      setStatus(`Import failed: ${e?.message ?? "error"}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4 md:p-6 bg-background">
        <div className="text-sm text-muted-foreground">Paste your recipes JSON below</div>
        <textarea
          value={text}
          onChange={(e)=>setText(e.target.value)}
          placeholder='[{"title":"My Recipe","ingredients":["..."],"instructions":["..."]}]'
          className="mt-3 w-full min-h-[320px] rounded-md border bg-background p-3 font-mono text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={importPasted}>Import</Button>
          <Button variant="secondary" onClick={()=>setText("")}>Clear text</Button>
          <Button variant="destructive" onClick={()=>clearRecipes()}>Clear all recipes ({recipes.length})</Button>
        </div>
        {status && <div className="mt-3 rounded-md border p-3 text-sm">{status}</div>}
        {errors.length > 0 && (
          <div className="mt-3 rounded-md border p-3 text-sm">
            <div className="font-medium mb-2">Errors</div>
            <ul className="space-y-1 list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}><span className="font-mono">{e.file}</span>: {e.error}</li>
              ))}
            </ul>
          </div>
        )}
        {importedTitles.length > 0 && (
          <div className="mt-3 rounded-md border p-3 text-xs max-h-40 overflow-auto">
            <div className="font-medium mb-1">Imported:</div>
            <ul className="space-y-1 list-disc pl-4">
              {importedTitles.map((t, i) => (<li key={i} className="truncate" title={t}>{t}</li>))}
            </ul>
          </div>
        )}
        <div className="mt-3 text-xs text-muted-foreground">
          JSON can be a single object or an array. Supported fields: title, description, ingredients[], instructions[], tags[], images[].
        </div>
      </div>
    </div>
  );
}
