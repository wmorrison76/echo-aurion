import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Client } from '../../shared/types/crm';
import { clientCreateSchema, clientUpdateSchema } from '../../shared/validation/crm.schemas';

const repo = new Repository<Client>();

export default createCRUD(repo, {
  softDelete: true,
  validate: {
    create: clientCreateSchema,
    update: clientUpdateSchema
  }
});
