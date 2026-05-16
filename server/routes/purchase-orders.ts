import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { PurchaseOrder } from '../../shared/types/purchasing';

const repo = new Repository<PurchaseOrder>();
export default createCRUD(repo);
