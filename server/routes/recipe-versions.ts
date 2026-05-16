import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { RecipeVersion } from '../../shared/types/recipe';

const repo = new Repository<RecipeVersion>();
export default createCRUD(repo);
