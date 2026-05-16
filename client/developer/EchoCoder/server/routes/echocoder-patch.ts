import type { RequestHandler } from "express";
import path from "path";
import { promises as fs } from "fs";
import { stageFiles, updateChangeRequest } from "../services/changeControl";

type PatchInput = { path: string; content: string };

const ROOT = process.cwd();
const ALLOW_ROOTS = [
  path.join(ROOT, "client"),
  path.join(ROOT, "server"),
  path.join(ROOT, "shared"),
];

function isAllowedPath(relPath: string) {
  const full = path.join(ROOT, relPath);
  return ALLOW_ROOTS.some((allowed) => full.startsWith(allowed));
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export const handlePatchPreview: RequestHandler = async (req, res) => {
  try {
    const { tenantId, patches } = req.body || {};
    if (!Array.isArray(patches) || patches.length === 0) {
      return res.status(400).json({ error: "Patches required" });
    }

    const previews = await Promise.all(
      patches.map(async (patch: PatchInput) => {
        const relPath = String(patch.path || "").replace(/^\/+/, "");
        if (!isAllowedPath(relPath)) {
          return { path: relPath, error: "Path not allowed" };
        }
        const tenantPath = tenantId
          ? path.join(ROOT, "client", "tenants", String(tenantId), relPath)
          : null;
        const basePath = path.join(ROOT, relPath);
        const effectivePath = tenantPath && (await readFileIfExists(tenantPath))
          ? tenantPath
          : basePath;
        const before = await readFileIfExists(effectivePath);
        return {
          path: relPath,
          exists: before !== null,
          before: before ?? "",
          after: String(patch.content ?? ""),
        };
      }),
    );

    res.json({ success: true, previews });
  } catch (error) {
    console.error("Patch preview error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handlePatchStage: RequestHandler = async (req, res) => {
  try {
    const { changeRequestId, patches } = req.body || {};
    if (!changeRequestId) {
      return res.status(400).json({ error: "Change request ID required" });
    }
    if (!Array.isArray(patches) || patches.length === 0) {
      return res.status(400).json({ error: "Patches required" });
    }

    const stagedPaths = await stageFiles(
      ROOT,
      String(changeRequestId),
      patches.map((patch: PatchInput) => ({
        relativePath: String(patch.path || "").replace(/^\/+/, ""),
        content: String(patch.content ?? ""),
      })),
    );

    const updated = await updateChangeRequest(
      ROOT,
      String(changeRequestId),
      (reqState) => ({
        ...reqState,
        stagedPaths,
        aiPlan: reqState.aiPlan
          ? reqState.aiPlan
          : {
              summary: "Staged patches",
              plan: "",
              patches: patches.map((patch: PatchInput) => ({
                path: String(patch.path || ""),
              })),
              generatedAt: new Date().toISOString(),
            },
      }),
    );

    res.json({ success: true, changeRequest: updated });
  } catch (error) {
    console.error("Patch staging error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
