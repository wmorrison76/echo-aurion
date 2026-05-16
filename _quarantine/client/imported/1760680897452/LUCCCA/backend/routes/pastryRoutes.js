import express from 'express';
import {
  getAllPastryRecipes,
  savePastryRecipe,
  getAllVariations
} from '../controllers/pastryController.js';

const router = express.Router();

router.get('/recipes', getAllPastryRecipes);
router.post('/recipes', savePastryRecipe);
router.get('/variations', getAllVariations);

export default router;
