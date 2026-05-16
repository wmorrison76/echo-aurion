-- Create rooms table for venue space management
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  setup_time_minutes INTEGER DEFAULT 60,
  teardown_time_minutes INTEGER DEFAULT 60,
  features JSONB DEFAULT '[]'::jsonb, -- e.g., ["projector", "stage", "dance_floor", "outdoor"]
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX idx_rooms_org_outlet ON rooms(org_id, outlet_id);
CREATE INDEX idx_rooms_active ON rooms(active);
CREATE INDEX idx_rooms_capacity ON rooms(capacity);

-- Create room bookings table for managing reservations and maintenance blocks
CREATE TABLE IF NOT EXISTS room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  room_id UUID NOT NULL,
  prospect_id UUID, -- Optional: link to a prospect
  event_id UUID, -- Optional: link to a confirmed event
  booked_from TIMESTAMP WITH TIME ZONE NOT NULL,
  booked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  booking_type VARCHAR(20) NOT NULL DEFAULT 'event' CHECK (booking_type IN ('event', 'maintenance', 'blocked', 'setup')),
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
  CONSTRAINT fk_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT booking_time_order CHECK (booked_from < booked_until)
);

-- Create indexes for bookings
CREATE INDEX idx_room_bookings_room_time ON room_bookings(room_id, booked_from, booked_until);
CREATE INDEX idx_room_bookings_prospect ON room_bookings(prospect_id);
CREATE INDEX idx_room_bookings_event ON room_bookings(event_id);
CREATE INDEX idx_room_bookings_status ON room_bookings(status);

-- Create production timelines table for tracking prep and execution
CREATE TABLE IF NOT EXISTS production_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  prospect_id UUID NOT NULL,
  data JSONB NOT NULL, -- Full timeline structure
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
  CONSTRAINT unique_prospect_timeline UNIQUE(prospect_id)
);

-- Create index for production timelines
CREATE INDEX idx_production_timelines_prospect ON production_timelines(prospect_id);
CREATE INDEX idx_production_timelines_status ON production_timelines(status);

-- Create maestro production tasks table for detailed task management
CREATE TABLE IF NOT EXISTS maestro_production_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  prospect_id UUID,
  event_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  department_code VARCHAR(20) NOT NULL, -- BOH, FOH, Engineering, Stewarding, etc.
  estimated_hours DECIMAL(10, 2),
  scheduled_date DATE,
  event_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to UUID, -- Employee ID
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE SET NULL,
  CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE SET NULL
);

-- Create indexes for maestro tasks
CREATE INDEX idx_maestro_tasks_prospect ON maestro_production_tasks(prospect_id);
CREATE INDEX idx_maestro_tasks_event ON maestro_production_tasks(event_id);
CREATE INDEX idx_maestro_tasks_dept_date ON maestro_production_tasks(department_code, scheduled_date);
CREATE INDEX idx_maestro_tasks_assigned ON maestro_production_tasks(assigned_to);
CREATE INDEX idx_maestro_tasks_status ON maestro_production_tasks(status);

-- Add trigger to update updated_at timestamp for rooms
CREATE OR REPLACE FUNCTION update_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rooms_updated_at
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION update_rooms_updated_at();

-- Add trigger for room bookings
CREATE OR REPLACE FUNCTION update_room_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_room_bookings_updated_at
BEFORE UPDATE ON room_bookings
FOR EACH ROW
EXECUTE FUNCTION update_room_bookings_updated_at();

-- Add trigger for production timelines
CREATE OR REPLACE FUNCTION update_production_timelines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_production_timelines_updated_at
BEFORE UPDATE ON production_timelines
FOR EACH ROW
EXECUTE FUNCTION update_production_timelines_updated_at();

-- Add trigger for maestro tasks
CREATE OR REPLACE FUNCTION update_maestro_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_maestro_tasks_updated_at
BEFORE UPDATE ON maestro_production_tasks
FOR EACH ROW
EXECUTE FUNCTION update_maestro_tasks_updated_at();

-- Grant permissions
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE maestro_production_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rooms
CREATE POLICY rooms_org_isolation ON rooms
  USING (org_id = CURRENT_SETTING('app.current_org_id')::uuid);

CREATE POLICY rooms_insert ON rooms
  WITH CHECK (org_id = CURRENT_SETTING('app.current_org_id')::uuid);

-- Create RLS policies for room bookings
CREATE POLICY room_bookings_org_isolation ON room_bookings
  USING (org_id = CURRENT_SETTING('app.current_org_id')::uuid);

CREATE POLICY room_bookings_insert ON room_bookings
  WITH CHECK (org_id = CURRENT_SETTING('app.current_org_id')::uuid);

-- Create RLS policies for production timelines
CREATE POLICY production_timelines_org_isolation ON production_timelines
  USING (org_id = CURRENT_SETTING('app.current_org_id')::uuid);

CREATE POLICY production_timelines_insert ON production_timelines
  WITH CHECK (org_id = CURRENT_SETTING('app.current_org_id')::uuid);

-- Create RLS policies for maestro tasks
CREATE POLICY maestro_tasks_org_isolation ON maestro_production_tasks
  USING (org_id = CURRENT_SETTING('app.current_org_id')::uuid);

CREATE POLICY maestro_tasks_insert ON maestro_production_tasks
  WITH CHECK (org_id = CURRENT_SETTING('app.current_org_id')::uuid);
