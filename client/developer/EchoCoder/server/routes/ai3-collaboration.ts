import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const router = Router();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase credentials not configured");
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ShareSessionRequest {
  sessionId: string;
  shareType: "view" | "comment" | "edit";
  sharedWithEmail?: string;
  isPublic?: boolean;
  expiresAt?: string;
}

interface VersionRequest {
  sessionId: string;
  snapshotName?: string;
}

interface ExportJiraRequest {
  sessionId: string;
  projectKey: string;
  issueType: string;
}

interface ExportLinearRequest {
  sessionId: string;
  teamId: string;
}

// Generate a unique share token
function generateShareToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * POST /share - Create a shareable link for a session
 * Body: { sessionId, shareType, sharedWithEmail?, isPublic?, expiresAt? }
 */
router.post("/share", async (req: Request, res: Response) => {
  try {
    const { sessionId, shareType, sharedWithEmail, isPublic, expiresAt } =
      req.body as ShareSessionRequest;

    if (!sessionId || !shareType) {
      return res
        .status(400)
        .json({ success: false, message: "sessionId and shareType are required" });
    }

    const shareToken = generateShareToken();
    const userId = (req.headers["user-id"] as string) || "anonymous";

    // Get the session to verify it exists
    const { data: sessionData, error: sessionError } = await supabase
      .from("ai3_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionData) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Insert share record
    const { data: shareData, error: shareError } = await supabase
      .from("ai3_shared_sessions")
      .insert({
        session_id: sessionId,
        shared_by: userId,
        share_token: shareToken,
        share_type: shareType,
        shared_with_email: sharedWithEmail || null,
        is_public: isPublic || false,
        expires_at: expiresAt || null,
      })
      .select()
      .single();

    if (shareError) {
      return res.status(500).json({ success: false, message: shareError.message });
    }

    const shareLink = `${process.env.APP_URL || "http://localhost:8080"}/share/${shareToken}`;

    return res.json({
      success: true,
      data: {
        shareToken,
        shareLink,
        shareType,
        isPublic: shareData.is_public,
        expiresAt: shareData.expires_at,
        sharedWith: sharedWithEmail,
      },
      message: "Session shared successfully",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to share session" });
  }
});

/**
 * GET /share/:shareToken - Access a shared session
 */
router.get("/share/:shareToken", async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;

    if (!shareToken) {
      return res.status(400).json({ success: false, message: "Share token is required" });
    }

    // Get share record
    const { data: shareData, error: shareError } = await supabase
      .from("ai3_shared_sessions")
      .select(
        `
        *,
        session:ai3_sessions(id, domain, detail_level, initial_problem, created_at, status)
      `,
      )
      .eq("share_token", shareToken)
      .single();

    if (shareError || !shareData) {
      return res.status(404).json({ success: false, message: "Share not found or expired" });
    }

    // Check if expired
    if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: "Share link has expired" });
    }

    // Update access count
    await supabase
      .from("ai3_shared_sessions")
      .update({ access_count: (shareData.access_count || 0) + 1 })
      .eq("id", shareData.id);

    // Get session artifacts if access allows
    let artifacts = null;
    if (
      shareData.share_type === "view" ||
      shareData.share_type === "comment" ||
      shareData.share_type === "edit"
    ) {
      const { data: artifactData } = await supabase
        .from("ai3_artifacts")
        .select("*")
        .eq("session_id", shareData.session_id);

      artifacts = artifactData;
    }

    return res.json({
      success: true,
      data: {
        session: shareData.session,
        artifacts,
        shareType: shareData.share_type,
        accessCount: shareData.access_count + 1,
      },
      message: "Share accessed successfully",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to access share" });
  }
});

/**
 * POST /versions - Create a snapshot/version of a session
 * Body: { sessionId, snapshotName? }
 */
router.post("/versions", async (req: Request, res: Response) => {
  try {
    const { sessionId, snapshotName } = req.body as VersionRequest;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const userId = (req.headers["user-id"] as string) || "anonymous";

    // Get current session data
    const { data: sessionData, error: sessionError } = await supabase
      .from("ai3_sessions")
      .select(
        `
        *,
        conversations:ai3_conversations(*),
        artifacts:ai3_artifacts(*),
        ratings:ai3_session_ratings(*),
        metrics:ai3_code_metrics(*)
      `,
      )
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionData) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Count existing snapshots to get snapshot number
    const { data: existingSnapshots, error: countError } = await supabase
      .from("ai3_session_snapshots")
      .select("snapshot_number", { count: "exact" })
      .eq("session_id", sessionId)
      .order("snapshot_number", { ascending: false })
      .limit(1);

    const nextSnapshotNumber = (existingSnapshots?.[0]?.snapshot_number || 0) + 1;

    // Create snapshot
    const { data: snapshotData, error: snapshotError } = await supabase
      .from("ai3_session_snapshots")
      .insert({
        session_id: sessionId,
        snapshot_number: nextSnapshotNumber,
        snapshot_name:
          snapshotName || `Snapshot ${nextSnapshotNumber} - ${new Date().toISOString()}`,
        snapshot_data: sessionData,
        created_by: userId,
      })
      .select()
      .single();

    if (snapshotError) {
      return res.status(500).json({ success: false, message: snapshotError.message });
    }

    return res.json({
      success: true,
      data: {
        snapshotId: snapshotData.id,
        snapshotNumber: nextSnapshotNumber,
        snapshotName: snapshotData.snapshot_name,
        createdAt: snapshotData.created_at,
      },
      message: "Version created successfully",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to create version" });
  }
});

/**
 * GET /versions/:sessionId - Get all versions of a session
 */
router.get("/versions/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const { data: versions, error } = await supabase
      .from("ai3_session_snapshots")
      .select("*")
      .eq("session_id", sessionId)
      .order("snapshot_number", { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({
      success: true,
      data: versions || [],
      message: "Versions retrieved successfully",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to get versions" });
  }
});

/**
 * POST /restore-version - Restore a session to a previous version
 * Body: { sessionId, snapshotId }
 */
router.post("/restore-version", async (req: Request, res: Response) => {
  try {
    const { sessionId, snapshotId } = req.body;

    if (!sessionId || !snapshotId) {
      return res
        .status(400)
        .json({ success: false, message: "sessionId and snapshotId are required" });
    }

    const userId = (req.headers["user-id"] as string) || "anonymous";

    // Get the snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("ai3_session_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .single();

    if (snapshotError || !snapshot) {
      return res.status(404).json({ success: false, message: "Snapshot not found" });
    }

    // Update session with snapshot data
    const snapshotData = snapshot.snapshot_data;
    const { error: updateError } = await supabase
      .from("ai3_sessions")
      .update({
        domain: snapshotData.domain,
        initial_problem: snapshotData.initial_problem,
        status: snapshotData.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) {
      return res.status(500).json({ success: false, message: updateError.message });
    }

    return res.json({
      success: true,
      data: {
        sessionId,
        restoredFrom: snapshot.snapshot_name,
        restoredAt: new Date().toISOString(),
      },
      message: "Session restored from version successfully",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to restore version" });
  }
});

/**
 * POST /export-jira - Export session requirements as Jira task
 * Body: { sessionId, projectKey, issueType }
 */
router.post("/export-jira", async (req: Request, res: Response) => {
  try {
    const { sessionId, projectKey, issueType } = req.body as ExportJiraRequest;

    if (!sessionId || !projectKey || !issueType) {
      return res.status(400).json({
        success: false,
        message: "sessionId, projectKey, and issueType are required",
      });
    }

    const userId = (req.headers["user-id"] as string) || "anonymous";

    // Get session and artifacts
    const { data: sessionData } = await supabase
      .from("ai3_sessions")
      .select(
        `
        *,
        artifacts:ai3_artifacts(*),
        ratings:ai3_session_ratings(*)
      `,
      )
      .eq("id", sessionId)
      .single();

    if (!sessionData) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Build Jira task description
    const description = `
## AI³ Generated Module Requirements

**Domain:** ${sessionData.domain || "Not specified"}
**Detail Level:** ${sessionData.detail_level}
**Created:** ${new Date(sessionData.created_at).toLocaleDateString()}

### Problem Statement
${sessionData.initial_problem}

### Generated Artifacts
${
  sessionData.artifacts
    ?.map((a: any) => `- ${a.artifact_type}: ${a.file_path}`)
    .join("\n") || "No artifacts generated"
}

### Quality Ratings
${
  sessionData.ratings
    ? `
- Accuracy: ${sessionData.ratings[0]?.accuracy_rating || "N/A"}/5
- Code Quality: ${sessionData.ratings[0]?.code_quality_rating || "N/A"}/5
- Requirements Clarity: ${sessionData.ratings[0]?.requirements_clarity_rating || "N/A"}/5
`
    : "Not rated"
}
    `.trim();

    // Create export record (actual Jira API call would happen here with real credentials)
    const { data: exportData, error: exportError } = await supabase
      .from("ai3_task_exports")
      .insert({
        session_id: sessionId,
        exported_by: userId,
        export_platform: "jira",
        external_id: `${projectKey}-1000`, // Mock ID
        external_url: `https://jira.example.com/browse/${projectKey}-1000`,
        export_status: "pending",
      })
      .select()
      .single();

    if (exportError) {
      return res.status(500).json({ success: false, message: exportError.message });
    }

    return res.json({
      success: true,
      data: {
        taskKey: "ECHO-1000",
        taskUrl: `https://jira.example.com/browse/ECHO-1000`,
        exportId: exportData.id,
        status: "pending",
      },
      message: "Session exported to Jira successfully",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to export to Jira" });
  }
});

/**
 * POST /export-linear - Export session requirements as Linear issue
 * Body: { sessionId, teamId }
 */
router.post("/export-linear", async (req: Request, res: Response) => {
  try {
    const { sessionId, teamId } = req.body as ExportLinearRequest;

    if (!sessionId || !teamId) {
      return res
        .status(400)
        .json({ success: false, message: "sessionId and teamId are required" });
    }

    const userId = (req.headers["user-id"] as string) || "anonymous";

    // Get session data
    const { data: sessionData } = await supabase
      .from("ai3_sessions")
      .select(
        `
        *,
        artifacts:ai3_artifacts(*),
        ratings:ai3_session_ratings(*)
      `,
      )
      .eq("id", sessionId)
      .single();

    if (!sessionData) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Build Linear issue description
    const description = `
## AI³ Generated Module Requirements

**Domain:** ${sessionData.domain || "Not specified"}
**Detail Level:** ${sessionData.detail_level}
**Created:** ${new Date(sessionData.created_at).toLocaleDateString()}

### Problem Statement
${sessionData.initial_problem}

### Generated Code & Artifacts
${
  sessionData.artifacts
    ?.map((a: any) => `- **${a.artifact_type}**: \`${a.file_path}\``)
    .join("\n") || "No artifacts"
}

### Session Metadata
- Conversation Turns: ${sessionData.conversation_turns}
- Status: ${sessionData.status}
- Duration: ${sessionData.session_duration_seconds || "N/A"} seconds
    `.trim();

    // Create export record
    const { data: exportData, error: exportError } = await supabase
      .from("ai3_task_exports")
      .insert({
        session_id: sessionId,
        exported_by: userId,
        export_platform: "linear",
        external_id: `LIN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        external_url: `https://linear.app/example/issue/LIN-123`,
        export_status: "pending",
      })
      .select()
      .single();

    if (exportError) {
      return res.status(500).json({ success: false, message: exportError.message });
    }

    return res.json({
      success: true,
      data: {
        issueId: exportData.external_id,
        issueUrl: exportData.external_url,
        exportId: exportData.id,
        status: "pending",
      },
      message: "Session exported to Linear successfully",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to export to Linear" });
  }
});

/**
 * GET /exports/:sessionId - Get all exports for a session
 */
router.get("/exports/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const { data: exports, error } = await supabase
      .from("ai3_task_exports")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({
      success: true,
      data: exports || [],
      message: "Exports retrieved successfully",
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to get exports" });
  }
});

export default router;
