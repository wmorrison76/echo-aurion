import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { RecipeStep } from '../../shared/types/recipe';

const repo = new Repository<RecipeStep>();
export default createCRUD(repo);
