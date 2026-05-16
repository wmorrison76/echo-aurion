-- Create prospects table
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  event_type_code CHAR(3) NOT NULL CHECK (event_type_code IN ('WED', 'COR', 'BAN', 'SEM', 'OTH')),
  event_date DATE NOT NULL,
  guest_count INTEGER,
  estimated_revenue NUMERIC(12, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'negotiation', 'won', 'completed')),
  description TEXT,
  scheduling_conflicts JSONB,
  assigned_room_id UUID,
  production_task_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prospects_org_id ON prospects(org_id);
CREATE INDEX IF NOT EXISTS idx_prospects_outlet_id ON prospects(outlet_id);
CREATE INDEX IF NOT EXISTS idx_prospects_event_date ON prospects(event_date);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_org_event_date ON prospects(org_id, event_date);

-- Create prospect_event_mappings table (links prospects to confirmed calendar events)
CREATE TABLE IF NOT EXISTS prospect_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  mapped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_event_mappings_prospect_id ON prospect_event_mappings(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_event_mappings_event_id ON prospect_event_mappings(event_id);

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL,
  setup_time_minutes INTEGER DEFAULT 30,
  teardown_time_minutes INTEGER DEFAULT 30,
  features JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_org_id ON rooms(org_id);
CREATE INDEX IF NOT EXISTS idx_rooms_outlet_id ON rooms(outlet_id);
CREATE INDEX IF NOT EXISTS idx_rooms_capacity ON rooms(capacity);

-- Create room_bookings table
CREATE TABLE IF NOT EXISTS room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  event_id UUID,
  booked_from TIMESTAMP WITH TIME ZONE NOT NULL,
  booked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  booking_type VARCHAR(50) NOT NULL DEFAULT 'event' CHECK (booking_type IN ('event', 'maintenance', 'blocked')),
  reason VARCHAR(255),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_bookings_room_id ON room_bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_prospect_id ON room_bookings(prospect_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_booked_from ON room_bookings(booked_from);
CREATE INDEX IF NOT EXISTS idx_room_bookings_booking_type ON room_bookings(booking_type);

-- Add updated_at trigger for prospects table
CREATE OR REPLACE FUNCTION update_prospects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prospects_updated_at ON prospects;
CREATE TRIGGER trigger_prospects_updated_at
BEFORE UPDATE ON prospects
FOR EACH ROW
EXECUTE FUNCTION update_prospects_updated_at();

-- Add updated_at trigger for rooms table
CREATE OR REPLACE FUNCTION update_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rooms_updated_at ON rooms;
CREATE TRIGGER trigger_rooms_updated_at
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION update_rooms_updated_at();

-- Add updated_at trigger for room_bookings table
CREATE OR REPLACE FUNCTION update_room_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_room_bookings_updated_at ON room_bookings;
CREATE TRIGGER trigger_room_bookings_updated_at
BEFORE UPDATE ON room_bookings
FOR EACH ROW
EXECUTE FUNCTION update_room_bookings_updated_at();
