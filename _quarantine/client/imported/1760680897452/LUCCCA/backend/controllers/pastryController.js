import fs from 'fs';
import path from 'path';

const recipePath = path.resolve('./backend/data/pastry_recipes.json');
const variationPath = path.resolve('./backend/data/pastry_variations.json');

export function getAllPastryRecipes(req, res) {
  const data = fs.readFileSync(recipePath, 'utf-8');
  res.json(JSON.parse(data));
}

export function savePastryRecipe(req, res) {
  const newRecipe = req.body;
  const data = JSON.parse(fs.readFileSync(recipePath, 'utf-8'));
  data.push(newRecipe);
  fs.writeFileSync(recipePath, JSON.stringify(data, null, 2));
  res.json({ message: 'Pastry recipe saved.' });
}

export function getAllVariations(req, res) {
  const data = fs.readFileSync(variationPath, 'utf-8');
  res.json(JSON.parse(data));
}
