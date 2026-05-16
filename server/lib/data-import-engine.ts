/**
 * UNIVERSAL DATA IMPORT ENGINE - STUB
 *
 * This module requires csv-parse and xml2js to be installed:
 * npm install csv-parse xml2js
 *
 * Currently stubbed to allow server to start without these optional dependencies.
 */

export interface ImportConfig {
  source: "toast" | "square" | "zoomshift" | "mysql";
  fileType: "csv" | "json" | "xml";
  data: string;
  outlet_id: string;
  mappings?: Record<string, string>;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
  summary: Record<string, any>;
}

/**
 * TOAST POS IMPORTER - STUB
 */
export async function importToastData(
  config: ImportConfig,
): Promise<ImportResult> {
  return {
    success: false,
    imported: 0,
    failed: 0,
    errors: [
      {
        row: 0,
        error:
          "Toast importer not available. Install csv-parse: npm install csv-parse",
      },
    ],
    summary: { error: "Dependencies not installed" },
  };
}

/**
 * SQUARE IMPORTER - STUB
 */
export async function importSquareData(
  config: ImportConfig,
): Promise<ImportResult> {
  return {
    success: false,
    imported: 0,
    failed: 0,
    errors: [
      {
        row: 0,
        error:
          "Square importer not available. Install csv-parse: npm install csv-parse",
      },
    ],
    summary: { error: "Dependencies not installed" },
  };
}

/**
 * ZOOMSHIFT IMPORTER - STUB
 */
export async function importZoomShiftData(
  config: ImportConfig,
): Promise<ImportResult> {
  return {
    success: false,
    imported: 0,
    failed: 0,
    errors: [
      {
        row: 0,
        error:
          "ZoomShift importer not available. Install csv-parse: npm install csv-parse",
      },
    ],
    summary: { error: "Dependencies not installed" },
  };
}

/**
 * MYSQL IMPORTER - STUB
 */
export async function importMySQLData(
  config: ImportConfig,
): Promise<ImportResult> {
  return {
    success: false,
    imported: 0,
    failed: 0,
    errors: [
      {
        row: 0,
        error:
          "MySQL importer not available. Install xml2js: npm install xml2js",
      },
    ],
    summary: { error: "Dependencies not installed" },
  };
}

export default {
  importToastData,
  importSquareData,
  importZoomShiftData,
  importMySQLData,
};
