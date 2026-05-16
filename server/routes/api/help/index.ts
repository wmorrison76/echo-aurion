import { Router } from "express";
import searchRouter from "./search";
import askRouter from "./ask-echo";
import missionRouter from "./mission";
import contextRouter from "./context";
import feedbackRouter from "./feedback";
import skillRouter from "./skill-award";
import syncRouter from "./sync";

const router = Router();

// Search help articles
router.use(searchRouter);

// Ask Echo for help
router.use(askRouter);

// Get help missions
router.use(missionRouter);

// Get context help bindings
router.use(contextRouter);

// Submit feedback
router.use(feedbackRouter);

// Skill XP awards and telemetry
router.use(skillRouter);

// Sync missions from Builder.io
router.use(syncRouter);

export default router;
