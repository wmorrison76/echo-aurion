import express, { Router, Request, Response } from 'express';
import {
  addKnowledgeCategory,
  getKnowledgeCategories,
  addKnowledgeItem,
  getKnowledgeItems,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  recordPDFUpload,
  updatePDFUploadStatus,
  getPDFUploads,
  searchKnowledge,
  getKnowledgeStats,
  getNeonPool,
} from '../services/neonKnowledgeService';

const router = Router();

// Categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await getKnowledgeCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/categories', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    const category = await addKnowledgeCategory(name, description);
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Knowledge Items
router.get('/items', async (req: Request, res: Response) => {
  try {
    const { category_id } = req.query;
    const items = await getKnowledgeItems(
      category_id as string | undefined,
      true
    );
    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/items', async (req: Request, res: Response) => {
  try {
    const { title, content, category_id, source_file, file_hash } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required',
      });
    }

    const item = await addKnowledgeItem(
      title,
      content,
      category_id,
      source_file,
      file_hash
    );
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/items/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await updateKnowledgeItem(id, req.body);
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/items/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteKnowledgeItem(id);
    res.json({ success: true, message: 'Item deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PDF Uploads
router.get('/pdfs', async (req: Request, res: Response) => {
  try {
    const pdfs = await getPDFUploads();
    res.json({ success: true, data: pdfs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/pdfs/record', async (req: Request, res: Response) => {
  try {
    const { filename, file_size, file_hash } = req.body;
    
    if (!filename || !file_hash) {
      return res.status(400).json({
        success: false,
        error: 'Filename and file_hash are required',
      });
    }

    const upload = await recordPDFUpload(filename, file_size || 0, file_hash);
    res.json({ success: true, data: upload });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/pdfs/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, extracted_items, error_message } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const upload = await updatePDFUploadStatus(
      id,
      status,
      extracted_items,
      error_message
    );
    res.json({ success: true, data: upload });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, category_id } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const results = await searchKnowledge(
      q as string,
      category_id as string | undefined
    );
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getKnowledgeStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const pool = await getNeonPool();
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      message: 'Knowledge database is healthy',
      timestamp: result.rows[0].now,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message,
    });
  }
});

export default router;
