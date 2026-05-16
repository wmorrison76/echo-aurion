# EchoReality Mode - Complete Integration Guide

## Overview

EchoReality Mode enables **multi-scan capture → AI fusion → manual correction → adaptive learning** for realistic 3D room reconstruction in the EchoEventStudio.

**Architecture:**
```
Mobile/Web Scan Upload → Node.js Backend → Python Fusion Service
         ↓
   Supabase Storage
         ↓
  Manual Corrections → EchoAI³ Trainer → EchoLayout Integration
```

## Quick Start

### 1. Database Setup

**Option A: Using Supabase UI**

1. Open your Supabase project
2. Go to SQL Editor
3. Create a new query
4. Copy the entire contents of `db/schemas/reality.sql`
5. Run the query

**Option B: Using supabase-cli**

```bash
supabase db push db/schemas/reality.sql
```

### 2. Python Fusion Service Setup

```bash
cd python_fusion_service

# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-anon-key

# Option A: Local development
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# Option B: Docker
docker-compose up -d
```

### 3. Configure Node.js Backend

**Add environment variable:**

```bash
# .env file
PYTHON_FUSION_SERVICE=http://localhost:8000  # Local
# or for production:
# PYTHON_FUSION_SERVICE=https://echo-fusion-service.fly.dev
```

**The backend is already configured** - routes are in `server/routes/reality.ts`.

### 4. Frontend Integration

Add the panels to your Studio layout:

```tsx
import { RealityCapturePanel } from "@/panels/RealityCapturePanel";
import { RealityCorrectionPanel } from "@/panels/RealityCorrectionPanel";
import { FusionStatusPanel } from "@/panels/FusionStatusPanel";

export function Studio() {
  return (
    <div className="studio-layout">
      {/* Existing components */}
      <EchoLayoutPanel />

      {/* New Reality components */}
      <div className="reality-panels">
        <RealityCapturePanel />
        <FusionStatusPanel session="P66_DiningRoom" />
        <RealityCorrectionPanel />
      </div>
    </div>
  );
}
```

## Features Implemented

### ✅ Phase 1: Multi-Scan Capture
- **`/api/reality/upload`** - Upload scan metadata + file URL
- **`RealityCapturePanel`** - Device configuration, file upload UI
- **Metadata storage** - Device pose, camera intrinsics, lighting, area tagging
- **Supabase integration** - Scans stored in `reality_scans` table

### ✅ Phase 2: EchoFusion AI (Open3D Pipeline)
- **Python FastAPI service** - ICP registration, Poisson reconstruction
- **`/api/reality/fuse`** - Trigger mesh fusion for a session
- **Multi-scan alignment** - Feature-based registration + ICP refinement
- **Surface reconstruction** - Poisson reconstruction to watertight mesh
- **GLB export** - Export fused mesh to industry-standard format
- **Supabase Storage** - Upload merged shells for persistence
- **Job tracking** - `reality_fusion_jobs` table for status monitoring

### ✅ Phase 3: Manual Correction UI
- **`RealityCorrectionPanel`** - 4 correction tools:
  - Gap Fill Brush
  - Realign Plane
  - Surface Material Tagger
  - Merge/Split Mesh
- **Training delta generation** - Corrections saved as training data
- **`/api/reality/corrections`** - Store manual corrections for learning

### ✅ Phase 4: Room Shell in EchoLayout
- **`useRoomShell` hook** - Fetch merged GLB from Supabase
- **`EchoLayoutScene` integration** - Load GLB as static environment mesh
- **File picker** - Load button to manually select GLB files
- **Semi-transparent rendering** - Visual distinction from interactive furniture

### ✅ Phase 5: EchoAI³ Learning
- **`EchoMemoryCore`** - Persistent learning across sessions
- **`EchoRealityTrainer`** - Adjust weights from corrections
- **Vector embeddings** - Semantic search for similar rooms
- **Room typologies** - Learn patterns by room type (banquet, boardroom, etc.)
- **`reality_training_state` table** - Store learned weights per session

### ✅ Companion Components
- **`ScanHealthBar`** - Visual quality indicator (coverage, holes, mesh quality)
- **`FusionStatusPanel`** - Monitor fusion progress, load shells
- **`useFusionStatus` hook** - Real-time job status polling
- **`useRoomShell` hook** - Fetch merged geometry
- **`useEchoMemory` hook** - Access learning core

## API Reference

### Upload Scan
```bash
POST /api/reality/upload
Content-Type: application/json

{
  "scanId": "uuid",
  "userId": "chef-id",
  "session": "P66_DiningRoom",
  "devicePose": {
    "position": [0, 0, 0],
    "rotation": [0, 0, 0]
  },
  "cameraIntrinsics": {...},
  "fileUrl": "https://storage.supabase.co/.../scan.glb",
  "meta": {
    "device": "iPhone15Pro",
    "area": "west wall",
    "lighting": "natural",
    "quality": "high",
    "timestamp": 1234567890
  }
}

Response: { success: true, scanId, message, storageKey }
```

### Start Fusion
```bash
POST /api/reality/fuse
Content-Type: application/json

{ "session": "P66_DiningRoom" }

Response: { success: true, jobId, message }
```

### Check Fusion Status
```bash
GET /api/reality/fusion-status/{jobId}

Response: {
  id, jobId, session, status, scan_count,
  result_glb_url, error_message, created_at, updated_at
}
```

### Get Room Shell
```bash
GET /api/reality/shell?session=P66_DiningRoom

Response: {
  id, session, glb_url, meta, fusion_job_id, created_at, updated_at
}
```

### Save Correction
```bash
POST /api/reality/corrections
Content-Type: application/json

{
  "session": "P66_DiningRoom",
  "scanId": "uuid",
  "correctionType": "gap_fill",
  "delta": {
    "region": [[x,y,z], ...],
    "action": "gap_fill",
    "tags": ["wall"]
  }
}

Response: { success: true, correctionId, message }
```

## Deployment

### Production: Fly.io

**Python Service:**
```bash
cd python_fusion_service
fly launch --name echo-fusion-service
fly secrets set SUPABASE_URL=... SUPABASE_KEY=...
fly deploy
```

**Node.js Backend:**
```bash
# Already deployed, just add env var:
fly secrets set PYTHON_FUSION_SERVICE=https://echo-fusion-service.fly.dev
```

### Production: Docker

Both services support Docker deployment. See `python_fusion_service/DEPLOYMENT.md` for details.

## Troubleshooting

### Fusion Service Won't Start

1. **Check logs:**
   ```bash
   fly logs  # For Fly.io
   docker logs echo-fusion-service  # For Docker
   ```

2. **Verify environment:**
   - Is `SUPABASE_URL` set correctly?
   - Is `SUPABASE_KEY` valid?
   - Can Python reach Supabase?

3. **Test endpoint:**
   ```bash
   curl http://localhost:8000/api/health
   ```

### Fusion Jobs Stuck in "Processing"

1. **Check Python service logs** for errors
2. **Verify file URLs** - Can Python download the GLB files?
3. **Check disk space** - Fusion uses temp files
4. **Monitor memory** - Large point clouds need RAM

### Room Shell Not Loading in EchoLayout

1. **Verify shell exists:**
   ```bash
   curl "/api/reality/shell?session=P66_DiningRoom"
   ```

2. **Check GLB file:**
   - Is it a valid 3D model?
   - Is it public in Supabase Storage?

3. **Inspect browser console** for Three.js errors

## Performance Tips

### Optimization Parameters

In `python_fusion_service/main.py`:

```python
# Reduce point cloud sampling for faster processing:
combined_pcd = combined_pcd.voxel_down_sample(voxel_size=0.02)  # Was 0.01

# Reduce Poisson reconstruction depth:
mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(
    combined_pcd, depth=8  # Was 9
)

# Reduce FPFH radius for faster registration:
o3d.geometry.KDTreeSearchParamHybrid(radius=0.2, max_nn=100)  # Was 0.15
```

### Batch Processing

For large sessions (10+ scans), consider:
1. Split scans into groups (e.g., 5 per fusion job)
2. Merge results hierarchically
3. Store intermediate meshes for debugging

## Future Enhancements

### Phase 2.5: Neural SDF
- Integrate Instant-NGP or NeuralRecon
- Higher-quality reconstructions for complex geometry
- Estimated ETA: Post-MVP

### WebXR/AR Preview
- AR mode to preview merged mesh in real space
- Capture overlay for mobile
- Estimated ETA: Q2 2025

### Decor Auto-Extraction
- Material Tagger to classify surfaces
- Auto-create decor layers from classification
- Estimated ETA: Post-MVP

### Team Merge
- Merge scans from multiple users
- Voting/consensus on corrections
- Estimated ETA: Q1 2025

## Support

**Issues?** Check:
1. Logs: `fly logs`, `docker logs`, browser console
2. Databases: Verify tables exist in Supabase
3. Connectivity: Ping Python service `/api/health`
4. Files: Ensure GLBs are accessible via fileUrl

**Documentation:**
- Open3D: https://www.open3d.org/docs/
- FastAPI: https://fastapi.tiangolo.com/
- Supabase: https://supabase.com/docs
- Three.js GLB loading: https://threejs.org/docs/#examples/en/loaders/GLTFLoader

---

**Congratulations!** You now have a complete Phase 2 implementation with production-ready mesh fusion. 🎉
