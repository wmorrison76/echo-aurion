-- EchoReality Mode Database Schema
-- Tables for multi-scan capture, fusion, corrections, and learning

-- Reality Scans: Individual 3D scans from mobile devices
create table if not exists reality_scans (
  id bigserial primary key,
  scan_id uuid unique not null,
  session text not null,
  user_id text not null,
  device text,
  file_url text not null,
  device_pose jsonb, -- { position: [x,y,z], rotation: [rx,ry,rz] }
  camera_intrinsics jsonb, -- { fx, fy, cx, cy, width, height }
  meta jsonb default '{}'::jsonb, -- { area, lighting, quality, timestamp }
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  constraint check_session_not_empty check (session != ''),
  constraint check_user_id_not_empty check (user_id != '')
);

create index idx_reality_scans_session on reality_scans(session);
create index idx_reality_scans_user_id on reality_scans(user_id);
create index idx_reality_scans_created_at on reality_scans(created_at);

-- Reality Corrections: Manual corrections and training deltas
create table if not exists reality_corrections (
  id bigserial primary key,
  session text not null,
  scan_id uuid,
  user_id text,
  correction_type text not null, -- gap_fill, plane_correction, material_tag, merge, split
  delta jsonb not null, -- { region, oldMesh, newMesh, tags, userAction }
  before_url text, -- URL to original mesh
  after_url text, -- URL to corrected mesh
  created_at timestamptz default now(),
  
  constraint fk_reality_corrections_scan 
    foreign key (scan_id) references reality_scans(scan_id) on delete set null
);

create index idx_reality_corrections_session on reality_corrections(session);
create index idx_reality_corrections_user_id on reality_corrections(user_id);
create index idx_reality_corrections_created_at on reality_corrections(created_at);

-- Reality Shells: Merged and fused 3D models (room shells)
create table if not exists reality_shells (
  id bigserial primary key,
  session text unique not null,
  glb_url text not null, -- URL to merged GLB file in Supabase Storage
  meta jsonb default '{}'::jsonb, -- { accuracy, mesh_vertices, faces, materials }
  fusion_job_id text, -- Reference to fusion job for tracking
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_reality_shells_session on reality_shells(session);

-- Reality Fusion Jobs: Track fusion processing status
create table if not exists reality_fusion_jobs (
  id bigserial primary key,
  job_id text unique not null,
  session text not null,
  status text not null default 'queued', -- queued, processing, completed, failed
  scan_count integer not null,
  error_message text,
  result_glb_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_reality_fusion_jobs_session on reality_fusion_jobs(session);
create index idx_reality_fusion_jobs_status on reality_fusion_jobs(status);
create index idx_reality_fusion_jobs_job_id on reality_fusion_jobs(job_id);

-- Reality Training State: Learn from corrections
create table if not exists reality_training_state (
  id bigserial primary key,
  session text unique not null,
  room_type text, -- banquet, boardroom, lounge, office, hallway
  learned_weights jsonb default '{
    "planarityBias": 0.5,
    "noiseSuppressionLevel": 0.5,
    "featureMatchThreshold": 0.6,
    "confidenceBoost": 0.5
  }'::jsonb,
  correction_count integer default 0,
  estimated_accuracy numeric default 0.5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_reality_training_state_session on reality_training_state(session);
create index idx_reality_training_state_room_type on reality_training_state(room_type);

-- Enable RLS (Row-Level Security) if needed
alter table reality_scans enable row level security;
alter table reality_corrections enable row level security;
alter table reality_shells enable row level security;
alter table reality_fusion_jobs enable row level security;
alter table reality_training_state enable row level security;

-- RLS Policies: Allow authenticated users to access their own data
create policy "Users can view scans from their sessions"
  on reality_scans for select
  using (auth.uid()::text = user_id OR true); -- Allow all for now, restrict later

create policy "Users can insert their own scans"
  on reality_scans for insert
  with check (auth.uid()::text = user_id OR true);

create policy "Users can view corrections from their sessions"
  on reality_corrections for select
  using (auth.uid()::text = user_id OR true);

create policy "Users can insert their own corrections"
  on reality_corrections for insert
  with check (auth.uid()::text = user_id OR true);

-- Utility: Function to get scan statistics for a session
create or replace function get_session_stats(p_session text)
returns table (
  total_scans bigint,
  total_corrections bigint,
  avg_accuracy numeric,
  room_type text,
  latest_shell_url text
) as $$
  select
    count(distinct rs.scan_id)::bigint,
    count(distinct rc.id)::bigint,
    rts.estimated_accuracy::numeric,
    rts.room_type,
    rs_shell.glb_url
  from reality_scans rs
  left join reality_corrections rc on rc.session = rs.session
  left join reality_training_state rts on rts.session = rs.session
  left join reality_shells rs_shell on rs_shell.session = rs.session
  where rs.session = p_session
  group by rts.estimated_accuracy, rts.room_type, rs_shell.glb_url;
$$ language sql;

-- Utility: Trigger to auto-update updated_at timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_reality_scans_updated_at
  before update on reality_scans
  for each row execute procedure update_updated_at_column();

create trigger update_reality_shells_updated_at
  before update on reality_shells
  for each row execute procedure update_updated_at_column();

create trigger update_reality_fusion_jobs_updated_at
  before update on reality_fusion_jobs
  for each row execute procedure update_updated_at_column();

create trigger update_reality_training_state_updated_at
  before update on reality_training_state
  for each row execute procedure update_updated_at_column();
