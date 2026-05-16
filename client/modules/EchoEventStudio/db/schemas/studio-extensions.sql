-- Studio Events Table
CREATE TABLE IF NOT EXISTS studio_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  date TEXT,
  session TEXT NOT NULL,
  variant_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_studio_events_session ON studio_events(session);
CREATE INDEX IF NOT EXISTS idx_studio_events_user_id ON studio_events(user_id);

-- Camera Bookmarks Table
CREATE TABLE IF NOT EXISTS camera_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  session TEXT NOT NULL,
  slot INTEGER NOT NULL,
  pos_x FLOAT8,
  pos_y FLOAT8,
  pos_z FLOAT8,
  target_x FLOAT8,
  target_y FLOAT8,
  target_z FLOAT8,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session, slot)
);

CREATE INDEX IF NOT EXISTS idx_camera_bookmarks_session ON camera_bookmarks(session);
CREATE INDEX IF NOT EXISTS idx_camera_bookmarks_user_id ON camera_bookmarks(user_id);

-- Annotations Table
CREATE TABLE IF NOT EXISTS annotations (
  id BIGSERIAL PRIMARY KEY,
  session TEXT NOT NULL,
  camera_slot INTEGER,
  text TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_annotations_session ON annotations(session);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE studio_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow users to read/write their own data
CREATE POLICY "Users can read their own events"
ON studio_events FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create events"
ON studio_events FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own events"
ON studio_events FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own events"
ON studio_events FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);

-- Similar policies for camera_bookmarks
CREATE POLICY "Users can read bookmarks"
ON camera_bookmarks FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create bookmarks"
ON camera_bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own bookmarks"
ON camera_bookmarks FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Similar policies for annotations
CREATE POLICY "Users can read annotations"
ON annotations FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create annotations"
ON annotations FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
