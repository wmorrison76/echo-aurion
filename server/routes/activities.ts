import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Activity } from '../../shared/types/crm';

const repo = new Repository<Activity>();
export default createCRUD(repo);
