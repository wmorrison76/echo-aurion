import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Supplier } from '../../shared/types/purchasing';

const repo = new Repository<Supplier>();
export default createCRUD(repo, { softDelete: true });
