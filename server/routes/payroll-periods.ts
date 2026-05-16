import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { PayrollPeriod } from '../../shared/types/labor';

const repo = new Repository<PayrollPeriod>();
export default createCRUD(repo);
