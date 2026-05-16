import { createCRUD } from '../factories/crud-router';
import { createRepository } from '../database/postgres-repository';
import type { InventoryItem } from '../../shared/types/inventory';
import { inventoryItemCreateSchema, inventoryItemUpdateSchema } from '../../shared/validation/inventory.schemas';

const inventoryRepo = createRepository<InventoryItem>('InventoryItem');

export default createCRUD(inventoryRepo, {
  validate: {
    create: inventoryItemCreateSchema,
    update: inventoryItemUpdateSchema
  }
});
