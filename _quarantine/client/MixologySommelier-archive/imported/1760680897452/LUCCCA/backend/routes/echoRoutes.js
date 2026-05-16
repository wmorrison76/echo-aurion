import express from 'express';
import { getEchoStatus } from '../controllers/echoController.js';

const router = express.Router();

router.get('/status', getEchoStatus);

export default router;
