import type { RequestHandler } from "express";
import { consoleOverview } from "../../shared/consoleData";
import type { ConsoleOverview } from "../../shared/console";
export const handleConsoleOverview: RequestHandler = (_req, res) => {
  const overview: ConsoleOverview = consoleOverview;
  res.status(200).json({ overview });
};
