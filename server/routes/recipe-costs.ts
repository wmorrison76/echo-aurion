import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { RecipeCost } from '../../shared/types/recipe';

const repo = new Repository<RecipeCost>();
export default createCRUD(repo);
