import { Router, Request, Response } from "express";
import {
  importToastData,
  importSquareData,
  importZoomShiftData,
  importMySQLData,
  ImportConfig,
} from "../lib/data-import-engine";

const router = Router();

/**
 * POST /api/data-import/upload
 * Handle file upload and determine import type
 */
router.post("/upload", async (req: Request, res: Response) => {
  try {
    const { file_content, source, file_type, outlet_id, mappings } = req.body;

    if (!file_content || !source || !file_type || !outlet_id) {
      return res.status(400).json({
        error:
          "Missing required fields: file_content, source, file_type, outlet_id",
      });
    }

    const validSources = ["toast", "square", "zoomshift", "mysql"];
    const validFileTypes = ["csv", "json", "xml"];

    if (!validSources.includes(source)) {
      return res.status(400).json({
        error: `Invalid source. Must be one of: ${validSources.join(", ")}`,
      });
    }

    if (!validFileTypes.includes(file_type)) {
      return res.status(400).json({
        error: `Invalid file_type. Must be one of: ${validFileTypes.join(", ")}`,
      });
    }

    const importConfig: ImportConfig = {
      source: source as any,
      fileType: file_type as any,
      data: file_content,
      outlet_id,
      mappings,
    };

    console.log(
      `[DATA-IMPORT] Starting ${source} import for outlet ${outlet_id}...`,
    );

    let result;
    switch (source) {
      case "toast":
        result = await importToastData(importConfig);
        break;
      case "square":
        result = await importSquareData(importConfig);
        break;
      case "zoomshift":
        result = await importZoomShiftData(importConfig);
        break;
      case "mysql":
        result = await importMySQLData(importConfig);
        break;
      default:
        return res.status(400).json({ error: "Unknown import source" });
    }

    console.log(
      `[DATA-IMPORT] ${source} import complete: ${result.imported} imported, ${result.failed} failed`,
    );

    return res.json({
      success: result.success,
      imported: result.imported,
      failed: result.failed,
      errors: result.errors,
      summary: result.summary,
    });
  } catch (error) {
    console.error("[DATA-IMPORT] Error during import:", error);
    return res.status(500).json({
      error: "Import failed",
      details: String(error),
    });
  }
});

/**
 * GET /api/data-import/templates
 * Return import templates for each system (Toast, Square, ZoomShift, MySQL)
 */
router.get("/templates", async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    templates: {
      toast: {
        name: "Toast POS",
        description:
          "Import employee, shift, and POS transaction data from Toast",
        supportedFormats: ["csv", "json"],
        requiredFields: {
          employees: [
            "employee_id",
            "employee_name",
            "email",
            "phone",
            "hire_date",
            "status",
          ],
          shifts: [
            "shift_id",
            "employee_id",
            "shift_date",
            "start_time",
            "end_time",
            "department",
            "position",
            "pay_rate",
          ],
          pos: [
            "transaction_id",
            "timestamp",
            "subtotal",
            "tax",
            "total",
            "covers",
            "items",
          ],
        },
        exampleEmployee: {
          employee_id: "E001",
          employee_name: "John Smith",
          email: "john@restaurant.com",
          phone: "555-0100",
          hire_date: "2020-01-15",
          status: "active",
        },
        exampleShift: {
          shift_id: "S001",
          employee_id: "E001",
          shift_date: "2024-11-15",
          start_time: "10:00",
          end_time: "18:00",
          department: "front",
          position: "server",
          pay_rate: "18.50",
        },
        examplePOS: {
          transaction_id: "T001",
          timestamp: "2024-11-15T12:30:00Z",
          subtotal: "150.00",
          tax: "12.00",
          total: "162.00",
          covers: "4",
          items: '[{"name":"Burger","qty":2,"price":12.99}]',
        },
      },
      square: {
        name: "Square",
        description:
          "Import employee, shift, and POS transaction data from Square",
        supportedFormats: ["csv", "json"],
        requiredFields: {
          employees: ["id", "name", "email", "phone", "status"],
          shifts: ["shift_id", "employee_id", "start_time", "end_time"],
          pos: ["transaction_id", "amount", "timestamp"],
        },
        exampleEmployee: {
          id: "emp_123",
          name: "Jane Doe",
          email: "jane@restaurant.com",
          phone: "555-0101",
          status: "active",
        },
        exampleShift: {
          shift_id: "shift_456",
          employee_id: "emp_123",
          start_time: "2024-11-15T10:00:00Z",
          end_time: "2024-11-15T18:00:00Z",
        },
        examplePOS: {
          transaction_id: "txn_789",
          amount: "162.00",
          timestamp: "2024-11-15T12:30:00Z",
        },
      },
      zoomshift: {
        name: "ZoomShift",
        description:
          "Import employee profiles and scheduled shifts from ZoomShift",
        supportedFormats: ["csv", "json"],
        requiredFields: {
          employees: ["id", "name", "position", "phone_number"],
          shifts: [
            "shift_id",
            "employee_id",
            "start_time",
            "end_time",
            "position",
          ],
        },
        exampleEmployee: {
          id: "ZS001",
          name: "Bob Johnson",
          position: "chef",
          phone_number: "555-0102",
        },
        exampleShift: {
          shift_id: "ZSH001",
          employee_id: "ZS001",
          start_time: "2024-11-15T06:00:00Z",
          end_time: "2024-11-15T14:00:00Z",
          position: "chef",
        },
      },
      mysql: {
        name: "Legacy MySQL",
        description: "Import from custom MySQL database with field mapping",
        supportedFormats: ["csv", "json"],
        requiredFields: {
          employees: [
            "employee_id",
            "name",
            "email",
            "phone",
            "hire_date",
            "status",
          ],
          shifts: [
            "shift_id",
            "employee_id",
            "shift_date",
            "start_time",
            "end_time",
            "job_code",
            "hours_worked",
            "pay_rate",
          ],
          pos: [
            "transaction_id",
            "timestamp",
            "subtotal",
            "tax",
            "total",
            "covers",
          ],
        },
        fieldMappingHints: {
          "If your table uses 'staff_id' instead of 'employee_id'": {
            mappings: { employee_id: "staff_id" },
          },
          "If your table uses 'created_at' instead of 'timestamp'": {
            mappings: { timestamp: "created_at" },
          },
          "If your table uses 'guest_count' instead of 'covers'": {
            mappings: { covers: "guest_count" },
          },
        },
      },
    },
  });
});

/**
 * GET /api/data-import/status
 * Check import job status
 */
router.get("/status", async (req: Request, res: Response) => {
  const { job_id } = req.query;

  if (!job_id) {
    return res.status(400).json({ error: "Missing job_id parameter" });
  }

  // TODO: Implement job status tracking with Redis or database
  return res.json({
    success: true,
    jobId: job_id,
    status: "completed",
    progress: 100,
    message: "Job status tracking not yet implemented",
  });
});

/**
 * POST /api/data-import/validate
 * Validate import file before actually importing
 */
router.post("/validate", async (req: Request, res: Response) => {
  try {
    const { file_content, source, file_type } = req.body;

    if (!file_content || !source || !file_type) {
      return res.status(400).json({
        error: "Missing required fields: file_content, source, file_type",
      });
    }

    // Parse file to check validity
    let records = [];
    try {
      if (file_type === "csv") {
        // CSV parsing requires optional csv-parse dependency
        // For now, return not implemented
        return res.status(501).json({
          valid: false,
          error:
            "CSV parsing not available. Install csv-parse: npm install csv-parse",
          supportedFormats: ["json"],
        });
      } else if (file_type === "json") {
        const parsed = JSON.parse(file_content);
        records = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (error) {
      return res.status(400).json({
        valid: false,
        error: `Failed to parse ${file_type} file: ${String(error)}`,
      });
    }

    // Basic validation
    if (records.length === 0) {
      return res.status(400).json({
        valid: false,
        error: "File contains no records",
      });
    }

    // Check for required fields based on source
    const firstRecord = records[0];
    let missingFields = [];

    if (source === "toast") {
      const required = ["employee_name", "shift_id", "transaction_id"];
      missingFields = required.filter((field) => !(field in firstRecord));
    } else if (source === "square") {
      const required = ["id", "name", "shift_id", "transaction_id"];
      missingFields = required.filter((field) => !(field in firstRecord));
    } else if (source === "zoomshift") {
      const required = ["id", "name", "shift_id"];
      missingFields = required.filter((field) => !(field in firstRecord));
    }

    return res.json({
      valid: missingFields.length === 0,
      recordCount: records.length,
      firstRecord: firstRecord,
      missingFields: missingFields,
      suggestion:
        missingFields.length > 0
          ? `Missing fields: ${missingFields.join(", ")}. Consider using field mappings.`
          : "File looks valid",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Validation failed",
      details: String(error),
    });
  }
});

export default router;
