import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { PurchaseRequisition } from '../../shared/types/purchasing';

const repo = new Repository<PurchaseRequisition>();
export default createCRUD(repo);
