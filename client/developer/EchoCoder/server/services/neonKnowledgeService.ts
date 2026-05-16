import { Pool, QueryResult } from "pg";

interface KnowledgeCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category_id?: string;
  source_file?: string;
  file_hash?: string;
  processed_at?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface PDFUpload {
  id: string;
  filename: string;
  file_size?: number;
  file_hash?: string;
  extracted_items: number;
  processing_status: string;
  error_message?: string;
  processed_at?: string;
  created_at: string;
}

let pool: Pool | null = null;
let tablesInitialized = false;

export function initializeNeonPool(): Pool {
  if (pool) return pool;

  const connectionString =
    process.env.VITE_NEON_CONNECTION_STRING ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_URL;

  if (!connectionString || !connectionString.includes("postgresql")) {
    throw new Error("VITE_NEON_CONNECTION_STRING not configured or invalid");
  }

  // Parse the connection string to ensure SSL is enabled
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode");

  if (!sslmode || sslmode !== "require") {
    // Ensure sslmode=require
    url.searchParams.set("sslmode", "require");
  }

  // Ensure channel_binding is set for Neon
  if (!url.searchParams.has("channel_binding")) {
    url.searchParams.set("channel_binding", "require");
  }

  pool = new Pool({
    connectionString: url.toString(),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });

  return pool;
}

export async function initializeKnowledgeTables(): Promise<void> {
  if (tablesInitialized) return;

  try {
    const pool = await getNeonPool();

    console.log("🔄 Initializing knowledge database tables...");

    // Create knowledge_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create knowledge_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category_id UUID REFERENCES knowledge_categories(id) ON DELETE SET NULL,
        source_file VARCHAR(255),
        file_hash VARCHAR(256),
        enabled BOOLEAN DEFAULT false,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_items_category ON knowledge_items(category_id);
      CREATE INDEX IF NOT EXISTS idx_knowledge_items_enabled ON knowledge_items(enabled);
      CREATE INDEX IF NOT EXISTS idx_knowledge_items_file_hash ON knowledge_items(file_hash);
      CREATE INDEX IF NOT EXISTS idx_knowledge_items_created ON knowledge_items(created_at DESC);
    `);

    // Create pdf_uploads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pdf_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename VARCHAR(255) NOT NULL,
        file_size INT,
        file_hash VARCHAR(256),
        extracted_items INT DEFAULT 0,
        processing_status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for pdf_uploads
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pdf_uploads_status ON pdf_uploads(processing_status);
      CREATE INDEX IF NOT EXISTS idx_pdf_uploads_file_hash ON pdf_uploads(file_hash);
      CREATE INDEX IF NOT EXISTS idx_pdf_uploads_created ON pdf_uploads(created_at DESC);
    `);

    // Create knowledge_chunks table for vector storage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        knowledge_item_id UUID REFERENCES knowledge_items(id) ON DELETE CASCADE,
        chunk_number INT,
        chunk_text TEXT NOT NULL,
        chunk_type VARCHAR(50),
        importance_score DECIMAL(3,2),
        embedding TEXT,
        semantic_hash VARCHAR(256),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index for embeddings search
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_item ON knowledge_chunks(knowledge_item_id);
      CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_type ON knowledge_chunks(chunk_type);
      CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_score ON knowledge_chunks(importance_score DESC);
    `);

    // Create knowledge_search table with ranking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_search (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query TEXT NOT NULL,
        results_count INT,
        query_embedding TEXT,
        avg_similarity_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index for knowledge_search
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_search_created ON knowledge_search(created_at DESC);
    `);

    // Insert default categories
    await pool.query(`
      INSERT INTO knowledge_categories (name, description) VALUES
        ('culinary', 'Culinary knowledge: recipes, techniques, ingredients'),
        ('hospitality', 'Hospitality knowledge: service, etiquette, operations'),
        ('financial', 'Financial knowledge: budgeting, forecasting, accounting'),
        ('operations', 'Operations knowledge: processes, procedures, management'),
        ('marketing', 'Marketing knowledge: strategies, campaigns, messaging'),
        ('hr', 'Human resources knowledge: hiring, training, policies'),
        ('training', 'Training knowledge: education, learning, development'),
        ('technology', 'Technology knowledge: systems, integration, architecture'),
        ('general', 'General knowledge: miscellaneous information')
      ON CONFLICT (name) DO NOTHING;
    `);

    tablesInitialized = true;
    console.log("✅ Knowledge database tables initialized");
  } catch (error) {
    console.error("❌ Error initializing knowledge tables:", error);
    throw error;
  }
}

export async function getNeonPool(): Promise<Pool> {
  if (!pool) {
    return initializeNeonPool();
  }
  return pool;
}

export async function addKnowledgeCategory(
  name: string,
  description?: string,
): Promise<KnowledgeCategory> {
  const pool = await getNeonPool();
  const result = await pool.query(
    "INSERT INTO knowledge_categories (name, description) VALUES ($1, $2) RETURNING *",
    [name, description],
  );
  return result.rows[0];
}

export async function getKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  const pool = await getNeonPool();
  const result = await pool.query(
    "SELECT * FROM knowledge_categories ORDER BY name",
  );
  return result.rows;
}

export async function addKnowledgeItem(
  title: string,
  content: string,
  category_id?: string,
  source_file?: string,
  file_hash?: string,
): Promise<KnowledgeItem> {
  const pool = await getNeonPool();
  const result = await pool.query(
    `INSERT INTO knowledge_items (title, content, category_id, source_file, file_hash, processed_at) 
     VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
    [title, content, category_id, source_file, file_hash],
  );
  return result.rows[0];
}

export async function getKnowledgeItems(
  category_id?: string,
  enabled_only: boolean = true,
): Promise<KnowledgeItem[]> {
  const pool = await getNeonPool();
  let query = "SELECT * FROM knowledge_items";
  const params: any[] = [];

  const conditions: string[] = [];
  if (enabled_only) {
    conditions.push("enabled = true");
  }
  if (category_id) {
    conditions.push("category_id = $" + (params.length + 1));
    params.push(category_id);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY created_at DESC";

  const result = await pool.query(query, params);
  return result.rows;
}

export async function updateKnowledgeItem(
  id: string,
  updates: Partial<KnowledgeItem>,
): Promise<KnowledgeItem> {
  const pool = await getNeonPool();
  const fields = Object.keys(updates).filter((k) => k !== "id");
  const values = fields.map((_, i) => `$${i + 1}`);
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");

  const result = await pool.query(
    `UPDATE knowledge_items SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
    [...fields.map((f) => (updates as any)[f]), id],
  );

  if (result.rows.length === 0) {
    throw new Error(`Knowledge item ${id} not found`);
  }

  return result.rows[0];
}

export async function deleteKnowledgeItem(id: string): Promise<void> {
  const pool = await getNeonPool();
  await pool.query("DELETE FROM knowledge_items WHERE id = $1", [id]);
}

export async function recordPDFUpload(
  filename: string,
  file_size: number,
  file_hash: string,
): Promise<PDFUpload> {
  const pool = await getNeonPool();
  const result = await pool.query(
    `INSERT INTO pdf_uploads (filename, file_size, file_hash, processing_status) 
     VALUES ($1, $2, $3, 'processing') RETURNING *`,
    [filename, file_size, file_hash],
  );
  return result.rows[0];
}

export async function updatePDFUploadStatus(
  id: string,
  status: string,
  extracted_items?: number,
  error_message?: string,
): Promise<PDFUpload> {
  const pool = await getNeonPool();
  const result = await pool.query(
    `UPDATE pdf_uploads 
     SET processing_status = $1, extracted_items = COALESCE($2, extracted_items), 
         error_message = $3, processed_at = NOW() 
     WHERE id = $4 RETURNING *`,
    [status, extracted_items || 0, error_message, id],
  );

  if (result.rows.length === 0) {
    throw new Error(`PDF upload ${id} not found`);
  }

  return result.rows[0];
}

export async function getPDFUploads(limit: number = 100): Promise<PDFUpload[]> {
  const pool = await getNeonPool();
  const result = await pool.query(
    "SELECT * FROM pdf_uploads ORDER BY created_at DESC LIMIT $1",
    [limit],
  );
  return result.rows;
}

export async function searchKnowledge(
  query: string,
  category_id?: string,
): Promise<KnowledgeItem[]> {
  const pool = await getNeonPool();
  const searchQuery = `%${query}%`;
  let sql = `SELECT * FROM knowledge_items 
            WHERE enabled = true AND (title ILIKE $1 OR content ILIKE $1)`;
  const params: any[] = [searchQuery];

  if (category_id) {
    sql += ` AND category_id = $${params.length + 1}`;
    params.push(category_id);
  }

  sql += " ORDER BY created_at DESC LIMIT 50";

  const result = await pool.query(sql, params);

  // Log search
  await pool
    .query(
      "INSERT INTO knowledge_search (query, results_count) VALUES ($1, $2)",
      [query, result.rows.length],
    )
    .catch(() => {}); // Ignore errors on search logging

  return result.rows;
}

export async function getKnowledgeStats(): Promise<{
  total_items: number;
  enabled_items: number;
  categories: number;
  pdfs_processed: number;
}> {
  const pool = await getNeonPool();

  const [items, categories, pdfs] = await Promise.all([
    pool.query("SELECT COUNT(*) as count FROM knowledge_items"),
    pool.query("SELECT COUNT(*) as count FROM knowledge_categories"),
    pool.query(
      "SELECT COUNT(*) as count FROM pdf_uploads WHERE processing_status = $1",
      ["completed"],
    ),
  ]);

  const enabled = await pool.query(
    "SELECT COUNT(*) as count FROM knowledge_items WHERE enabled = true",
  );

  return {
    total_items: parseInt(items.rows[0].count),
    enabled_items: parseInt(enabled.rows[0].count),
    categories: parseInt(categories.rows[0].count),
    pdfs_processed: parseInt(pdfs.rows[0].count),
  };
}

export async function storeKnowledgeChunk(
  knowledge_item_id: string,
  chunk_number: number,
  chunk_text: string,
  chunk_type: string,
  importance_score: number,
  embedding: number[],
): Promise<any> {
  const pool = await getNeonPool();
  const result = await pool.query(
    `INSERT INTO knowledge_chunks (knowledge_item_id, chunk_number, chunk_text, chunk_type, importance_score, embedding)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      knowledge_item_id,
      chunk_number,
      chunk_text,
      chunk_type,
      importance_score,
      JSON.stringify(embedding),
    ],
  );
  return result.rows[0];
}

export async function searchKnowledgeByEmbedding(
  query_embedding: number[],
  category_id?: string,
  limit: number = 5,
  similarity_threshold: number = 0.3,
): Promise<
  Array<{
    knowledge_item_id: string;
    title: string;
    summary: string;
    category: string;
    chunk_text: string;
    chunk_type: string;
    similarity_score: number;
    importance_score: number;
  }>
> {
  const pool = await getNeonPool();

  // Use pgvector-like cosine similarity calculation
  // Since pgvector extension may not be available, we'll use PostgreSQL native array operations
  let sql = `
    SELECT
      kc.knowledge_item_id,
      ki.title,
      SUBSTRING(ki.content, 1, 200) as summary,
      kc.chunk_text,
      kc.chunk_type,
      kc.importance_score,
      (
        (kc.embedding::float8[] <-> $1::float8[]) * -1 + 2
      ) / 2 as similarity_score
    FROM knowledge_chunks kc
    JOIN knowledge_items ki ON kc.knowledge_item_id = ki.id
    WHERE ki.enabled = true
  `;

  const params: any[] = [JSON.stringify(query_embedding)];

  if (category_id) {
    sql += ` AND ki.category_id = $${params.length + 1}`;
    params.push(category_id);
  }

  sql += ` ORDER BY similarity_score DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  try {
    const result = await pool.query(sql, params);

    // Transform results to match expected format
    return result.rows.map((row: any) => ({
      knowledge_item_id: row.knowledge_item_id,
      title: row.title,
      summary: row.summary,
      category: row.category || "general",
      chunk_text: row.chunk_text,
      chunk_type: row.chunk_type,
      similarity_score: Math.max(0, Math.min(1, row.similarity_score || 0.5)),
      importance_score: row.importance_score,
    }));
  } catch (error) {
    console.warn(
      "Vector search not available, falling back to text search:",
      error,
    );
    return [];
  }
}

export async function getKnowledgeChunks(
  knowledge_item_id: string,
): Promise<any[]> {
  const pool = await getNeonPool();
  const result = await pool.query(
    `SELECT * FROM knowledge_chunks
     WHERE knowledge_item_id = $1
     ORDER BY chunk_number ASC`,
    [knowledge_item_id],
  );
  return result.rows;
}

export async function closeNeonPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
