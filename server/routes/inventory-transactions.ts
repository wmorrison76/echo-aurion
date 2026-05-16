import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { InventoryTransaction } from '../../shared/types/inventory';

const repo = new Repository<InventoryTransaction>();
export default createCRUD(repo);
