export interface CulinaryProcedure {
  id: string;
  title: string;
  source_book: string;
  category:
    | "butchery"
    | "pastry"
    | "cooking"
    | "preparation"
    | "technique"
    | "general";
  steps: Array<{
    number: number;
    instruction: string;
    tips?: string;
  }>;
  materials?: string[];
  tools?: string[];
  time_estimate?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  related_keywords?: string[];
  created_at?: string;
  embedding?: number[];
}

export interface ProcedureSearchResult {
  procedure: CulinaryProcedure;
  relevance_score: number;
}

const API_BASE = "/api/procedures";

/**
 * Store culinary procedure in database via backend API
 */
export async function storeProcedure(
  procedure: Omit<CulinaryProcedure, "id" | "created_at" | "embedding">,
): Promise<CulinaryProcedure> {
  try {
    const response = await fetch(`${API_BASE}/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(procedure),
    });

    if (!response.ok) {
      throw new Error(`Failed to store procedure: ${response.statusText}`);
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error("Error storing procedure:", error);
    throw error;
  }
}

/**
 * Search procedures semantically using backend API
 * Falls back gracefully if Supabase is not configured
 */
export async function searchProcedures(
  query: string,
  limit: number = 5,
): Promise<ProcedureSearchResult[]> {
  try {
    const response = await fetch(`${API_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        limit,
        min_similarity: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle Supabase not configured gracefully (503)
      if (response.status === 503) {
        console.warn(
          "Procedures feature unavailable: Supabase not configured. Using Pinecone recipes instead.",
        );
        return [];
      }

      const errorMessage =
        errorData.error ||
        errorData.message ||
        response.statusText ||
        "Unknown error";
      throw new Error(`Failed to search procedures: ${errorMessage}`);
    }

    const { data } = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error searching procedures:", error);
    // Return empty array gracefully instead of throwing
    return [];
  }
}

/**
 * Get all stored procedures
 * Falls back gracefully if Supabase is not configured
 */
export async function getAllProcedures(): Promise<CulinaryProcedure[]> {
  try {
    const response = await fetch(`${API_BASE}/list`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle Supabase not configured gracefully (503)
      if (response.status === 503) {
        console.warn(
          "Procedures feature unavailable: Supabase not configured.",
        );
        return [];
      }

      throw new Error(`Failed to fetch procedures: ${response.statusText}`);
    }

    const { data } = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching procedures:", error);
    return [];
  }
}

/**
 * Get procedure by ID
 */
export async function getProcedureById(
  id: string,
): Promise<CulinaryProcedure | null> {
  try {
    const response = await fetch(`${API_BASE}/${id}`);

    if (!response.ok) {
      return null;
    }

    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching procedure:", error);
    return null;
  }
}

/**
 * Get procedures by category
 * Falls back gracefully if Supabase is not configured
 */
export async function getProceduresByCategory(
  category: CulinaryProcedure["category"],
): Promise<CulinaryProcedure[]> {
  try {
    const response = await fetch(`${API_BASE}/by-category/${category}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle Supabase not configured gracefully (503)
      if (response.status === 503) {
        console.warn(
          "Procedures feature unavailable: Supabase not configured.",
        );
        return [];
      }

      throw new Error(`Failed to fetch procedures: ${response.statusText}`);
    }

    const { data } = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching procedures by category:", error);
    return [];
  }
}

/**
 * Get procedures from a specific book
 * Falls back gracefully if Supabase is not configured
 */
export async function getProceduresByBook(
  bookName: string,
): Promise<CulinaryProcedure[]> {
  try {
    const response = await fetch(
      `${API_BASE}/by-book/${encodeURIComponent(bookName)}`,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle Supabase not configured gracefully (503)
      if (response.status === 503) {
        console.warn(
          "Procedures feature unavailable: Supabase not configured.",
        );
        return [];
      }

      throw new Error(`Failed to fetch procedures: ${response.statusText}`);
    }

    const { data } = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching procedures by book:", error);
    return [];
  }
}

/**
 * Delete a procedure
 */
export async function deleteProcedure(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
    });

    return response.ok;
  } catch (error) {
    console.error("Error deleting procedure:", error);
    return false;
  }
}

/**
 * Search procedures by full text
 * Falls back gracefully if Supabase is not configured
 */
export async function searchProceduresFulltext(
  query: string,
  limit: number = 20,
): Promise<CulinaryProcedure[]> {
  try {
    const response = await fetch(
      `${API_BASE}/search-text/${encodeURIComponent(query)}?limit=${limit}`,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle Supabase not configured gracefully (503)
      if (response.status === 503) {
        console.warn(
          "Procedures feature unavailable: Supabase not configured.",
        );
        return [];
      }

      throw new Error(`Failed to search procedures: ${response.statusText}`);
    }

    const { data } = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error searching procedures:", error);
    return [];
  }
}
