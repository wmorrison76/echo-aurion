/**
 * Client Import API Routes
 * 
 * Endpoints for client data import (CSV/Excel)
 * All text is i18n-ready with translation keys
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { clientImportService } from '../services/client-import-service.js';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * GET /api/client-import/fields
 * Get system fields for mapping
 */
router.get('/fields', requireAuth, async (req: Request, res: Response) => {
  try {
    const fields = clientImportService.getSystemFields();

    res.json({ success: true, data: fields });
  } catch (error: any) {
    console.error('[ClientImport] Error fetching fields:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/client-import/parse
 * Parse uploaded file
 */
router.post('/parse', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'File required' });
    }

    const orgId = (req as any).user?.org_id || req.body?.orgId;
    const userId = (req as any).user?.id || (req as any).user?.sub;
    if (!orgId || !userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const fileType = file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')
      ? 'excel'
      : 'csv';

    let headers: string[];
    let rows: Record<string, any>[];

    if (fileType === 'excel') {
      const parsed = await clientImportService.parseExcel(file.buffer); // Full parse; preview returned separately
      headers = parsed.headers;
      rows = parsed.rows;
    } else {
      const parsed = await clientImportService.parseCSV(file.buffer.toString('utf-8'));
      headers = parsed.headers;
      rows = parsed.rows;
    }

    // Auto-detect mappings
    const fieldMapping = clientImportService.autoDetectMappings(headers);

    // Create a server-side session with the raw rows
    const session = await clientImportService.createParseSession({
      orgId,
      userId,
      fileName: file.originalname,
      fileType,
      headers,
      rows,
      fieldMapping,
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        headers,
        rows: rows.slice(0, 100), // Preview only; full set stored in session
        fieldMapping,
        fileName: file.originalname,
        fileType,
        rowCount: rows.length,
      },
    });
  } catch (error: any) {
    console.error('[ClientImport] Error parsing file:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/client-import/validate
 * Validate import data
 */
router.post('/validate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, fieldMapping } = req.body;
    const orgId = (req as any).user?.org_id || req.body.orgId;

    if (!orgId || !sessionId || !fieldMapping) {
      return res.status(400).json({ success: false, error: 'orgId, sessionId, and fieldMapping required' });
    }

    const session = await clientImportService.getSessionById(orgId, sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const sourceRows = Array.isArray(session.sourceRows) ? session.sourceRows : [];
    const validationResults = await clientImportService.validateRows(sourceRows, fieldMapping, orgId);

    await clientImportService.updateSessionValidation({
      orgId,
      sessionId,
      fieldMapping,
      validationResults,
    });

    res.json({
      success: true,
      data: {
        sessionId,
        totals: {
          total: validationResults.length,
          valid: validationResults.filter((r) => r.status === 'valid').length,
          error: validationResults.filter((r) => r.status === 'error').length,
          duplicate: validationResults.filter((r) => r.status === 'duplicate').length,
        },
        validationResults,
      },
    });
  } catch (error: any) {
    console.error('[ClientImport] Error validating data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/client-import/import
 * Import validated clients
 */
router.post('/import', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId, options } = req.body;
    const userId = (req as any).user?.id;
    const orgId = (req as any).user?.org_id || req.body.orgId;

    if (!orgId || !userId || !sessionId) {
      return res.status(400).json({ success: false, error: 'orgId, userId, and sessionId required' });
    }

    const session = await clientImportService.getSessionById(orgId, sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const validationResults = Array.isArray(session.validationResults) ? session.validationResults : [];
    if (validationResults.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Session has no validation results. Call /validate first.',
      });
    }

    const result = await clientImportService.importClients(validationResults, orgId, userId, options);

    // Update result with file info
    result.fileName = session.fileName || 'import.csv';
    result.fileType = session.fileType || 'csv';

    await clientImportService.updateSessionResult({
      orgId,
      sessionId,
      result,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[ClientImport] Error importing clients:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/client-import/sessions
 * Get import session history
 */
router.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id || (req.query.orgId as string);
    const limit = parseInt(req.query.limit as string) || 50;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const sessions = await clientImportService.getImportSessions(orgId, limit);

    res.json({ success: true, data: sessions });
  } catch (error: any) {
    console.error('[ClientImport] Error fetching sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/client-import/sessions/:id
 * Get specific import session
 */
router.get('/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = (req as any).user?.org_id || (req.query.orgId as string);

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }
    const session = await clientImportService.getSessionById(orgId, id);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('[ClientImport] Error fetching session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/client-import/auto-map
 * Auto-detect field mappings
 */
router.post('/auto-map', requireAuth, async (req: Request, res: Response) => {
  try {
    const { headers } = req.body;

    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({ success: false, error: 'headers array required' });
    }

    const fieldMapping = clientImportService.autoDetectMappings(headers);

    res.json({ success: true, data: fieldMapping });
  } catch (error: any) {
    console.error('[ClientImport] Error auto-mapping:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
