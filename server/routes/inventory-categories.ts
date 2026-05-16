import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { InventoryCategory } from '../../shared/types/inventory';

const repo = new Repository<InventoryCategory>();
export default createCRUD(repo);
