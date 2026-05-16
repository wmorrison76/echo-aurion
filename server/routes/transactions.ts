import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Transaction } from '../../shared/types/financial';

const repo = new Repository<Transaction>();
export default createCRUD(repo);
