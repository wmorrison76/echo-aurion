import { Pool } from 'pg';

async function runMigration() {
  const connectionString = process.env.VITE_NEON_CONNECTION_STRING ||
                           process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('No database connection string provided');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🔄 Running Neon knowledge database migration...');

    // Create knowledge_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_categories_name ON knowledge_categories(name);
    `);
    console.log('✅ Created knowledge_categories table');

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
      CREATE INDEX IF NOT EXISTS idx_knowledge_items_category ON knowledge_items(category_id);
      CREATE INDEX IF NOT EXISTS idx_knowledge_items_enabled ON knowledge_items(enabled);
      CREATE INDEX IF NOT EXISTS idx_knowledge_items_file_hash ON knowledge_items(file_hash);
      CREATE INDEX IF NOT EXISTS idx_knowledge_items_created ON knowledge_items(created_at DESC);
    `);
    console.log('✅ Created knowledge_items table');

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
      CREATE INDEX IF NOT EXISTS idx_pdf_uploads_status ON pdf_uploads(processing_status);
      CREATE INDEX IF NOT EXISTS idx_pdf_uploads_file_hash ON pdf_uploads(file_hash);
      CREATE INDEX IF NOT EXISTS idx_pdf_uploads_created ON pdf_uploads(created_at DESC);
    `);
    console.log('✅ Created pdf_uploads table');

    // Create knowledge_search table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_search (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query TEXT NOT NULL,
        results_count INT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_search_created ON knowledge_search(created_at DESC);
    `);
    console.log('✅ Created knowledge_search table');

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
    console.log('✅ Inserted default categories');

    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
