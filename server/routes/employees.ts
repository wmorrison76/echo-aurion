import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Employee } from '../../shared/types/labor';
import { employeeCreateSchema, employeeUpdateSchema } from '../../shared/validation/labor.schemas';

const repo = new Repository<Employee>();

export default createCRUD(repo, {
  softDelete: true,
  validate: {
    create: employeeCreateSchema,
    update: employeeUpdateSchema
  }
});
