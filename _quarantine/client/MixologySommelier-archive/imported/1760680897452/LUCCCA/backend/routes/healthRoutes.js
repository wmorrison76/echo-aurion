import express from 'express';
import { runHealthCheck } from '../utils/healthCheck.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(runHealthCheck());
});

export default router;
