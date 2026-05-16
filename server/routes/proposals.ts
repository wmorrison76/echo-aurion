import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Proposal } from '../../shared/types/crm';

const repo = new Repository<Proposal>();
export default createCRUD(repo);
