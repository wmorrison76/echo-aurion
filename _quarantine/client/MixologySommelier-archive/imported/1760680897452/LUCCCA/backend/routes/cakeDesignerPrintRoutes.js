import express from 'express';
import { exportEdiblePrintFile } from '../controllers/cakeDesignerPrintController.js';

const router = express.Router();

router.post('/print-export', exportEdiblePrintFile);

export default router;
