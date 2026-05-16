import express from 'express';
import { exportCakeDesign, generateCustomerForm } from '../controllers/cakeDesignerController.js';

const router = express.Router();

router.post('/export', exportCakeDesign);
router.post('/generate-form', generateCustomerForm);

export default router;
