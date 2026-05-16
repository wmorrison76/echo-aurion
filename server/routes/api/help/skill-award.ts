import { Router, Request, Response } from "express";
import { applySkillEvent } from "../../../../shared/echo/help/skill-engine";
import { SKILLS } from "../../../../shared/echo/help/skill-config";

const router = Router();

interface SkillAwardRequest {
  userId: string;
  skillId: string;
  xpDelta: number;
  source: "mission" | "article" | "badge" | "manual" | "admin";
  sourceId?: string;
  notes?: string;
}

router.post("/skill/award", async (req: Request, res: Response) => {
  try {
    const { userId, skillId, xpDelta, source, sourceId, notes } = req.body as SkillAwardRequest;

    if (!userId || !skillId || !xpDelta) {
      return res.status(400).json({
        error: "Missing required fields: userId, skillId, xpDelta",
      });
    }

    const skillDef = SKILLS.find((s) => s.id === skillId);
    if (!skillDef) {
      return res.status(404).json({ error: `Skill '${skillId}' not found` });
    }

    // Apply skill event (local calculation, no DB required)
    const event = {
      userId,
      skillId,
      xpDelta,
      source,
      sourceId,
    };

    const newState = applySkillEvent(null, event, skillDef);

    // TODO: Save to database
    // await db.insert('user_skills').values({
    //   user_id: userId,
    //   skill_id: skillId,
    //   xp: newState.xp,
    //   level: newState.level,
    //   updated_at: new Date(),
    // });
    // await db.insert('skill_events').values({
    //   user_id: userId,
    //   skill_id: skillId,
    //   xp_delta: xpDelta,
    //   source,
    //   source_id: sourceId,
    //   notes,
    //   created_at: new Date(),
    // });

    return res.status(200).json({
      success: true,
      userSkill: newState,
      message: `Awarded ${xpDelta} XP for skill ${skillId}`,
    });
  } catch (err) {
    console.error("[EchoHelp] /skill/award error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/skill/progress", async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    // TODO: Fetch user's skill progress from database
    // const userSkills = await db.query(
    //   `SELECT * FROM user_skills WHERE user_id = ?`,
    //   [userId]
    // );

    return res.status(200).json({
      userId,
      skills: [],
      totalXp: 0,
      level: 0,
      message: "TODO: Wire up database query",
    });
  } catch (err) {
    console.error("[EchoHelp] /skill/progress error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/telemetry/log", async (req: Request, res: Response) => {
  try {
    const { userId, eventType, module, route, role, payload } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: "Missing eventType" });
    }

    // TODO: Save telemetry event to database
    // await db.insert('help_telemetry').values({
    //   user_id: userId,
    //   event_type: eventType,
    //   module,
    //   route,
    //   role,
    //   payload: JSON.stringify(payload),
    //   created_at: new Date(),
    // });

    return res.status(200).json({
      success: true,
      message: "Telemetry event logged",
    });
  } catch (err) {
    console.error("[EchoHelp] /telemetry/log error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
