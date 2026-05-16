import express from "express";
import { z } from "zod";
import {
  createSpineChain,
  getSpineChain,
  findSpinePath,
  type SpineNode,
  type SpineLink,
} from "../services/spine-chain-store";
import { appendTraceEvent } from "../services/trace-ledger-fallback";

const router = express.Router();

const spineNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["invoice", "ingredient", "storage", "recipe", "dish", "menu", "pos", "export"]),
  label: z.string().min(1),
});

const spineLinkSchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  relation: z.string().min(1),
});

const createChainSchema = z.object({
  orgId: z.string().min(1),
  nodes: z.array(spineNodeSchema),
  links: z.array(spineLinkSchema),
});

/**
 * POST /api/spine-chain
 * Create a new spine chain and emit trace events
 */
router.post("/spine-chain", async (req, res) => {
  try {
    const payload = createChainSchema.parse(req.body);
    // Ensure nodes and links are properly typed
    const nodes: SpineNode[] = payload.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
    }));
    const links: SpineLink[] = payload.links.map((l) => ({
      fromId: l.fromId,
      toId: l.toId,
      relation: l.relation,
    }));
    const chain = await createSpineChain(payload.orgId, nodes, links);

    // Emit trace events
    await appendTraceEvent({
      orgId: payload.orgId,
      entityType: "spine-chain",
      entityId: chain.id,
      sourceRef: "spine-chain-api",
      payload: {
        action: "SPINE_CHAIN_CREATED",
        nodeCount: chain.nodes.length,
        linkCount: chain.links.length,
      },
    });

    for (const link of chain.links) {
      await appendTraceEvent({
        orgId: payload.orgId,
        entityType: "spine-link",
        entityId: `${link.fromId}->${link.toId}`,
        sourceRef: chain.id,
        payload: {
          action: "SPINE_LINK_CREATED",
          fromId: link.fromId,
          toId: link.toId,
          relation: link.relation,
        },
      });
    }

    res.json({ success: true, chain });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create spine chain";
    res.status(400).json({ success: false, error: message });
  }
});

/**
 * GET /api/spine-chain/:chainId
 * Get a spine chain by ID
 */
router.get("/spine-chain/:chainId", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "demo-org";
    const chainId = req.params.chainId;
    const chain = await getSpineChain(orgId, chainId);

    if (!chain) {
      return res.status(404).json({ success: false, error: "Chain not found" });
    }

    res.json({ success: true, chain });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get spine chain";
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/spine-chain/:chainId/path
 * Find a path through the chain from start type to end type
 */
router.get("/spine-chain/:chainId/path", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "demo-org";
    const chainId = req.params.chainId;
    const startType = req.query.startType as SpineNode["type"];
    const endType = req.query.endType as SpineNode["type"];

    if (!startType || !endType) {
      return res.status(400).json({
        success: false,
        error: "startType and endType query parameters are required",
      });
    }

    const chain = await getSpineChain(orgId, chainId);
    if (!chain) {
      return res.status(404).json({ success: false, error: "Chain not found" });
    }

    const path = findSpinePath(chain, startType, endType);
    if (!path) {
      return res.json({ success: true, path: null, message: "No path found" });
    }

    res.json({ success: true, path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to find path";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
