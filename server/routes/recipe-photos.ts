import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { RecipePhoto } from '../../shared/types/recipe';

const repo = new Repository<RecipePhoto>();
export default createCRUD(repo);
