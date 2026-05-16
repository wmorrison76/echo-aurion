import express from 'express';
import { getSystemHealth } from '../controllers/systemController.js';

const router = express.Router();

router.get('/status', getSystemHealth);

export default router;
