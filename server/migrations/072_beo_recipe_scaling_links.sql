-- Migration: BEO recipe scaling support
-- Purpose: Make beo_recipe_links a real, durable table (it has been
--          created on-the-fly via supabase.upsert and so is unmanaged
--          today), and extend scaled_ingredients so it can be keyed by
--          beo_id directly — not only by production_task_id, which only
--          exists once a maestro production task is created. The chain
--          needs to scale recipes the moment a BEO is approved, before
--          production tasks exist.
-- Ticket:  A3 (prospect → plate vertical slice)
-- Date:    2026-05-06

-- =========================================================================
-- BEO ↔ RECIPE LINKS
-- =========================================================================

CREATE TABLE IF NOT EXISTS beo_recipe_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL,
  beo_id          UUID NOT NULL,
  menu_item_id    TEXT NOT NULL,
  recipe_id       TEXT NOT NULL,
  recipe_name     TEXT,
  linked_by       UUID,
  linked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (beo_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_beo_recipe_links_beo
  ON beo_recipe_links (beo_id);
CREATE INDEX IF NOT EXISTS idx_beo_recipe_links_recipe
  ON beo_recipe_links (recipe_id);
CREATE INDEX IF NOT EXISTS idx_beo_recipe_links_org
  ON beo_recipe_links (org_id);

-- =========================================================================
-- SCALED_INGREDIENTS — allow BEO-direct rows
-- =========================================================================
-- Existing schema (014) keys rows by production_task_id NOT NULL. The chain
-- needs to write scaled rows the moment a BEO is approved, before any
-- production task exists. Make production_task_id nullable, add beo_id,
-- and require that at least one of the two is present.

ALTER TABLE scaled_ingredients
  ALTER COLUMN production_task_id DROP NOT NULL;

ALTER TABLE scaled_ingredients
  ADD COLUMN IF NOT EXISTS beo_id          UUID,
  ADD COLUMN IF NOT EXISTS recipe_id       TEXT,
  ADD COLUMN IF NOT EXISTS guest_count     INTEGER,
  ADD COLUMN IF NOT EXISTS scaling_factor  NUMERIC(12,4);

CREATE INDEX IF NOT EXISTS idx_scaled_ingredients_beo
  ON scaled_ingredients (beo_id) WHERE beo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scaled_ingredients_recipe
  ON scaled_ingredients (recipe_id) WHERE recipe_id IS NOT NULL;

-- At least one parent FK must be present so we can always trace a scaled
-- ingredient back to either a BEO-stage row or a production-task-stage row.
ALTER TABLE scaled_ingredients
  ADD CONSTRAINT scaled_ingredients_parent_present
    CHECK (production_task_id IS NOT NULL OR beo_id IS NOT NULL);

COMMENT ON COLUMN scaled_ingredients.beo_id IS
  'Set when the row was generated from a BEO approval (A3) before a '
  'production task exists. Once production_task_id is filled in (A5), '
  'both columns are populated and the row is fully traced.';
