import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { RecipeIngredient } from '../../shared/types/recipe';

const repo = new Repository<RecipeIngredient>();
export default createCRUD(repo);
