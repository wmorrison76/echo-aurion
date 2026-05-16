import type { RequestHandler } from "express";
import { z } from "zod";
import {
  listAutomationTasks,
  parseTasksFromText,
  processAutomationTasks,
  type AutomationTaskInput,
} from "../../automation/runner";
const taskInputSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
});
const runAutomationSchema = z.object({
  tasks: z.array(taskInputSchema).optional(),
  text: z.string().optional(),
  runTests: z.boolean().optional(),
  label: z.string().optional(),
});
export const handleAutomationList: RequestHandler = async (_req, res) => {
  try {
    const tasks = await listAutomationTasks();
    res.json({ ok: true, tasks });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error?.message || "Failed to load automation tasks",
    });
  }
};
export const handleAutomationRun: RequestHandler = async (req, res) => {
  try {
    const payload = runAutomationSchema.parse(req.body ?? {});
    let inputs: AutomationTaskInput[] = payload.tasks
      ? payload.tasks.map((task) => ({
          title: task.title.trim(),
          description: task.description?.trim() || undefined,
        }))
      : [];
    if (inputs.length === 0 && payload.text) {
      inputs = await parseTasksFromText(payload.text);
    }
    if (inputs.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "No tasks provided for automation" });
    }
    const result = await processAutomationTasks(inputs, {
      runTests: payload.runTests,
      label: payload.label,
    });
    res.json({ ok: true, result });
  } catch (error: any) {
    const status = error instanceof z.ZodError ? 400 : 500;
    res
      .status(status)
      .json({ ok: false, error: error?.message || "Automation run failed" });
  }
};
