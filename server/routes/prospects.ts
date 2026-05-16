import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Prospect } from '../../shared/types/crm';

const repo = new Repository<Prospect>();
export default createCRUD(repo, { softDelete: true });
