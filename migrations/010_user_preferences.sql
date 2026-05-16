/**
 * User Preferences Schema
 * Stores theme, appearance, and background settings per user
 * These settings sync across all devices/logins
 */

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  theme VARCHAR(50) DEFAULT 'echo',
  font VARCHAR(50) DEFAULT 'inter',
  appearance VARCHAR(20) DEFAULT 'dark',
  font_scale DECIMAL(3, 2) DEFAULT 1.0,
  high_contrast BOOLEAN DEFAULT FALSE,
  background_image_light TEXT,
  background_opacity_light DECIMAL(3, 2) DEFAULT 0,
  background_image_dark TEXT,
  background_opacity_dark DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
  ON user_preferences(user_id);

-- Enable RLS for user isolation
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view/edit their own preferences
CREATE POLICY user_preferences_user_isolation ON user_preferences
  FOR ALL USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER user_preferences_update_timestamp
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_preferences_timestamp();
