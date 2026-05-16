import { createCRUD } from '../factories/crud-router';
import { createRepository } from '../database/postgres-repository';
import type { BEO } from '../../shared/types/beo';
import { beoCreateSchema, beoUpdateSchema } from '../../shared/validation/beo.schemas';

const beoRepo = createRepository<BEO>('BEO');

export default createCRUD(beoRepo, {
  softDelete: true,
  validate: {
    create: beoCreateSchema,
    update: beoUpdateSchema
  }
});
