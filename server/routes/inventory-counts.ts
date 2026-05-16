import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { InventoryCount } from '../../shared/types/inventory';

const repo = new Repository<InventoryCount>();
export default createCRUD(repo);
