import { createCRUD } from '../factories/crud-router';
import { Repository } from '../../shared/repository';
import type { Shift } from '../../shared/types/labor';

const repo = new Repository<Shift>();
export default createCRUD(repo);
