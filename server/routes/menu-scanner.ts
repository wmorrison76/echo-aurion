/**
 * Menu Scanner Routes
 * 
 * API routes for AI-powered menu scanning using OpenAI Vision API
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { beoAIMenuScannerService } from '../services/beo-ai-menu-scanner';
import { jwtAuthMiddleware } from '../middleware/auth-jwt';
import { supabase } from '../lib/supabase';
import crypto from 'crypto';

const router = Router();

// File upload handler (multer would be used in production)
// For now, files are expected to be base64 encoded in request body
const handleFileUpload = async (req: Request): Promise<{ buffer: Buffer; originalname: string; mimetype: string; size: number } | null> => {
  if (req.file) {
    return {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    };
  }

  // Fallback: check for base64 file in body
  if (req.body.file_data && req.body.file_name) {
    const buffer = Buffer.from(req.body.file_data, 'base64');
    return {
      buffer,
      originalname: req.body.file_name,
      mimetype: req.body.file_type || 'image/jpeg',
      size: buffer.length,
    };
  }

  return null;
};

/**
 * POST /api/menu-scanner/upload
 * Upload menu document for scanning
 */
router.post('/upload', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenant_id || (req as any).user?.org_id;
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id || (req as any).user?.sub;

    if (!tenantId || !orgId || !userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const file = await handleFileUpload(req);
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided. Send file_data (base64) and file_name in request body, or use multipart/form-data.',
      });
    }
    const fileType = file.mimetype === 'application/pdf' ? 'pdf' : file.mimetype.startsWith('image/') ? 'image' : 'url';
    const documentId = `doc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Save document metadata to database
    // In production, file would be uploaded to S3/storage and URL stored
    const { data, error } = await supabase
      .from('menu_documents')
      .insert({
        id: documentId,
        tenant_id: tenantId,
        org_id: orgId,
        file_name: file.originalname,
        file_type: fileType,
        file_size: file.size,
        uploaded_by: userId,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      logger.error('[MenuScanner] Failed to save document metadata', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to save document',
      });
    }

    // In production, file would be uploaded to S3/storage and URL stored
    // For now, store file data reference
    const menuDocument = {
      id: documentId,
      tenant_id: tenantId,
      org_id: orgId,
      file_name: file.originalname,
      file_type: fileType,
      file_data: file.buffer,
      file_size: file.size,
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
      status: 'pending' as const,
    };

    logger.info('[MenuScanner] Menu document uploaded', {
      document_id: documentId,
      file_name: file.originalname,
      file_size: file.size,
    });

    res.status(201).json({
      success: true,
      data: {
        document_id: documentId,
        file_name: file.originalname,
        file_type: fileType,
        file_size: file.size,
        status: 'pending',
      },
    });
  } catch (error) {
    logger.error('[MenuScanner] Route error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload menu document',
    });
  }
});

/**
 * POST /api/menu-scanner/scan
 * Scan menu document using AI
 */
router.post('/scan', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenant_id || (req as any).user?.org_id;
    const orgId = (req as any).user?.org_id;

    if (!tenantId || !orgId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { document_id } = req.body;

    if (!document_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: document_id',
      });
    }

    // Get document from database
    const { data: documentData, error: docError } = await supabase
      .from('menu_documents')
      .select('*')
      .eq('id', document_id)
      .eq('tenant_id', tenantId)
      .single();

    if (docError || !documentData) {
      return res.status(404).json({
        success: false,
        error: 'Menu document not found',
      });
    }

    // In production, retrieve file from storage
    // For now, document must have file_data or file_url
    const menuDocument = {
      id: documentData.id,
      tenant_id: documentData.tenant_id,
      org_id: documentData.org_id,
      file_name: documentData.file_name,
      file_type: documentData.file_type,
      file_url: documentData.file_url,
      file_data: undefined, // Would be loaded from storage
      file_size: documentData.file_size,
      uploaded_by: documentData.uploaded_by,
      uploaded_at: documentData.uploaded_at,
      status: documentData.status,
    };

    // Scan menu using AI
    const scanResult = await beoAIMenuScannerService.scanMenu(menuDocument as any);

    res.status(200).json({
      success: true,
      data: scanResult,
    });
  } catch (error) {
    logger.error('[MenuScanner] Scan error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan menu',
    });
  }
});

/**
 * GET /api/menu-scanner/documents
 * Get list of menu documents
 */
router.get('/documents', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenant_id || (req as any).user?.org_id;
    const orgId = (req as any).user?.org_id;

    if (!tenantId || !orgId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('menu_documents')
      .select('id, file_name, file_type, file_size, status, uploaded_at, parsed_menu_id')
      .eq('tenant_id', tenantId)
      .eq('org_id', orgId)
      .order('uploaded_at', { ascending: false })
      .limit(parseInt(limit as string))
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      logger.error('[MenuScanner] Failed to get documents', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to get documents',
      });
    }

    res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    logger.error('[MenuScanner] Route error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get documents',
    });
  }
});

/**
 * GET /api/menu-scanner/documents/:document_id
 * Get menu document details
 */
router.get('/documents/:document_id', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenant_id || (req as any).user?.org_id;
    const { document_id } = req.params;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { data, error } = await supabase
      .from('menu_documents')
      .select('*')
      .eq('id', document_id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Menu document not found',
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('[MenuScanner] Route error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get document',
    });
  }
});

export default router;
