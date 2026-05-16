import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import {
  verifySupabaseAuth,
  verifyOrganizationAccess,
} from "../middleware/supabaseAuth";
import { featureGate } from "../middleware/featureGate";
import { tier2Limiter } from "../middleware/rateLimit";

const router: Router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "",
);

// Security middleware stack: Auth -> Org Access -> Rate Limiting -> Feature Gating
router.use(verifySupabaseAuth);
router.use(verifyOrganizationAccess);
router.use(tier2Limiter);
router.use(featureGate("tier2_graphql"));

const GRAPHQL_SCHEMA = `
type Query {
  workspace(id: String!): Workspace
  workspaces(userId: String!): [Workspace]
  content(id: String!): Content
  contentList(workspaceId: String!): [Content]
  user(id: String!): User
  analytics(contentId: String!): Analytics
}

type Workspace {
  id: String!
  name: String!
  slug: String!
  owner: User!
  members: [WorkspaceMember]
  created_at: String!
}

type WorkspaceMember {
  id: String!
  user: User!
  role: String!
  joined_at: String!
}

type Content {
  id: String!
  title: String!
  slug: String!
  status: String!
  workspace: Workspace!
  created_at: String!
  updated_at: String!
}

type User {
  id: String!
  name: String!
  email: String!
}

type Analytics {
  id: String!
  content: Content!
  views: Int!
  engagement: Int!
  trending_score: Float!
}
`;

router.post(
  "/query",
  asyncHandler(async (req: Request, res: Response) => {
    const { query: queryStr, variables = {} } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    if (!queryStr) {
      throwAppError("query required", 400);
    }

    if (queryStr.includes("workspace(")) {
      const idMatch = queryStr.match(/workspace\(\s*id:\s*"([^"]+)"/);
      const id = idMatch?.[1];

      if (!id) {
        return res.json({
          data: null,
          errors: ["id argument required"],
        });
      }

      const { data, error } = await supabase
        .from("tier2_workspaces")
        .select("*")
        .eq("id", id)
        .single();

      return res.json({
        data: data ? { workspace: data } : null,
        errors: error ? [error.message] : [],
      });
    }

    if (queryStr.includes("workspaces(")) {
      const userIdMatch = queryStr.match(/workspaces\(\s*userId:\s*"([^"]+)"/);
      const queryUserId = userIdMatch?.[1] || userId;

      const { data: memberData } = await supabase
        .from("tier2_workspace_members")
        .select("workspace_id")
        .eq("user_id", queryUserId);

      const workspaceIds = memberData?.map((m: any) => m.workspace_id) || [];

      if (workspaceIds.length === 0) {
        return res.json({
          data: { workspaces: [] },
          errors: [],
        });
      }

      const { data: workspaces } = await supabase
        .from("tier2_workspaces")
        .select("*")
        .in("id", workspaceIds);

      return res.json({
        data: {
          workspaces: workspaces || [],
        },
        errors: [],
      });
    }

    res.json({
      data: null,
      errors: ["Query not recognized"],
    });
  }),
);

router.get(
  "/schema",
  asyncHandler(async (req: Request, res: Response) => {
    return res.json({
      success: true,
      schema: GRAPHQL_SCHEMA,
      message: "GraphQL schemas retrieved",
    });
  }),
);

router.post(
  "/register-schema",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id, name, schema_def } = req.body;
    const userId = (req as any).user?.id;

    if (!workspace_id || !name || !schema_def) {
      throwAppError("workspace_id, name, and schema_def are required", 400);
    }

    const { data, error } = await supabase
      .from("graphql_schemas")
      .insert([{ workspace_id, name, schema_def, created_by: userId }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data,
      message: "GraphQL schema registered",
    });
  }),
);

router.put(
  "/schema/:schemaId",
  asyncHandler(async (req: Request, res: Response) => {
    const { schemaId } = req.params;
    const { name, schema_def } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("graphql_schemas")
      .update({ name, schema_def, updated_at: new Date() })
      .eq("id", schemaId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      message: "GraphQL schema updated",
    });
  }),
);

router.delete(
  "/schema/:schemaId",
  asyncHandler(async (req: Request, res: Response) => {
    const { schemaId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { error } = await supabase
      .from("graphql_schemas")
      .delete()
      .eq("id", schemaId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "GraphQL schema deleted",
    });
  }),
);

export default router;
