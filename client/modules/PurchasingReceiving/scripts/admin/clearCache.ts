#!/usr/bin/env node import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);
interface CacheEntry {
  key: string;
  expires_at: string;
}
async function clearCache(pattern?: string) {
  try {
    console.log("Clearing cache from system...");
    let query = supabase.from("cache_entries").select("key");
    if (pattern) {
      query = query.ilike("key", `%${pattern}%`);
      console.log(`Clearing cache entries matching pattern:"${pattern}"`);
    } else {
      console.log("Clearing all cache entries...");
    }
    const { data: entries, error: fetchError } = await query;
    if (fetchError) {
      console.error("Error fetching cache entries:", fetchError.message);
      return;
    }
    if (!entries || entries.length === 0) {
      console.log("No cache entries found to clear.");
      return;
    }
    const keysToDelete = entries.map((entry: CacheEntry) => entry.key);
    const { error: deleteError } = await supabase
      .from("cache_entries")
      .delete()
      .in("key", keysToDelete);
    if (deleteError) {
      console.error("Error deleting cache entries:", deleteError.message);
      return;
    }
    console.log(`✓ Successfully cleared ${keysToDelete.length} cache entries.`);
    if (pattern) {
      console.log(` Pattern:"${pattern}"`);
    }
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
  }
}
async function clearExpiredCache() {
  try {
    console.log("Clearing expired cache entries...");
    const now = new Date().toISOString();
    const { data: expiredEntries, error: fetchError } = await supabase
      .from("cache_entries")
      .select("key")
      .lt("expires_at", now);
    if (fetchError) {
      console.error(
        "Error fetching expired cache entries:",
        fetchError.message,
      );
      return;
    }
    if (!expiredEntries || expiredEntries.length === 0) {
      console.log("No expired cache entries found.");
      return;
    }
    const keysToDelete = expiredEntries.map((entry: CacheEntry) => entry.key);
    const { error: deleteError } = await supabase
      .from("cache_entries")
      .delete()
      .in("key", keysToDelete);
    if (deleteError) {
      console.error(
        "Error deleting expired cache entries:",
        deleteError.message,
      );
      return;
    }
    console.log(
      `✓ Successfully cleared ${keysToDelete.length} expired cache entries.`,
    );
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
  }
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage:");
    console.log(" ts-node scripts/admin/clearCache.ts # Clear all cache");
    console.log(
      " ts-node scripts/admin/clearCache.ts <pattern> # Clear cache by pattern",
    );
    console.log(
      " ts-node scripts/admin/clearCache.ts --expired # Clear expired cache entries",
    );
    console.log("\nExamples:");
    console.log(" ts-node scripts/admin/clearCache.ts");
    console.log(' ts-node scripts/admin/clearCache.ts"invoice%"');
    console.log(" ts-node scripts/admin/clearCache.ts --expired");
    process.exit(1);
  }
  const command = args[0];
  if (command === "--expired") {
    await clearExpiredCache();
  } else {
    await clearCache(command);
  }
}
main();
