import { Router, Request, Response } from "express";
import type { RequestHandler } from "express";

const router = Router();

const handleEcho: RequestHandler = (req: Request, res: Response) => {
  res.json({
    method: req.method,
    path: req.path,
    bodySize: JSON.stringify(req.body).length,
    contentType: req.headers["content-type"],
    timestamp: Date.now(),
  });
};

router.post("/echo", handleEcho);
router.get("/echo", handleEcho);

export default router;
