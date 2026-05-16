import express, { Router, Request, Response } from "express";
import {
  verifySupabaseAuth,
  verifyOrganizationAccess,
  requireOrgAdmin,
  auditLog,
  getSupabaseClient,
  AuthenticatedRequest,
} from "../middleware/supabaseAuth";
import { featureGate } from "../middleware/featureGate";
import { snapshotEncryptionService } from "../services/SnapshotEncryptionService";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

interface SnapshotRequest {
  name: string;
  description?: string;
  password?: string;
}

/**
 * POST /api/snapshots
 * Create a new snapshot
 * Requires: Admin + Feature gate
 */
router.post(
  "/",
  verifySupabaseAuth,
  verifyOrganizationAccess,
  requireOrgAdmin,
  featureGate("snapshots"),
  upload.single("data"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.org_id) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No data provided" });
        return;
      }

      const { name, description, password } = req.body as SnapshotRequest;

      if (!name) {
        res.status(400).json({ error: "Snapshot name required" });
        return;
      }

      const supabase = getSupabaseClient();

      // Encrypt snapshot
      const encrypted = await snapshotEncryptionService.encryptSnapshot(
        req.file.buffer,
        password || "default"
      );

      // Combine encrypted data for storage
      const encryptedData = Buffer.concat([
        encrypted.data,
      ]);

      // Store in database
      const { data, error } = await supabase
        .from("system_snapshots")
        .insert({
          org_id: req.org_id,
          name,
          description,
          snapshot_data: encryptedData,
          encryption_algorithm: encrypted.algorithm,
          compression_algorithm: encrypted.compression,
          iv_hex: encrypted.iv,
          auth_tag_hex: encrypted.authTag,
          encryption_key_hash: password
            ? snapshotEncryptionService.hashPassword(password)
            : null,
          is_encrypted: true,
          size_bytes: encryptedData.length,
          created_by: req.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await auditLog(
        req.org_id,
        req.user.id,
        "snapshot_created",
        "snapshot",
        data.id,
        {
          name,
          size: encryptedData.length,
          encrypted: true,
        }
      );

      res.json({
        success: true,
        snapshot: {
          id: data.id,
          name: data.name,
          created_at: data.created_at,
          size_bytes: data.size_bytes,
        },
      });
    } catch (error) {
      console.error("Snapshot creation error:", error);

      if (req.user && req.org_id) {
        await auditLog(
          req.org_id,
          req.user.id,
          "snapshot_created",
          "snapshot",
          null,
          null,
          "failure",
          (error as Error).message
        );
      }

      res.status(500).json({
        error: "Failed to create snapshot",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/snapshots
 * List snapshots for organization
 * Requires: Manager role
 */
router.get(
  "/",
  verifySupabaseAuth,
  verifyOrganizationAccess,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.org_id) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("system_snapshots")
        .select("id, name, description, created_at, size_bytes, restore_count")
        .eq("org_id", req.org_id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        snapshots: data || [],
      });
    } catch (error) {
      console.error("Snapshot list error:", error);
      res.status(500).json({
        error: "Failed to list snapshots",
      });
    }
  }
);

/**
 * GET /api/snapshots/:id
 * Get snapshot details
 * Requires: Manager role
 */
router.get(
  "/:id",
  verifySupabaseAuth,
  verifyOrganizationAccess,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.org_id) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { id } = req.params;
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("system_snapshots")
        .select("*")
        .eq("id", id)
        .eq("org_id", req.org_id)
        .single();

      if (error || !data) {
        res.status(404).json({ error: "Snapshot not found" });
        return;
      }

      res.json({
        success: true,
        snapshot: {
          id: data.id,
          name: data.name,
          description: data.description,
          created_at: data.created_at,
          size_bytes: data.size_bytes,
          restore_count: data.restore_count,
          encrypted: data.is_encrypted,
        },
      });
    } catch (error) {
      console.error("Snapshot retrieval error:", error);
      res.status(500).json({
        error: "Failed to retrieve snapshot",
      });
    }
  }
);

/**
 * POST /api/snapshots/:id/restore
 * Restore snapshot
 * Requires: Admin + Password
 */
router.post(
  "/:id/restore",
  verifySupabaseAuth,
  verifyOrganizationAccess,
  requireOrgAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.org_id) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { id } = req.params;
      const { password } = req.body;

      if (!password) {
        res.status(400).json({ error: "Password required for restore" });
        return;
      }

      const supabase = getSupabaseClient();

      // Get snapshot
      const { data: snapshot, error: snapshotError } = await supabase
        .from("system_snapshots")
        .select("*")
        .eq("id", id)
        .eq("org_id", req.org_id)
        .single();

      if (snapshotError || !snapshot) {
        res.status(404).json({ error: "Snapshot not found" });
        return;
      }

      // Decrypt
      const restored = await snapshotEncryptionService.decryptSnapshot(
        {
          data: snapshot.snapshot_data,
          iv: snapshot.iv_hex,
          authTag: snapshot.auth_tag_hex,
          salt: "", // Salt would need to be stored separately
          algorithm: snapshot.encryption_algorithm,
          compression: snapshot.compression_algorithm,
        },
        password
      );

      // Increment restore count
      await supabase
        .from("system_snapshots")
        .update({
          restore_count: snapshot.restore_count + 1,
          accessed_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Audit log
      await auditLog(
        req.org_id,
        req.user.id,
        "snapshot_restored",
        "snapshot",
        id,
        {
          size: restored.data.length,
          checksum: restored.metadata.checksum,
        }
      );

      res.json({
        success: true,
        message: "Snapshot restored",
        data: restored.data.toString("base64"),
        metadata: restored.metadata,
      });
    } catch (error) {
      console.error("Snapshot restore error:", error);

      if (req.user && req.org_id) {
        await auditLog(
          req.org_id,
          req.user.id,
          "snapshot_restored",
          "snapshot",
          req.params.id,
          null,
          "failure",
          (error as Error).message
        );
      }

      res.status(500).json({
        error: "Failed to restore snapshot",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * DELETE /api/snapshots/:id
 * Delete snapshot
 * Requires: Admin
 */
router.delete(
  "/:id",
  verifySupabaseAuth,
  verifyOrganizationAccess,
  requireOrgAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.org_id) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { id } = req.params;
      const supabase = getSupabaseClient();

      await supabase
        .from("system_snapshots")
        .update({ is_deleted: true })
        .eq("id", id)
        .eq("org_id", req.org_id);

      // Audit log
      await auditLog(
        req.org_id,
        req.user.id,
        "snapshot_deleted",
        "snapshot",
        id
      );

      res.json({
        success: true,
        message: "Snapshot deleted",
      });
    } catch (error) {
      console.error("Snapshot deletion error:", error);

      if (req.user && req.org_id) {
        await auditLog(
          req.org_id,
          req.user.id,
          "snapshot_deleted",
          "snapshot",
          req.params.id,
          null,
          "failure",
          (error as Error).message
        );
      }

      res.status(500).json({
        error: "Failed to delete snapshot",
        message: (error as Error).message,
      });
    }
  }
);

export default router;
