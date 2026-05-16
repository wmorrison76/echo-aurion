import { Router } from "express";
import collaborationStore from "../lib/collaboration-store";
const router = Router();
router.post("/create-share-link", (req, res) => {
  try {
    const { designId, permission, expiresAt } = req.body;
    if (!designId || !permission) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const link = collaborationStore.createShareLink(
      designId,
      permission as "view" | "comment" | "edit",
      expiresAt,
    );
    res.json(link);
  } catch (error) {
    console.error("Error creating share link:", error);
    res.status(500).json({ error: "Failed to create share link" });
  }
});
router.post("/revoke-share-link", (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Missing token" });
    }
    const success = collaborationStore.revokeShareLink(token);
    if (!success) {
      return res.status(404).json({ error: "Link not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error revoking share link:", error);
    res.status(500).json({ error: "Failed to revoke share link" });
  }
});
router.get("/verify-share-link/:token", (req, res) => {
  try {
    const { token } = req.params;
    const link = collaborationStore.getShareLink(token);
    if (!link) {
      return res.status(404).json({ error: "Link not found or expired" });
    }
    res.json({ designId: link.designId, permission: link.permission });
  } catch (error) {
    console.error("Error verifying share link:", error);
    res.status(500).json({ error: "Failed to verify share link" });
  }
});
export default router;
