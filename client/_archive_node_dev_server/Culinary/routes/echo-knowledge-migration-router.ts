/** * Echo Knowledge Migration Router * Routes for managing the migration from Pinecone to internal pgvector storage */ import express from "express";
import {
  startFullMigration,
  startSelectiveMigration,
  getMigrationProgress,
  checkKnowledgeHealth,
  getPineconeStats,
  getInternalStats,
  getMigrationStatus,
} from "./echo-knowledge-migration";
export const echoKnowledgeMigrationRouter =
  express.Router(); /** * POST /api/echo/knowledge/migrate/start * Start full migration from Pinecone to internal pgvector storage */
echoKnowledgeMigrationRouter.post(
  "/knowledge/migrate/start",
  startFullMigration,
); /** * POST /api/echo/knowledge/migrate/selective * Start selective migration for a specific knowledge source type * Body: { sourceType:"pdf" |"recipe" |"external-llm" |"master-dictionary" |"user-imported" } */
echoKnowledgeMigrationRouter.post(
  "/knowledge/migrate/selective",
  startSelectiveMigration,
); /** * GET /api/echo/knowledge/migrate/progress * Get current migration progress and status */
echoKnowledgeMigrationRouter.get(
  "/knowledge/migrate/progress",
  getMigrationProgress,
); /** * GET /api/echo/knowledge/migrate/status * Get comprehensive migration status with statistics */
echoKnowledgeMigrationRouter.get(
  "/knowledge/migrate/status",
  getMigrationStatus,
); /** * GET /api/echo/knowledge/health * Check health of internal knowledge system and Pinecone connection */
echoKnowledgeMigrationRouter.get(
  "/knowledge/health",
  checkKnowledgeHealth,
); /** * GET /api/echo/knowledge/pinecone/stats * Get Pinecone index statistics */
echoKnowledgeMigrationRouter.get(
  "/knowledge/pinecone/stats",
  getPineconeStats,
); /** * GET /api/echo/knowledge/internal/stats * Get internal knowledge storage statistics */
echoKnowledgeMigrationRouter.get("/knowledge/internal/stats", getInternalStats);
