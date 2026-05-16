/**
 * LiquorAI — entrypoint.
 * Provides label parsing/normalization and price intelligence utilities.
 */
export * as Entities from "./liquor-entities.js";
export { parseLabel, normalizeParsed, createOCRAdapter } from "./label-ocr.js";
export { inferPrice, priceBand } from "./price-intel.js";
