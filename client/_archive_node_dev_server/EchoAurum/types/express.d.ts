import type { SessionRecord } from "../services/session";
declare global {
  namespace Express {
    interface Request {
      lucccaSession?: SessionRecord;
    }
  }
}
export {};
