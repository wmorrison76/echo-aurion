/**
 * Utility helpers for RedPhoenix CLI.
 */
import fs from "fs";
export function exists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
