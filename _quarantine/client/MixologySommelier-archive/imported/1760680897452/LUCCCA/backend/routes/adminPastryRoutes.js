import express from 'express';
import { exportPastryTestLog } from '../controllers/adminPastryController.js';

const router = express.Router();

router.get('/pastry-test-log-export', exportPastryTestLog);

export default router;
