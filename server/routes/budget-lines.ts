import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { BudgetLine } from '../../shared/types/financial';

const repo = new Repository<BudgetLine>();
export default createCRUD(repo);
