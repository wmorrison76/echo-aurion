import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { BankAccount } from '../../shared/types/financial';

const repo = new Repository<BankAccount>();
export default createCRUD(repo);
