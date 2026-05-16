import { fetchHelpMissions, fetchHelpArticles } from "./builder-client";
import {
  storeMissions,
  storeArticles,
  logSyncAttempt,
  getLastSyncTimestamp,
} from "./missions-db";

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SYNC_TIMEOUT_MS = 30 * 1000; // 30 seconds timeout per sync

interface SyncResult {
  success: boolean;
  missionsCount: number;
  articlesCount: number;
  error?: string;
  timestamp: Date;
}

/**
 * Determine if content needs syncing
 */
async function shouldSyncContent(contentType: string): Promise<boolean> {
  // BUILDER_API_KEY is optional - sync only if available
  // Otherwise, missions will be loaded from Builder CMS or database
  if (!process.env.BUILDER_API_KEY) {
    console.debug("[SyncMissions] BUILDER_API_KEY not set, Builder.io sync disabled");
    return false;
  }

  const lastSync = await getLastSyncTimestamp(contentType);

  // Sync if never synced before
  if (!lastSync) {
    return true;
  }

  // Sync if last sync was more than SYNC_INTERVAL_MS ago
  const timeSinceLastSync = Date.now() - lastSync.getTime();
  return timeSinceLastSync > SYNC_INTERVAL_MS;
}

/**
 * Sync missions and articles from Builder.io to database
 */
export async function syncMissionsWithBuilder(): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    success: false,
    missionsCount: 0,
    articlesCount: 0,
    timestamp: new Date(),
  };

  // Check if sync is needed
  const needsSync = await shouldSyncContent("all");
  if (!needsSync) {
    console.debug("[SyncMissions] Sync not needed, content is recent");
    return result;
  }

  try {
    // Log sync started
    await logSyncAttempt("all", "in_progress");

    // Fetch missions and articles from Builder.io with timeout
    const fetchPromise = Promise.all([
      fetchHelpMissions(undefined, 500),
      fetchHelpArticles(undefined, 500),
    ]);

    const timeoutPromise = new Promise<[any[], any[]]>((_, reject) =>
      setTimeout(
        () => reject(new Error("Sync timeout")),
        SYNC_TIMEOUT_MS,
      ),
    );

    const [missions, articles] = await Promise.race([
      fetchPromise,
      timeoutPromise,
    ]);

    // Store in database
    result.missionsCount = await storeMissions(missions);
    result.articlesCount = await storeArticles(articles);

    // Log successful sync
    await logSyncAttempt("all", "completed", result.missionsCount);

    result.success = true;
    console.log(
      `[SyncMissions] Synced ${result.missionsCount} missions and ${result.articlesCount} articles in ${Date.now() - startTime}ms`,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[SyncMissions] Sync failed:", errorMessage);

    // Log failed sync
    await logSyncAttempt("all", "failed", 0, errorMessage);

    result.error = errorMessage;
  }

  return result;
}

/**
 * Sync missions only from Builder.io
 */
export async function syncMissionsOnly(): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    success: false,
    missionsCount: 0,
    articlesCount: 0,
    timestamp: new Date(),
  };

  try {
    // Log sync started
    await logSyncAttempt("missions", "in_progress");

    // Fetch missions from Builder.io with timeout
    const fetchPromise = fetchHelpMissions(undefined, 500);

    const timeoutPromise = new Promise<any[]>((_, reject) =>
      setTimeout(
        () => reject(new Error("Sync timeout")),
        SYNC_TIMEOUT_MS,
      ),
    );

    const missions = await Promise.race([fetchPromise, timeoutPromise]);

    // Store in database
    result.missionsCount = await storeMissions(missions);

    // Log successful sync
    await logSyncAttempt("missions", "completed", result.missionsCount);

    result.success = true;
    console.log(
      `[SyncMissions] Synced ${result.missionsCount} missions in ${Date.now() - startTime}ms`,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[SyncMissions] Missions sync failed:", errorMessage);

    // Log failed sync
    await logSyncAttempt("missions", "failed", 0, errorMessage);

    result.error = errorMessage;
  }

  return result;
}

/**
 * Sync articles only from Builder.io
 */
export async function syncArticlesOnly(): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    success: false,
    missionsCount: 0,
    articlesCount: 0,
    timestamp: new Date(),
  };

  try {
    // Log sync started
    await logSyncAttempt("articles", "in_progress");

    // Fetch articles from Builder.io with timeout
    const fetchPromise = fetchHelpArticles(undefined, 500);

    const timeoutPromise = new Promise<any[]>((_, reject) =>
      setTimeout(
        () => reject(new Error("Sync timeout")),
        SYNC_TIMEOUT_MS,
      ),
    );

    const articles = await Promise.race([fetchPromise, timeoutPromise]);

    // Store in database
    result.articlesCount = await storeArticles(articles);

    // Log successful sync
    await logSyncAttempt("articles", "completed", result.articlesCount);

    result.success = true;
    console.log(
      `[SyncMissions] Synced ${result.articlesCount} articles in ${Date.now() - startTime}ms`,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[SyncMissions] Articles sync failed:", errorMessage);

    // Log failed sync
    await logSyncAttempt("articles", "failed", 0, errorMessage);

    result.error = errorMessage;
  }

  return result;
}
