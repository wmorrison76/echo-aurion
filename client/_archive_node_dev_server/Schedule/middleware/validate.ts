/** * Input validation middleware using Zod schemas * Validates request body and query parameters */ import {
  Request,
  Response,
  NextFunction,
} from "express";
import { ZodSchema } from "zod";
export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: result.error.flatten(),
      });
    }
    (req as any).validated = result.data;
    next();
  };
}
export function validateQuery(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: result.error.flatten(),
      });
    }
    req.query = result.data;
    next();
  };
}
