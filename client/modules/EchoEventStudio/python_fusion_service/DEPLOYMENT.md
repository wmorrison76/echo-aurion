# EchoReality Fusion Service - Deployment Guide

## Overview

The EchoReality Fusion Service is a FastAPI-based backend for processing 3D mesh fusion using Open3D. It handles:
- Multi-scan alignment using ICP registration
- Poisson surface reconstruction
- GLB/GLTF mesh export
- Supabase Storage integration

## Local Development

### Prerequisites

- Python 3.11+
- Docker & Docker Compose (optional but recommended)
- Supabase account with project created

### Setup (Without Docker)

1. **Create Python environment:**
   ```bash
   cd python_fusion_service
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Run service:**
   ```bash
   python main.py
   ```

   Service will be available at `http://localhost:8000`

### Setup (With Docker Compose)

1. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

2. **Start services:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f fusion-service
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

## Connecting to Node.js Backend

The Node.js backend calls the Python service at `PYTHON_FUSION_SERVICE` (default: `http://localhost:8000`).

### Configuration in Node.js

Set this environment variable in your `.env` file:

```env
PYTHON_FUSION_SERVICE=http://localhost:8000
```

For production, use the deployed Python service URL.

## API Endpoints

### POST /api/fuse

Start a mesh fusion job.

**Request:**
```json
{
  "jobId": "fusion-session-123456",
  "session": "P66_DiningRoom",
  "scans": [
    {
      "scanId": "scan-uuid-1",
      "fileUrl": "https://storage.supabase.co/.../scan1.glb",
      "devicePose": { "position": [0, 0, 0], "rotation": [0, 0, 0] },
      "meta": { "device": "iPhone15Pro", "area": "west wall" }
    }
  ]
}
```

**Response:**
```json
{
  "jobId": "fusion-session-123456",
  "session": "P66_DiningRoom",
  "status": "processing",
  "message": "Fusion started for 3 scans"
}
```

### GET /api/health

Check service health.

**Response:**
```json
{
  "status": "healthy",
  "service": "EchoReality Fusion Service",
  "open3d_version": "0.17.0"
}
```

## Production Deployment (Fly.io)

### 1. Create Fly.io App

```bash
fly launch --name echo-fusion-service
```

### 2. Configure fly.toml

```toml
[build]
  image = "echo-fusion-service:latest"

[env]
  ENV = "production"
  PYTHON_FUSION_SERVICE = "https://echo-fusion-service.fly.dev"

[build.args]
  PYTHON_VERSION = "3.11"

[[services]]
  internal_port = 8000
  protocol = "tcp"

  [services.ports]
    port = 443
    handlers = ["tls", "http"]

[checks.http]
  grace_period = "30s"
  interval = "30s"
  method = "GET"
  path = "/api/health"
  protocol = "http"
  timeout = "10s"
```

### 3. Set Environment Secrets

```bash
fly secrets set SUPABASE_URL=https://your-project.supabase.co
fly secrets set SUPABASE_KEY=your-anon-key
fly secrets set NODEJS_CALLBACK_URL=https://your-domain.com
```

### 4. Deploy

```bash
fly deploy
```

### 5. Monitor

```bash
fly logs
fly status
fly mon
```

## Production Deployment (Docker)

### Build Image

```bash
docker build -t echo-fusion-service:latest .
docker tag echo-fusion-service:latest your-registry/echo-fusion-service:latest
docker push your-registry/echo-fusion-service:latest
```

### Deploy to Production

1. **Set environment variables in your deployment platform**
2. **Configure load balancer/reverse proxy to route to port 8000**
3. **Monitor logs and health checks**

## Troubleshooting

### Open3D Installation Issues

If Open3D fails to install, ensure system dependencies are available:

```bash
# macOS
brew install open3d

# Ubuntu/Debian
sudo apt-get install libssl-dev libboost-all-dev libeigen3-dev

# Windows
# Download from https://www.open3d.org/
```

### Memory Issues

Fusion operations on large point clouds can require significant RAM. If you encounter memory errors:

1. Reduce point cloud sampling:
   ```python
   combined_pcd = combined_pcd.voxel_down_sample(voxel_size=0.02)  # Increase from 0.01
   ```

2. Process scans in batches rather than all at once

3. Increase container memory limit:
   ```yaml
   # docker-compose.yml
   services:
     fusion-service:
       deploy:
         resources:
           limits:
             memory: 4G
   ```

### Slow Fusion

Optimization strategies:

1. **Reduce ICP iterations** in `register_meshes()`
2. **Decrease Poisson reconstruction depth** (currently 9, try 8)
3. **Increase voxel_down_sample size** for faster processing
4. **Use fewer point samples** in `fuse_meshes()`

## File Structure

```
python_fusion_service/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── Dockerfile             # Docker image definition
├── docker-compose.yml     # Local development setup
├── .env.example           # Environment template
└── DEPLOYMENT.md          # This file
```

## Next Steps

1. **Integrate with Node.js backend** - Point `PYTHON_FUSION_SERVICE` to deployed service
2. **Connect frontend** - Use `/api/reality/fuse` endpoint from React
3. **Monitor jobs** - Use `/api/reality/fusion-status/:jobId` to track progress
4. **Collect feedback** - Monitor logs and optimize parameters based on real-world scans

## Support

For issues or questions, check:
- Open3D documentation: https://www.open3d.org/docs/
- FastAPI documentation: https://fastapi.tiangolo.com/
- Fly.io deployment docs: https://fly.io/docs/
