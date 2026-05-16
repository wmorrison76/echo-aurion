/**
 * Import Master Dictionary → server/data/master-dictionary.json + vector store
 * -------------------------------------------------------------------------
 * - Exports culinary master dictionary terms to a JSON file used by ingestion UI
 * - Immediately ingests terms into the server vector store (file-backed)
 *
 * Run:
 *   pnpm tsx scripts/echoai3/import-master-dictionary.ts
 */

import fs from "fs";
import path from "path";

import { masterCulinaryDictionary } from "../../client/modules/Culinary/server/lib/master-culinary-dictionary";
import { uploadedTermsStore } from "../../client/modules/Culinary/server/lib/uploaded-terms-store";
import { vectorProvider } from "../../server/lib/vector-provider";

type ExportedTerm = {
  term: string;
  definition: string;
  source: "master-culinary-dictionary" | "uploaded-terms";
};

function normalizeKey(term: string) {
  return (term || "").toLowerCase().trim().replace(/\s+/g, " ");
}

async function main() {
  const dataDir = path.join(process.cwd(), "server", "data");
  const outFile = path.join(dataDir, "master-dictionary.json");

  fs.mkdirSync(dataDir, { recursive: true });

  // Load uploaded terms (if any)
  await uploadedTermsStore.ensureLoaded();

  const masterTerms = masterCulinaryDictionary.getAllTerms();
  const uploadedTerms = uploadedTermsStore.getAllTerms();

  const merged = new Map<string, ExportedTerm>();

  for (const t of masterTerms) {
    const key = normalizeKey(t.term);
    if (!key) continue;
    merged.set(key, {
      term: t.term,
      definition: t.definition || t.term,
      source: "master-culinary-dictionary",
    });
  }

  for (const t of uploadedTerms) {
    const key = normalizeKey(t.term);
    if (!key) continue;
    // Uploaded terms override master if they exist (more recent)
    merged.set(key, {
      term: t.term,
      definition: t.definition || t.term,
      source: "uploaded-terms",
    });
  }

  const exported = Array.from(merged.values()).sort((a, b) =>
    a.term.localeCompare(b.term),
  );

  fs.writeFileSync(outFile, JSON.stringify(exported, null, 2));

  // Ingest into vector store immediately
  let ingested = 0;
  for (const t of exported) {
    const id = `md:${normalizeKey(t.term).replace(/\s+/g, "-")}`;
    await vectorProvider.storeRecipeVector({
      id,
      title: t.term,
      description: t.definition,
      ingredients: [],
      track: "manufacturing",
      metadata: {
        source: "master-dictionary",
        sourceSystem: t.source,
        term: t.term,
        definition: t.definition,
      },
    });
    ingested++;
    if (ingested % 1000 === 0) {
      // eslint-disable-next-line no-console
      console.log(`[EchoAi^3] Ingested ${ingested}/${exported.length} terms...`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[EchoAi^3] Master Dictionary import complete: ${exported.length} terms exported, ${ingested} ingested.`,
  );
  // eslint-disable-next-line no-console
  console.log(`[EchoAi^3] Wrote: ${outFile}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[EchoAi^3] Import failed:", err);
  process.exit(1);
});

