import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { RecipeCategory } from '../../shared/types/recipe';

const repo = new Repository<RecipeCategory>();
export default createCRUD(repo);
