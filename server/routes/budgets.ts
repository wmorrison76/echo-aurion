import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Budget } from '../../shared/types/financial';

const repo = new Repository<Budget>();
export default createCRUD(repo);
