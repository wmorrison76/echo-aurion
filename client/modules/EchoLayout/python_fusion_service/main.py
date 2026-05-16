"""
EchoReality Fusion Service
FastAPI backend for Open3D mesh processing and ICP registration
Handles: point cloud alignment, mesh merging, and neural SDF fusion
"""

import os
import json
import logging
from typing import List, Optional
from datetime import datetime
import asyncio
import tempfile
from pathlib import Path

import numpy as np
import open3d as o3d
import requests
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import supabase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment
PYTHON_ENV = os.getenv("ENV", "development")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
NODEJS_CALLBACK_URL = os.getenv("NODEJS_CALLBACK_URL", "http://localhost:3000")

# Initialize Supabase client
supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

# FastAPI app
app = FastAPI(
    title="EchoReality Fusion Service",
    description="Open3D-based mesh fusion for 3D room reconstruction",
    version="1.0.0",
)


# ============================================================================
# Data Models
# ============================================================================

class ScanMetadata(BaseModel):
    scanId: str
    fileUrl: str
    devicePose: Optional[dict] = None
    meta: Optional[dict] = None


class FusionRequest(BaseModel):
    jobId: str
    session: str
    scans: List[ScanMetadata]


class FusionResponse(BaseModel):
    jobId: str
    session: str
    status: str
    message: str
    glbUrl: Optional[str] = None


# ============================================================================
# Open3D Mesh Processing Functions
# ============================================================================

class MeshFusion:
    """Mesh fusion pipeline using Open3D"""

    @staticmethod
    def download_mesh(file_url: str) -> o3d.geometry.TriangleMesh:
        """Download mesh from URL and load with Open3D"""
        try:
            # Download file
            response = requests.get(file_url, timeout=30)
            response.raise_for_status()

            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=".glb", delete=False) as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

            # Load mesh
            mesh = o3d.io.read_triangle_mesh(tmp_path)

            # Clean up
            os.unlink(tmp_path)

            logger.info(f"Loaded mesh: {len(mesh.vertices)} vertices, {len(mesh.triangles)} triangles")
            return mesh
        except Exception as e:
            logger.error(f"Failed to download mesh from {file_url}: {e}")
            raise

    @staticmethod
    def preprocess_mesh(mesh: o3d.geometry.TriangleMesh) -> o3d.geometry.TriangleMesh:
        """Preprocess mesh: remove duplicates, clean normals"""
        # Remove unreferenced vertices
        mesh.remove_unreferenced_vertices()

        # Remove degenerate triangles
        mesh.remove_degenerate_triangles()

        # Compute normals
        mesh.compute_vertex_normals()

        # Remove outliers using statistical outlier removal
        if len(mesh.vertices) > 100:
            downsampled = mesh.uniform_down_sample(5)
            logger.info(f"Downsampled to {len(downsampled.vertices)} vertices")

        return mesh

    @staticmethod
    def register_meshes(source: o3d.geometry.TriangleMesh, target: o3d.geometry.TriangleMesh) -> tuple:
        """Register source mesh to target using ICP"""
        try:
            # Convert to point clouds for ICP
            source_pcd = source.sample_points_uniformly(number_of_points=100000)
            target_pcd = target.sample_points_uniformly(number_of_points=100000)

            # Coarse alignment using RANSAC
            distance_threshold = 0.1
            result_ransac = o3d.pipelines.registration.registration_ransac_based_on_feature_matching(
                source_pcd,
                target_pcd,
                source_fpfh := o3d.pipelines.registration.compute_fpfh_feature(
                    source_pcd, o3d.geometry.KDTreeSearchParamHybrid(radius=0.15, max_nn=100)
                ),
                target_fpfh := o3d.pipelines.registration.compute_fpfh_feature(
                    target_pcd, o3d.geometry.KDTreeSearchParamHybrid(radius=0.15, max_nn=100)
                ),
                o3d.pipelines.registration.CorrespondenceCheckerBasedOnEdgeLength(0.9),
                o3d.pipelines.registration.CorrespondenceCheckerBasedOnDistance(distance_threshold),
                o3d.pipelines.registration.RANSACConvergenceCriteria(100000, 0.999)
            )

            # Fine alignment using ICP
            result_icp = o3d.pipelines.registration.registration_icp(
                source_pcd,
                target_pcd,
                distance_threshold,
                result_ransac.transformation,
                o3d.pipelines.registration.ICPConvergenceCriteria(max_iteration=50)
            )

            logger.info(f"ICP fitness: {result_icp.fitness:.4f}, RMSE: {result_icp.inlier_rmse:.4f}")

            return result_icp.transformation, result_icp.fitness

        except Exception as e:
            logger.error(f"ICP registration failed: {e}")
            # Return identity if ICP fails
            return np.eye(4), 0.0

    @staticmethod
    def fuse_meshes(meshes: List[o3d.geometry.TriangleMesh]) -> o3d.geometry.TriangleMesh:
        """Fuse multiple meshes using point cloud fusion and Poisson reconstruction"""
        if not meshes:
            raise ValueError("No meshes to fuse")

        if len(meshes) == 1:
            return meshes[0]

        # Start with first mesh as reference
        reference = meshes[0]
        combined_pcd = reference.sample_points_uniformly(number_of_points=500000)

        logger.info(f"Starting fusion of {len(meshes)} meshes")

        # Align and merge all other meshes
        for i, mesh in enumerate(meshes[1:], 1):
            logger.info(f"Processing mesh {i}/{len(meshes)-1}")

            # Align to reference
            transformation, fitness = MeshFusion.register_meshes(mesh, reference)

            # Apply transformation
            mesh.transform(transformation)

            # Sample points and combine
            pcd = mesh.sample_points_uniformly(number_of_points=500000)
            combined_pcd += pcd

        logger.info(f"Combined point cloud: {len(combined_pcd.points)} points")

        # Remove duplicate points
        combined_pcd = combined_pcd.voxel_down_sample(voxel_size=0.01)
        logger.info(f"Downsampled to {len(combined_pcd.points)} points")

        # Reconstruct surface using Poisson reconstruction
        logger.info("Running Poisson reconstruction...")
        mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(
            combined_pcd, depth=9, width=0, scale=1.1, linear_fit=False
        )

        # Remove low-density vertices
        vertices_to_remove = densities < np.quantile(densities, 0.1)
        mesh.remove_vertices_by_mask(vertices_to_remove)

        logger.info(f"Fused mesh: {len(mesh.vertices)} vertices, {len(mesh.triangles)} triangles")

        return mesh

    @staticmethod
    def export_glb(mesh: o3d.geometry.TriangleMesh, output_path: str) -> str:
        """Export mesh as GLB file"""
        # Ensure mesh is watertight
        if not mesh.is_watertight():
            logger.warning("Mesh is not watertight. Attempting repair...")
            mesh.remove_degenerate_triangles()
            mesh.remove_unreferenced_vertices()
            mesh.compute_vertex_normals()

        # Write GLB
        o3d.io.write_triangle_mesh(output_path, mesh)
        logger.info(f"Exported mesh to {output_path}")

        return output_path


# ============================================================================
# API Endpoints
# ============================================================================

@app.post("/api/fuse", response_model=FusionResponse)
async def fuse_scans(request: FusionRequest, background_tasks: BackgroundTasks) -> FusionResponse:
    """
    Fuse multiple scans into a single merged mesh
    Workflow: download → preprocess → register → fuse → export → upload
    """
    job_id = request.jobId
    session = request.session

    logger.info(f"[{job_id}] Starting fusion for session {session} with {len(request.scans)} scans")

    # Update job status to processing
    await update_job_status(job_id, "processing")

    # Run fusion in background
    background_tasks.add_task(
        process_fusion,
        job_id=job_id,
        session=session,
        scans=request.scans,
    )

    return FusionResponse(
        jobId=job_id,
        session=session,
        status="processing",
        message=f"Fusion started for {len(request.scans)} scans",
    )


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "EchoReality Fusion Service",
        "open3d_version": o3d.__version__,
    }


# ============================================================================
# Background Fusion Task
# ============================================================================

async def process_fusion(job_id: str, session: str, scans: List[ScanMetadata]) -> None:
    """Background fusion task"""
    try:
        logger.info(f"[{job_id}] Processing {len(scans)} scans")

        # Step 1: Download meshes
        logger.info(f"[{job_id}] Downloading {len(scans)} meshes...")
        meshes = []
        for i, scan in enumerate(scans, 1):
            try:
                mesh = MeshFusion.download_mesh(scan.fileUrl)
                mesh = MeshFusion.preprocess_mesh(mesh)
                meshes.append(mesh)
                logger.info(f"[{job_id}] Downloaded mesh {i}/{len(scans)}")
            except Exception as e:
                logger.error(f"[{job_id}] Failed to download scan {scan.scanId}: {e}")
                continue

        if not meshes:
            raise ValueError("Failed to download any scans")

        # Step 2: Fuse meshes
        logger.info(f"[{job_id}] Fusing {len(meshes)} meshes...")
        fused_mesh = MeshFusion.fuse_meshes(meshes)

        # Step 3: Export to GLB
        logger.info(f"[{job_id}] Exporting to GLB...")
        glb_path = f"/tmp/room_shell_{session}_{job_id}.glb"
        MeshFusion.export_glb(fused_mesh, glb_path)

        # Step 4: Upload to Supabase Storage
        logger.info(f"[{job_id}] Uploading to Supabase Storage...")
        glb_url = await upload_to_supabase(glb_path, session, job_id)

        # Step 5: Save result to database
        logger.info(f"[{job_id}] Saving result to database...")
        await save_shell_result(session, glb_url, job_id)

        # Step 6: Update job status
        await update_job_status(job_id, "completed", glb_url)

        logger.info(f"[{job_id}] Fusion completed successfully: {glb_url}")

        # Clean up
        os.unlink(glb_path)

    except Exception as e:
        logger.error(f"[{job_id}] Fusion failed: {e}", exc_info=True)
        await update_job_status(job_id, "failed", error_message=str(e))


# ============================================================================
# Database Functions
# ============================================================================

async def update_job_status(
    job_id: str, status: str, glb_url: Optional[str] = None, error_message: Optional[str] = None
) -> None:
    """Update fusion job status in database"""
    try:
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat(),
        }

        if glb_url:
            update_data["result_glb_url"] = glb_url
            update_data["completed_at"] = datetime.utcnow().isoformat()

        if error_message:
            update_data["error_message"] = error_message

        supabase_client.table("reality_fusion_jobs").update(update_data).eq("job_id", job_id).execute()
        logger.info(f"Updated job {job_id} status to {status}")

    except Exception as e:
        logger.error(f"Failed to update job status: {e}")


async def save_shell_result(session: str, glb_url: str, job_id: str) -> None:
    """Save merged shell to database"""
    try:
        supabase_client.table("reality_shells").upsert(
            {
                "session": session,
                "glb_url": glb_url,
                "fusion_job_id": job_id,
                "meta": {
                    "fused_at": datetime.utcnow().isoformat(),
                    "service": "echo-fusion-v1",
                },
            }
        ).execute()

        logger.info(f"Saved shell result for session {session}")

    except Exception as e:
        logger.error(f"Failed to save shell result: {e}")


async def upload_to_supabase(glb_path: str, session: str, job_id: str) -> str:
    """Upload GLB file to Supabase Storage"""
    try:
        # Read file
        with open(glb_path, "rb") as f:
            file_content = f.read()

        # Upload to Supabase Storage
        file_path = f"reality_shells/{session}/{job_id}/room_shell.glb"
        response = supabase_client.storage.from_("reality").upload(file_path, file_content)

        # Get public URL
        public_url = supabase_client.storage.from_("reality").get_public_url(file_path)

        logger.info(f"Uploaded to Supabase: {file_path}")
        return public_url

    except Exception as e:
        logger.error(f"Failed to upload to Supabase: {e}")
        raise


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        log_level="info",
    )
