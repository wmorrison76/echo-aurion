import express from 'express';
import { getPastryKnowledgeBase } from '../controllers/pastryKnowledgeController.js';

const router = express.Router();

router.get('/knowledge', getPastryKnowledgeBase);

export default router;
