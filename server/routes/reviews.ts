import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Review } from '../../shared/types/crm';

const repo = new Repository<Review>();
export default createCRUD(repo);
