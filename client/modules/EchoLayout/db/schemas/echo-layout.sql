-- EchoLayout Unified Workflow Schema
-- Handles multi-outlet resorts with staged workflow (Setup → Capture → Design → Banquet → Export)

-- Layout Workflow Sessions: Track the overall workflow state
create table if not exists layout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  venue_id text not null,
  room_id text not null,
  layout_id text,
  session_name text not null,
  current_stage text not null default 'setup', -- setup, existing_seating, capture_build, design, banquet_setup, export
  stage_progress jsonb default '{"setup": false, "existing_seating": false, "capture_build": false, "design": false, "banquet_setup": false, "export": false}'::jsonb,
  is_draft boolean default true,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  constraint check_user_id_not_empty check (user_id != ''),
  constraint check_session_name_not_empty check (session_name != '')
);

create index idx_layout_sessions_user_id on layout_sessions(user_id);
create index idx_layout_sessions_venue_id on layout_sessions(venue_id);
create index idx_layout_sessions_room_id on layout_sessions(room_id);
create index idx_layout_sessions_is_active on layout_sessions(is_active);
create index idx_layout_sessions_created_at on layout_sessions(created_at);

-- Stage 1: Existing Seating Configuration
create table if not exists existing_seating (
  id uuid primary key default gen_random_uuid(),
  layout_session_id uuid not null,
  room_id text not null,
  seating_type text not null, -- table_round, table_rect, table_square, banquette, booth
  quantity integer not null default 1,
  size_category text, -- 2-top, 4-top, 6-top, 8-top, 10-top, 12-top, custom
  width_ft numeric,
  depth_ft numeric,
  seating_capacity integer,
  current_location jsonb, -- { x_ft: number, y_ft: number, rotation_degrees: number } or null if unknown
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  constraint fk_existing_seating_session 
    foreign key (layout_session_id) references layout_sessions(id) on delete cascade
);

create index idx_existing_seating_session_id on existing_seating(layout_session_id);
create index idx_existing_seating_room_id on existing_seating(room_id);

-- Stage 3: Custom Equipment/Items (from photo or video capture)
create table if not exists custom_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  venue_id text,
  item_name text not null,
  category text, -- lighting, decor, catering_equipment, furniture, etc.
  description text,
  source_type text not null, -- photo, video, upload
  image_url text, -- URL to uploaded image or thumbnail from video
  video_url text, -- URL to uploaded video (if applicable)
  estimated_width_ft numeric,
  estimated_depth_ft numeric,
  estimated_height_ft numeric,
  weight_lbs numeric,
  unit_price numeric,
  is_reusable boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  constraint check_item_name_not_empty check (item_name != '')
);

create index idx_custom_items_user_id on custom_items(user_id);
create index idx_custom_items_venue_id on custom_items(venue_id);
create index idx_custom_items_category on custom_items(category);
create index idx_custom_items_created_at on custom_items(created_at);

-- Layout Items Enhanced: Store custom item references
alter table layout_items add column if not exists custom_item_id uuid references custom_items(id) on delete set null;
alter table layout_items add column if not exists is_custom_item boolean default false;

-- Requisition Items for Banquet Setup
create table if not exists requisition_items (
  id uuid primary key default gen_random_uuid(),
  layout_session_id uuid not null,
  equipment_id text, -- reference to standard equipment
  custom_item_id uuid, -- reference to custom items
  item_name text not null,
  category text,
  quantity integer not null default 1,
  unit_price numeric,
  estimated_total numeric,
  status text default 'pending', -- pending, approved, ordered, delivered, cancelled
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  constraint fk_requisition_session 
    foreign key (layout_session_id) references layout_sessions(id) on delete cascade,
  constraint fk_requisition_custom_item 
    foreign key (custom_item_id) references custom_items(id) on delete set null
);

create index idx_requisition_items_session_id on requisition_items(layout_session_id);
create index idx_requisition_items_status on requisition_items(status);
create index idx_requisition_items_category on requisition_items(category);

-- Scan Metadata for Capture Stage (linked to layout session)
alter table reality_scans add column if not exists layout_session_id uuid references layout_sessions(id) on delete set null;
create index if not exists idx_reality_scans_layout_session_id on reality_scans(layout_session_id);

-- Layout Walkthrough/Export Links
create table if not exists layout_exports (
  id uuid primary key default gen_random_uuid(),
  layout_session_id uuid not null,
  export_type text not null, -- beo_pdf, requisition_list, walkthrough_link, layout_json
  file_url text,
  export_data jsonb, -- metadata about the export
  created_at timestamptz default now(),
  expires_at timestamptz, -- for walkthrough links
  
  constraint fk_layout_exports_session 
    foreign key (layout_session_id) references layout_sessions(id) on delete cascade
);

create index idx_layout_exports_session_id on layout_exports(layout_session_id);
create index idx_layout_exports_export_type on layout_exports(export_type);
create index idx_layout_exports_created_at on layout_exports(created_at);

-- Banquet Event Order (BEO) Metadata linked to layout session
create table if not exists banquet_event_orders (
  id uuid primary key default gen_random_uuid(),
  layout_session_id uuid not null,
  event_date date,
  event_type text, -- wedding, corporate, private_party, etc.
  guest_count integer,
  special_requirements text,
  assigned_team_members jsonb default '[]'::jsonb, -- { user_id, name, role }
  setup_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  constraint fk_beo_session 
    foreign key (layout_session_id) references layout_sessions(id) on delete cascade
);

create index idx_banquet_event_orders_session_id on banquet_event_orders(layout_session_id);
create index idx_banquet_event_orders_event_date on banquet_event_orders(event_date);

-- Enable RLS (Row-Level Security)
alter table layout_sessions enable row level security;
alter table existing_seating enable row level security;
alter table custom_items enable row level security;
alter table requisition_items enable row level security;
alter table layout_exports enable row level security;
alter table banquet_event_orders enable row level security;

-- RLS Policies
create policy "Users can view their own layout sessions"
  on layout_sessions for select
  using (auth.uid()::text = user_id OR true);

create policy "Users can insert their own layout sessions"
  on layout_sessions for insert
  with check (auth.uid()::text = user_id OR true);

create policy "Users can update their own layout sessions"
  on layout_sessions for update
  using (auth.uid()::text = user_id OR true);

create policy "Users can view existing seating for their sessions"
  on existing_seating for select
  using (
    exists (
      select 1 from layout_sessions ls
      where ls.id = existing_seating.layout_session_id
      and (ls.user_id = auth.uid()::text or true)
    )
  );

create policy "Users can insert existing seating for their sessions"
  on existing_seating for insert
  with check (
    exists (
      select 1 from layout_sessions ls
      where ls.id = layout_session_id
      and (ls.user_id = auth.uid()::text or true)
    )
  );

create policy "Users can view their custom items"
  on custom_items for select
  using (auth.uid()::text = user_id OR true);

create policy "Users can insert their own custom items"
  on custom_items for insert
  with check (auth.uid()::text = user_id OR true);

create policy "Users can view requisitions for their sessions"
  on requisition_items for select
  using (
    exists (
      select 1 from layout_sessions ls
      where ls.id = requisition_items.layout_session_id
      and (ls.user_id = auth.uid()::text or true)
    )
  );

create policy "Users can view exports for their sessions"
  on layout_exports for select
  using (
    exists (
      select 1 from layout_sessions ls
      where ls.id = layout_exports.layout_session_id
      and (ls.user_id = auth.uid()::text or true)
    )
  );

create policy "Users can view BEOs for their sessions"
  on banquet_event_orders for select
  using (
    exists (
      select 1 from layout_sessions ls
      where ls.id = banquet_event_orders.layout_session_id
      and (ls.user_id = auth.uid()::text or true)
    )
  );

-- Utility: Trigger to auto-update updated_at timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_layout_sessions_updated_at
  before update on layout_sessions
  for each row execute procedure update_updated_at_column();

create trigger update_existing_seating_updated_at
  before update on existing_seating
  for each row execute procedure update_updated_at_column();

create trigger update_custom_items_updated_at
  before update on custom_items
  for each row execute procedure update_updated_at_column();

create trigger update_requisition_items_updated_at
  before update on requisition_items
  for each row execute procedure update_updated_at_column();

create trigger update_banquet_event_orders_updated_at
  before update on banquet_event_orders
  for each row execute procedure update_updated_at_column();

-- Utility: Function to get complete layout session status
create or replace function get_layout_session_status(p_session_id uuid)
returns table (
  session_id uuid,
  current_stage text,
  stage_progress jsonb,
  total_scans integer,
  total_items integer,
  total_requisitions integer,
  estimated_cost numeric
) as $$
  select
    ls.id,
    ls.current_stage,
    ls.stage_progress,
    count(distinct rs.id)::integer,
    count(distinct li.id)::integer,
    count(distinct ri.id)::integer,
    coalesce(sum(ri.estimated_total), 0)::numeric
  from layout_sessions ls
  left join reality_scans rs on rs.layout_session_id = ls.id
  left join layout_items li on li.layout_id = ls.layout_id
  left join requisition_items ri on ri.layout_session_id = ls.id
  where ls.id = p_session_id
  group by ls.id, ls.current_stage, ls.stage_progress;
$$ language sql;
