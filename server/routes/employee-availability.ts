import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { EmployeeAvailability } from '../../shared/types/labor';

const repo = new Repository<EmployeeAvailability>();
export default createCRUD(repo);
