import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { PayrollEntry } from '../../shared/types/labor';

const repo = new Repository<PayrollEntry>();
export default createCRUD(repo);
