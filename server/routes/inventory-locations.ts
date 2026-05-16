import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { InventoryLocation } from '../../shared/types/inventory';

const repo = new Repository<InventoryLocation>();
export default createCRUD(repo);
