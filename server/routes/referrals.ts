import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Referral } from '../../shared/types/crm';

const repo = new Repository<Referral>();
export default createCRUD(repo);
