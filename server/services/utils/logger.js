// Compatibility re-export for services that import "../utils/logger.js".
// The canonical logger lives in `server/lib/logger.ts`.

import { logger as baseLogger } from "../../lib/logger";

export const logger = baseLogger;

