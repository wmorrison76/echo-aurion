import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { RecipeNutrition } from '../../shared/types/recipe';

const repo = new Repository<RecipeNutrition>();
export default createCRUD(repo);
