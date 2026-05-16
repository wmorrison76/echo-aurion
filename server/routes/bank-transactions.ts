import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { BankTransaction } from '../../shared/types/financial';

const repo = new Repository<BankTransaction>();
export default createCRUD(repo);
