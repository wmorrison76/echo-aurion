/**
 * Recent Projects Management
 * Handles syncing of user's recent projects across devices
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface RecentProject {
  id: string;
  user_id: string;
  design_id: string;
  title: string;
  thumbnail_url?: string;
  accessed_at: string;
  created_at: string;
}

/**
 * Add or update a recent project for the user
 */
export async function addRecentProject(
  userId: string,
  designId: string,
  title: string,
  thumbnailUrl?: string,
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !userId) {
    console.warn(
      "Supabase not configured or userId missing - cannot save recent project",
    );
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/recent_projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        user_id: userId,
        design_id: designId,
        title,
        thumbnail_url: thumbnailUrl,
        accessed_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      // If UNIQUE constraint violation (project already exists), try updating
      if (response.status === 409) {
        return await updateRecentProjectAccess(userId, designId);
      }
      throw new Error(`Failed to add recent project: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Error adding recent project:", error);
    return false;
  }
}

/**
 * Update the access time of an existing recent project
 */
export async function updateRecentProjectAccess(
  userId: string,
  designId: string,
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !userId) {
    console.warn(
      "Supabase not configured or userId missing - cannot update recent project",
    );
    return false;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recent_projects?user_id=eq.${userId}&design_id=eq.${designId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          accessed_at: new Date().toISOString(),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update recent project: ${response.statusText}`,
      );
    }

    return true;
  } catch (error) {
    console.error("Error updating recent project access:", error);
    return false;
  }
}

/**
 * Get recent projects for a user (max 10, sorted by most recent)
 */
export async function getRecentProjects(
  userId: string,
): Promise<RecentProject[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !userId) {
    console.warn(
      "Supabase not configured or userId missing - cannot fetch recent projects",
    );
    return [];
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recent_projects?user_id=eq.${userId}&order=accessed_at.desc&limit=10`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch recent projects: ${response.statusText}`,
      );
    }

    const projects: RecentProject[] = await response.json();
    return projects;
  } catch (error) {
    console.error("Error fetching recent projects:", error);
    return [];
  }
}

/**
 * Delete a recent project entry
 */
export async function deleteRecentProject(
  userId: string,
  designId: string,
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !userId) {
    console.warn(
      "Supabase not configured or userId missing - cannot delete recent project",
    );
    return false;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recent_projects?user_id=eq.${userId}&design_id=eq.${designId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to delete recent project: ${response.statusText}`,
      );
    }

    return true;
  } catch (error) {
    console.error("Error deleting recent project:", error);
    return false;
  }
}

/**
 * Clear all recent projects for a user
 */
export async function clearRecentProjects(userId: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !userId) {
    console.warn(
      "Supabase not configured or userId missing - cannot clear recent projects",
    );
    return false;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recent_projects?user_id=eq.${userId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to clear recent projects: ${response.statusText}`,
      );
    }

    return true;
  } catch (error) {
    console.error("Error clearing recent projects:", error);
    return false;
  }
}
