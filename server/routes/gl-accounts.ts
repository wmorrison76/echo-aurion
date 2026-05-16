import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { GLAccount } from '../../shared/types/financial';

const repo = new Repository<GLAccount>();
export default createCRUD(repo);
