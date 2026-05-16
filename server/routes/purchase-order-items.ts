import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { PurchaseOrderItem } from '../../shared/types/purchasing';

const repo = new Repository<PurchaseOrderItem>();
export default createCRUD(repo);
