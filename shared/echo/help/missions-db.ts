import type { HelpMission, HelpArticle, HelpMissionStep } from "./types";

interface DatabaseClient {
  query<T = any>(sql: string, values?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, values?: any[]): Promise<T | null>;
  exec(sql: string, values?: any[]): Promise<void>;
}

let dbClient: DatabaseClient | null = null;

export function setDatabaseClient(client: DatabaseClient) {
  dbClient = client;
}

/**
 * Store missions in the database
 */
export async function storeMissions(missions: HelpMission[]) {
  if (!dbClient) {
    console.warn("[MissionsDB] Database client not configured");
    return 0;
  }

  let storedCount = 0;

  for (const mission of missions) {
    try {
      // Insert mission
      await dbClient.exec(
        `
        INSERT INTO help_missions (
          id, slug, title, description, module, difficulty, roles,
          builder_id, synced_from_builder, last_updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
        ON CONFLICT (id) DO UPDATE SET
          slug = $2,
          title = $3,
          description = $4,
          module = $5,
          difficulty = $6,
          roles = $7,
          synced_from_builder = true,
          last_updated_at = NOW(),
          updated_at = NOW()
        `,
        [
          mission.id,
          mission.slug || `mission-${mission.id}`,
          mission.title,
          mission.description,
          mission.module,
          mission.difficulty || "beginner",
          mission.roles || [],
          mission.id, // builder_id
        ],
      );

      // Insert mission steps
      if (mission.steps && Array.isArray(mission.steps)) {
        for (let i = 0; i < mission.steps.length; i++) {
          const step = mission.steps[i];
          const stepId = `${mission.id}-step-${i}`;

          await dbClient.exec(
            `
            INSERT INTO help_mission_steps (
              id, mission_id, step_index, title, description,
              target_selector, action_type, completion_event
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (mission_id, step_index) DO UPDATE SET
              title = $4,
              description = $5,
              target_selector = $6,
              action_type = $7,
              completion_event = $8,
              updated_at = NOW()
            `,
            [
              stepId,
              mission.id,
              i,
              step.title,
              step.description || "",
              step.targetSelector || null,
              step.actionType,
              step.completionEvent || null,
            ],
          );
        }
      }

      storedCount++;
    } catch (err) {
      console.error(`[MissionsDB] Failed to store mission ${mission.id}:`, err);
    }
  }

  return storedCount;
}

/**
 * Store articles in the database
 */
export async function storeArticles(articles: HelpArticle[]) {
  if (!dbClient) {
    console.warn("[MissionsDB] Database client not configured");
    return 0;
  }

  let storedCount = 0;

  for (const article of articles) {
    try {
      await dbClient.exec(
        `
        INSERT INTO help_articles (
          id, slug, title, body, module, route_pattern,
          audience_roles, tags, kcs_state, created_by,
          builder_id, synced_from_builder, last_updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
        ON CONFLICT (id) DO UPDATE SET
          slug = $2,
          title = $3,
          body = $4,
          module = $5,
          route_pattern = $6,
          audience_roles = $7,
          tags = $8,
          kcs_state = $9,
          created_by = $10,
          synced_from_builder = true,
          last_updated_at = NOW(),
          updated_at = NOW()
        `,
        [
          article.id,
          article.slug,
          article.title,
          article.body,
          article.module || null,
          article.routePattern || null,
          article.audienceRoles || [],
          article.tags || [],
          article.kcsState || "draft",
          article.createdBy || null,
          article.id, // builder_id
        ],
      );
      storedCount++;
    } catch (err) {
      console.error(`[MissionsDB] Failed to store article ${article.id}:`, err);
    }
  }

  return storedCount;
}

/**
 * Fetch missions from database
 */
export async function fetchMissionsFromDb(
  limit?: number,
): Promise<HelpMission[]> {
  if (!dbClient) {
    console.warn("[MissionsDB] Database client not configured");
    return [];
  }

  try {
    const missions = await dbClient.query<any>(
      `
      SELECT
        m.id, m.slug, m.title, m.description, m.module,
        m.difficulty, m.roles, m.last_updated_at
      FROM help_missions m
      ORDER BY m.created_at DESC
      ${limit ? `LIMIT ${Math.min(limit, 500)}` : ""}
      `,
    );

    // Fetch steps for each mission
    const missionsWithSteps = await Promise.all(
      missions.map(async (m) => {
        const steps = await dbClient.query<any>(
          `
          SELECT id, title, description, target_selector as "targetSelector",
                 action_type as "actionType", completion_event as "completionEvent"
          FROM help_mission_steps
          WHERE mission_id = $1
          ORDER BY step_index ASC
          `,
          [m.id],
        );

        return {
          ...m,
          steps: steps as HelpMissionStep[],
        } as HelpMission;
      }),
    );

    return missionsWithSteps;
  } catch (err) {
    console.error("[MissionsDB] Failed to fetch missions:", err);
    return [];
  }
}

/**
 * Fetch articles from database
 */
export async function fetchArticlesFromDb(
  limit?: number,
): Promise<HelpArticle[]> {
  if (!dbClient) {
    console.warn("[MissionsDB] Database client not configured");
    return [];
  }

  try {
    const articles = await dbClient.query<HelpArticle>(
      `
      SELECT
        id, slug, title, body, module, route_pattern as "routePattern",
        audience_roles as "audienceRoles", tags, kcs_state as "kcsState",
        created_by as "createdBy", last_updated_at as "lastUpdatedAt"
      FROM help_articles
      ORDER BY created_at DESC
      ${limit ? `LIMIT ${Math.min(limit, 500)}` : ""}
      `,
    );

    return articles;
  } catch (err) {
    console.error("[MissionsDB] Failed to fetch articles:", err);
    return [];
  }
}

/**
 * Search missions by keyword
 */
export async function searchMissionsInDb(
  query: string,
  limit: number = 20,
): Promise<HelpMission[]> {
  if (!dbClient) {
    console.warn("[MissionsDB] Database client not configured");
    return [];
  }

  try {
    const missions = await dbClient.query<any>(
      `
      SELECT
        m.id, m.slug, m.title, m.description, m.module,
        m.difficulty, m.roles, m.last_updated_at
      FROM help_missions m
      WHERE m.title ILIKE $1 OR m.description ILIKE $1
      ORDER BY m.created_at DESC
      LIMIT $2
      `,
      [`%${query}%`, limit],
    );

    // Fetch steps for each mission
    const missionsWithSteps = await Promise.all(
      missions.map(async (m) => {
        const steps = await dbClient.query<any>(
          `
          SELECT id, title, description, target_selector as "targetSelector",
                 action_type as "actionType", completion_event as "completionEvent"
          FROM help_mission_steps
          WHERE mission_id = $1
          ORDER BY step_index ASC
          `,
          [m.id],
        );

        return {
          ...m,
          steps: steps as HelpMissionStep[],
        } as HelpMission;
      }),
    );

    return missionsWithSteps;
  } catch (err) {
    console.error("[MissionsDB] Failed to search missions:", err);
    return [];
  }
}

/**
 * Get single mission by ID
 */
export async function getMissionFromDb(missionId: string): Promise<HelpMission | null> {
  if (!dbClient) {
    console.warn("[MissionsDB] Database client not configured");
    return null;
  }

  try {
    const mission = await dbClient.queryOne<any>(
      `
      SELECT
        id, slug, title, description, module,
        difficulty, roles, last_updated_at
      FROM help_missions
      WHERE id = $1
      `,
      [missionId],
    );

    if (!mission) return null;

    const steps = await dbClient.query<any>(
      `
      SELECT id, title, description, target_selector as "targetSelector",
             action_type as "actionType", completion_event as "completionEvent"
      FROM help_mission_steps
      WHERE mission_id = $1
      ORDER BY step_index ASC
      `,
      [missionId],
    );

    return {
      ...mission,
      steps: steps as HelpMissionStep[],
    } as HelpMission;
  } catch (err) {
    console.error(`[MissionsDB] Failed to fetch mission ${missionId}:`, err);
    return null;
  }
}

/**
 * Log sync attempt
 */
export async function logSyncAttempt(
  contentType: string,
  status: "pending" | "in_progress" | "completed" | "failed",
  totalSynced: number = 0,
  errorMessage?: string,
) {
  if (!dbClient) return;

  try {
    await dbClient.exec(
      `
      INSERT INTO help_content_sync (
        content_type, sync_status, total_synced, error_message, synced_at
      ) VALUES ($1, $2, $3, $4, NOW())
      `,
      [contentType, status, totalSynced, errorMessage || null],
    );
  } catch (err) {
    console.error("[MissionsDB] Failed to log sync:", err);
  }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTimestamp(
  contentType: string,
): Promise<Date | null> {
  if (!dbClient) return null;

  try {
    const result = await dbClient.queryOne<{ synced_at: string }>(
      `
      SELECT synced_at FROM help_content_sync
      WHERE content_type = $1 AND sync_status = 'completed'
      ORDER BY synced_at DESC
      LIMIT 1
      `,
      [contentType],
    );

    return result ? new Date(result.synced_at) : null;
  } catch (err) {
    console.error("[MissionsDB] Failed to get last sync timestamp:", err);
    return null;
  }
}
